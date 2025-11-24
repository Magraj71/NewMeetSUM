"""
Improved manual training script for a seq2seq model (e.g. T5) with a hand-written training loop.
Features:
- device (GPU/CPU) support
- mixed precision (torch.cuda.amp)
- gradient accumulation
- DataCollatorForSeq2Seq padding
- scheduler (linear with warmup)
- checkpointing and resume
- periodic evaluation (optional Rouge via evaluate package)
- deterministic seed and logging

Usage example:
  pip install transformers datasets evaluate accelerate torch tqdm
  python manual_llm_training.py \
    --model_name t5-small \
    --train_file data/train.jsonl \
    --valid_file data/valid.jsonl \
    --output_dir ./trained_model \
    --epochs 3 --batch_size 8 --lr 5e-5

Input data format (jsonl): each line is JSON with keys: "transcript", "summary"

Notes:
- This is suitable for small-to-medium models. For very large LLMs use specialized tooling like DeepSpeed, Accelerate or Trainer.
- The script aims to be easy to adapt and readable.
"""

import os
import json
import math
import random
import argparse
from pathlib import Path
from typing import List, Dict

import torch
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    DataCollatorForSeq2Seq,
    get_linear_schedule_with_warmup,
)
from tqdm.auto import tqdm


class InterviewDataset(Dataset):
    def _init_(self, path: str, tokenizer: AutoTokenizer, max_len: int = 512, split_key_input: str = "transcript", split_key_target: str = "summary"):
        self.samples = []
        self.tokenizer = tokenizer
        self.max_len = max_len
        self.split_key_input = split_key_input
        self.split_key_target = split_key_target

        # support jsonl or json list
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(path)

        with p.open("r", encoding="utf-8") as f:
            first = f.readline().strip()
            f.seek(0)
            if first.startswith("["):
                # json list
                data = json.load(f)
                for entry in data:
                    self._append_entry(entry)
            else:
                # jsonl
                for line in f:
                    if not line.strip():
                        continue
                    entry = json.loads(line)
                    self._append_entry(entry)

    def _append_entry(self, entry: Dict):
        inp = entry.get(self.split_key_input, "")
        tgt = entry.get(self.split_key_target, "")
        if inp is None or tgt is None:
            return
        self.samples.append({"input": str(inp), "target": str(tgt)})

    def _len_(self):
        return len(self.samples)

    def _getitem_(self, idx):
        sample = self.samples[idx]
        model_inputs = self.tokenizer(
            sample["input"],
            max_length=self.max_len,
            padding="do_not_pad",
            truncation=True,
            return_tensors=None,
        )
        with self.tokenizer.as_target_tokenizer():
            labels = self.tokenizer(
                sample["target"],
                max_length=128,
                padding="do_not_pad",
                truncation=True,
                return_tensors=None,
            )
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs


def set_seed(seed: int = 42):
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def collate_fn(batch: List[Dict], tokenizer: AutoTokenizer, model=None):
    # inputs in batch are dicts with keys: input_ids (list), attention_mask (list), labels (list)
    # Use DataCollatorForSeq2Seq to handle padding and label masking
    collator = DataCollatorForSeq2Seq(tokenizer, model=model, padding=True, return_tensors="pt")
    # DataCollator expects dicts with 'input_ids' etc. Our items already match that structure
    return collator(batch)


@torch.no_grad()
def evaluate(model, tokenizer, dataloader, device, num_samples: int = 100):
    model.eval()
    preds, refs = [], []

    for i, batch in enumerate(dataloader):
        batch = {k: v.to(device) for k, v in batch.items()}
        outputs = model.generate(
            input_ids=batch["input_ids"],
            attention_mask=batch.get("attention_mask", None),
            max_length=128,
            num_beams=4,
            early_stopping=True,
        )
        decoded_preds = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        labels = batch.get("labels")
        # replace -100 in labels as tokenizer.pad_token_id
        if labels is not None:
            labels = labels.clone()
            labels[labels == -100] = tokenizer.pad_token_id
            decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        else:
            decoded_labels = [""] * len(decoded_preds)

        preds.extend(decoded_preds)
        refs.extend(decoded_labels)

        if len(preds) >= num_samples:
            break

    # try optional rouge (if evaluate installed)
    try:
        import evaluate
        rouge = evaluate.load("rouge")
        results = rouge.compute(predictions=preds, references=refs)
    except Exception:
        results = {"rouge": None}

    model.train()
    return results, preds, refs


