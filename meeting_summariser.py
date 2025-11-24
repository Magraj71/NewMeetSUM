# meeting_summariser.py
# Uses BART (via Hugging Face) for abstractive summaries with safe chunking.
# Falls back to the old extractive method if transformers/BART aren't available.

from typing import Dict, List
import re
from collections import Counter
import math

# --- lightweight deps kept from your original ---
from rake_nltk import Rake
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer

# Optional fallback extractive summarizer (only if transformers is missing or fails)
try:
    from summa.summarizer import summarize as textrank_summarize  # type: ignore
except Exception:
    textrank_summarize = None  # graceful fallback if not installed

# --- transformers (BART) ---
_TRANS_AVAILABLE = True
try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
    import torch
except Exception:
    _TRANS_AVAILABLE = False


# ---------------- Utilities ----------------
def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------- BART Summarizer ----------------
_SUMMARIZER = None
_TOKENIZER = None

def _load_bart(model_name: str = "facebook/bart-large-cnn"):
    """
    Lazy-loads a BART summarization pipeline.
    You can swap to a smaller model like 'sshleifer/distilbart-cnn-12-6' if needed.
    """
    global _SUMMARIZER, _TOKENIZER

    if _SUMMARIZER is not None:
        return _SUMMARIZER, _TOKENIZER

    if not _TRANS_AVAILABLE:
        raise RuntimeError("transformers/torch not available for BART summarization.")

    # Choose device: CUDA if available, else CPU
    device = 0 if torch.cuda.is_available() else -1

    _TOKENIZER = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    _SUMMARIZER = pipeline(
        "summarization",
        model=model,
        tokenizer=_TOKENIZER,
        device=device,
    )
    return _SUMMARIZER, _TOKENIZER


def _chunk_by_tokens(text: str, tokenizer, max_tokens: int = 950, overlap: int = 50) -> List[str]:
    """
    Splits text into overlapping token chunks safe for BART (max input ~1024 tokens).
    Uses tokenizer to avoid breaking mid-token. Returns decoded chunks.
    """
    # Encode once
    ids = tokenizer(
        text,
        return_tensors=None,
        truncation=False,
        add_special_tokens=False
    )["input_ids"]

    if len(ids) <= max_tokens:
        return [text]

    chunks = []
    start = 0
    step = max_tokens - overlap
    while start < len(ids):
        end = min(start + max_tokens, len(ids))
        seg_ids = ids[start:end]
        seg_text = tokenizer.decode(seg_ids, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        seg_text = clean_text(seg_text)
        if seg_text:
            chunks.append(seg_text)
        if end == len(ids):
            break
        start += step
    return chunks


def bart_summary(
    text: str,
    model_name: str = "facebook/bart-large-cnn",
    max_summary_words: int = 140,
    max_input_tokens: int = 950,
    chunk_overlap_tokens: int = 50,
    second_pass: bool = True,
) -> str:
    """
    Robust BART summarization:
    1) Token-aware chunking of long inputs
    2) Summarize each chunk
    3) Optionally second-pass summarize the concatenated chunk summaries
    """
    text = clean_text(text)
    if not text or len(text.split()) < 40:
        return text  # too short; return as-is

    summarizer, tokenizer = _load_bart(model_name)

    # 1) Chunk source text
    chunks = _chunk_by_tokens(text, tokenizer, max_tokens=max_input_tokens, overlap=chunk_overlap_tokens)

    # 2) Summarize each chunk
    chunk_summaries: List[str] = []
    # Convert desired max words to approx tokens (heuristic ~1.3 words/token)
    # We'll set max_length in tokens for BART
    approx_tokens = max(56, min(220, int(max_summary_words / 0.75)))  # keep in sane bounds
    min_tokens = max(32, int(approx_tokens * 0.5))

    for c in chunks:
        # Hugging Face summarization pipeline uses max_length/min_length in tokens (not words)
        out = summarizer(
            c,
            truncation=True,
            max_length=approx_tokens,
            min_length=min_tokens,
            do_sample=False,
        )
        chunk_summaries.append(clean_text(out[0]["summary_text"]))

    combined = " ".join(chunk_summaries)
    combined = clean_text(combined)

    if not second_pass or len(chunks) == 1:
        return combined

    # 3) Second pass to tighten the final summary
    # Re-chunk if still too long
    chunks2 = _chunk_by_tokens(combined, tokenizer, max_tokens=max_input_tokens, overlap=chunk_overlap_tokens)
    final_bits: List[str] = []
    for c in chunks2:
        out = summarizer(
            c,
            truncation=True,
            max_length=approx_tokens,
            min_length=min_tokens,
            do_sample=False,
        )
        final_bits.append(clean_text(out[0]["summary_text"]))
    final = clean_text(" ".join(final_bits))
    return final


# ---------------- Your original helpers ----------------
def extract_key_points(text: str, n: int = 7) -> List[str]:
    """RAKE-based key phrases -> bullet points."""
    r = Rake()  # uses NLTK stopwords; will auto-download at first run
    r.extract_keywords_from_text(text)
    phrases = r.get_ranked_phrases()[: max(3, n)]
    bullets = []
    for p in phrases:
        p = p.strip(" .,-;").capitalize()
        if p:
            bullets.append(p)
    return bullets[:n]


def extract_action_items(text: str) -> List[str]:
    """
    Lightweight heuristic extraction:
    - imperative verbs at sentence start
    - future commitments ('will', 'by <date>', 'before <date>')
    - owners ('@name' or 'Name will')
    """
    candidates = []
    sents = re.split(r"(?<=[.?!])\s+", text)
    imperative = re.compile(
        r"^(please\s+)?(let's\s+|kindly\s+)?(review|create|share|send|prepare|finalize|follow|check|update|implement|fix|test|deploy|schedule|draft|confirm|assign)\b",
        re.I,
    )
    future = re.compile(r"\b(will|shall|by\s+\w+ \d{1,2}|\bETA\b|\bbefore\s+\w+ \d{1,2})\b", re.I)

    for s in sents:
        s_clean = s.strip()
        if not s_clean:
            continue
        if imperative.search(s_clean) or future.search(s_clean):
            candidates.append(s_clean)
    uniq = list(dict.fromkeys(candidates))
    return uniq[:8]


def sentiment_and_tone(text: str) -> Dict[str, float]:
    analyzer = SentimentIntensityAnalyzer()
    scores = analyzer.polarity_scores(text)
    return scores


def topic_ngrams(text: str, top_k: int = 6) -> List[str]:
    """
    Simple, fast TF-IDF over sentences to surface top n-grams as 'topics'.
    """
    sents = [s.strip() for s in re.split(r"(?<=[.?!])\s+", text) if s.strip()]
    if not sents:
        return []
    vect = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=2000,
    )
    X = vect.fit_transform(sents)
    scores = X.sum(axis=0).A1
    terms = vect.get_feature_names_out()
    top_idx = scores.argsort()[::-1][: top_k * 2]
    raw = [terms[i] for i in top_idx]
    clean_terms = []
    seen = set()
    for t in raw:
        if re.search(r"^\d+$", t):
            continue
        key = t.lower()
        if key not in seen:
            seen.add(key)
            clean_terms.append(t)
        if len(clean_terms) == top_k:
            break
    return clean_terms


# ---------------- Public API ----------------
def short_summary(
    text: str,
    ratio: float = 0.15,
    max_sentences: int = 6,
    use_bart: bool = True,
    bart_model: str = "facebook/bart-large-cnn",
) -> str:
    """
    Defaults to BART abstractive summarization.
    If transformers/BART isn't available, falls back to your original extractive summary
    (summa TextRank) or first-N sentences.
    """
    text = clean_text(text)
    if not text or len(text.split()) < 40:
        return text

    if use_bart and _TRANS_AVAILABLE:
        try:
            return bart_summary(text, model_name=bart_model)
        except Exception:
            # If BART fails (OOM or missing weights), drop to extractive
            pass

    # Fallback: TextRank (summa) if present
    if textrank_summarize is not None:
        try:
            s = textrank_summarize(text, ratio=ratio, split=False)
            sents = re.split(r"(?<=[.?!])\s+", s)
            return " ".join(sents[:max_sentences])
        except Exception:
            pass

    # Final fallback: first N sentences
    sents = re.split(r"(?<=[.?!])\s+", text)
    return " ".join(sents[:max_sentences])


def analyse_meeting(
    text: str,
    key_points: int = 7,
    use_bart: bool = True,
    bart_model: str = "facebook/bart-large-cnn",
) -> Dict[str, object]:
    text = clean_text(text)
    return {
        "summary": short_summary(text, use_bart=use_bart, bart_model=bart_model),
        "key_points": extract_key_points(text, n=key_points),
        "action_items": extract_action_items(text),
        "sentiment": sentiment_and_tone(text),
        "topics": topic_ngrams(text),
        "word_count": len(text.split()),
    }


# ---------------- CLI quick test ----------------
if __name__ == "__main__":
    demo_text = """
    Team met to discuss Q4 launch timelines. Priya will finalize UI copy by Oct 22.
    Please create the deployment checklist. Let's prepare the UAT plan this week.
    Backend integration is blocked on API v2—Rohit will update the schema by Friday.
    We agreed to target a soft launch on Nov 10 pending security review.
    """
    report = analyse_meeting(demo_text, use_bart=True, bart_model="sshleifer/distilbart-cnn-12-6")
    from pprint import pprint
    pprint(report)