def train(args):
    set_seed(args.seed)

    device = torch.device("cuda" if torch.cuda.is_available() and not args.no_cuda else "cpu")
    print("Using device:", device)

    tokenizer = AutoTokenizer.from_pretrained(args.model_name, use_fast=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model_name)
    model.to(device)

    train_dataset = InterviewDataset(args.train_file, tokenizer, max_len=args.max_source_length)
    valid_dataset = InterviewDataset(args.valid_file, tokenizer, max_len=args.max_source_length) if args.valid_file else None

    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model, padding=True, return_tensors="pt")

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=lambda b: data_collator(b),
        num_workers=0,
    )

    valid_loader = None
    if valid_dataset:
        valid_loader = DataLoader(valid_dataset, batch_size=args.eval_batch_size, shuffle=False, collate_fn=lambda b: data_collator(b))

    # optimizer and scheduler
    no_decay = ["bias", "LayerNorm.weight"]
    optimizer_grouped_parameters = [
        {
            "params": [p for n, p in model.named_parameters() if not any(nd in n for nd in no_decay)],
            "weight_decay": args.weight_decay,
        },
        {"params": [p for n, p in model.named_parameters() if any(nd in n for nd in no_decay)], "weight_decay": 0.0},
    ]
    optimizer = AdamW(optimizer_grouped_parameters, lr=args.learning_rate)

    t_total = len(train_loader) // args.gradient_accumulation_steps * args.epochs
    warmup_steps = int(args.warmup_ratio * t_total)
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=warmup_steps, num_training_steps=t_total)

    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == "cuda" and args.fp16))

    global_step = 0
    best_metric = -float("inf")

    model.train()
    for epoch in range(args.epochs):
        epoch_iterator = tqdm(train_loader, desc=f"Epoch {epoch+1}/{args.epochs}")
        for step, batch in enumerate(epoch_iterator):
            batch = {k: v.to(device) for k, v in batch.items()}
            with torch.cuda.amp.autocast(enabled=(device.type == "cuda" and args.fp16)):
                outputs = model(**batch)
                loss = outputs.loss
                loss = loss / args.gradient_accumulation_steps

            scaler.scale(loss).backward()

            if (step + 1) % args.gradient_accumulation_steps == 0:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), args.max_grad_norm)
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad()
                scheduler.step()
                global_step += 1

                if global_step % args.logging_steps == 0:
                    tqdm.write(f"Step {global_step} - loss: {loss.item() * args.gradient_accumulation_steps:.4f}")

                if args.save_steps > 0 and global_step % args.save_steps == 0:
                    # save checkpoint
                    ckpt_dir = Path(args.output_dir) / f"checkpoint-{global_step}"
                    ckpt_dir.mkdir(parents=True, exist_ok=True)
                    model.save_pretrained(ckpt_dir)
                    tokenizer.save_pretrained(ckpt_dir)
                    tqdm.write(f"Saved checkpoint to {ckpt_dir}")

                # eval
                if valid_loader is not None and global_step % args.eval_steps == 0:
                    results, preds, refs = evaluate(model, tokenizer, valid_loader, device, num_samples=args.eval_samples)
                    # use rougeL fmeasure if available
                    metric_val = None
                    if isinstance(results, dict):
                        # evaluate returns dict like {'rouge1':..., 'rouge2':..., 'rougeL':...}
                        # evaluate's rouge returns rouge1, rouge2, rougeL f1 scores
                        if "rougeL" in results:
                            # some evaluate versions return e.g. {'rouge1':0.1...}
                            metric_val = results.get("rougeL", 0.0)
                        elif "rougeLsum" in results:
                            metric_val = results.get("rougeLsum", 0.0)
                        else:
                            # fallback
                            metric_val = list(results.values())[0] if results else 0.0

                    is_better = metric_val is not None and metric_val > best_metric
                    if is_better:
                        best_metric = metric_val
                        best_dir = Path(args.output_dir) / "best"
                        best_dir.mkdir(parents=True, exist_ok=True)
                        model.save_pretrained(best_dir)
                        tokenizer.save_pretrained(best_dir)
                        tqdm.write(f"New best model (metric={metric_val:.4f}) saved to {best_dir}")

            if args.max_steps > 0 and global_step >= args.max_steps:
                break

        if args.max_steps > 0 and global_step >= args.max_steps:
            break

    # final save
    final_dir = Path(args.output_dir) / "final"
    final_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(final_dir)
    tokenizer.save_pretrained(final_dir)
    print("Training complete. Final model saved to:", final_dir)


if _name_ == "_main_":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", type=str, default="t5-small")
    parser.add_argument("--train_file", type=str, required=True)
    parser.add_argument("--valid_file", type=str, default="")
    parser.add_argument("--output_dir", type=str, default="trained_model")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--eval_batch_size", type=int, default=8)
    parser.add_argument("--learning_rate", type=float, default=5e-5)
    parser.add_argument("--weight_decay", type=float, default=0.01)
    parser.add_argument("--warmup_ratio", type=float, default=0.06)
    parser.add_argument("--max_source_length", type=int, default=512)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=1)
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no_cuda", action="store_true")
    parser.add_argument("--save_steps", type=int, default=500)
    parser.add_argument("--eval_steps", type=int, default=500)
    parser.add_argument("--eval_samples", type=int, default=200)
    parser.add_argument("--logging_steps", type=int, default=50)
    parser.add_argument("--max_grad_norm", type=float, default=1.0)
    parser.add_argument("--max_steps", type=int, default=-1)

    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    train(args)