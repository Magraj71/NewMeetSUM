"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { chatSession } from "@/config/AIConfig";
import { auth, db, provider } from "@/config/firebaseConfig";
import { useGetUserInfo } from "@/hooks/useGetUserInfo";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import axios from "axios";

const SummarizePage = () => {
  const [open, setOpen] = useState(false);
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [sentiment, setSentiment] = useState<{ label: string; score: number } | null>(null);

  const { isAuth, userEmail } = useGetUserInfo();
  const router = useRouter();

  // ---- Google Login ----
  const signInWithGoogle = async () => {
    const results = await signInWithPopup(auth, provider);
    const authInfo = {
      userId: results.user.uid,
      userEmail: results.user.email,
      name: results.user.displayName,
      isAuth: true,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("auth", JSON.stringify(authInfo));
    }
    toast.success("Signed in successfully!");
  };

  // ---- Main Summary Function ----
  const generateSummary = async () => {
    if (!isAuth) {
      setOpen(true);
      return;
    }

    if (userText.trim().length < 10) {
      toast("Text is too short to summarize.");
      return;
    }

    setLoading(true);
    setSummary("");
    setSentiment(null);

    try {
      const prompt = `Summarize this text and highlight key points. Also mention strengths and weaknesses. Keep it short and simple:\n\n${userText}`;

      const result = await chatSession.sendMessage(prompt);
      const summarizedText = result.response.text();
      setSummary(summarizedText);

      // --- Sentiment Analysis ---
      const sentimentRes = await axios.post("/api/sentiment", { text: summarizedText });

      if (sentimentRes.data?.error) {
        console.error("Sentiment API Error:", sentimentRes.data.error);
        toast.error("Sentiment analysis failed: " + sentimentRes.data.error);
      } else {
        setSentiment(sentimentRes.data);

        // --- Save to Firestore ---
        await saveSummary(summarizedText, sentimentRes.data);
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      toast.error("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Save to Firestore ----
  const saveSummary = async (summary: string, sentimentData: any) => {
    const id = Date.now().toString();
    await setDoc(doc(db, "Summaries", id), {
      userText,
      summary,
      sentiment: sentimentData.label,
      sentimentScore: sentimentData.score,
      userEmail,
      id,
    });
    router.push(`/Home/summary/${id}`);
  };

  // ---- Sentiment UI Color ----
  const getSentimentColor = (label: string) => {
    switch (label.toLowerCase()) {
      case "positive":
        return "bg-green-100 text-green-700";
      case "negative":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <div className="bg-[#f5f5f5] flex flex-col px-4 md:px-12 h-[90vh]">
      <div className="w-full flex justify-start">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="mt-3 mb-4 px-4 py-2 cursor-pointer rounded-2xl bg-black text-white"
        >
          Back
        </button>
      </div>

      <div className="flex flex-col items-center justify-center flex-1">
        <div className="bg-white w-full h-[70vh] shadow-md rounded-2xl flex p-2">
          <textarea
            onChange={(e) => setUserText(e.target.value)}
            className="w-full rounded-l-2xl p-5 resize-none md:border-r focus:outline-none"
            placeholder='Enter or paste your text and press "Generate Summary"'
          />
          <div className="w-full rounded-r-2xl p-5 flex flex-col">
            <textarea
              value={summary}
              disabled
              className="w-full flex-1 resize-none focus:outline-none border rounded-xl p-3"
              placeholder="Your summarized text will appear here..."
            />
            {sentiment && (
              <div
                className={`mt-4 p-3 rounded-xl text-center font-semibold ${getSentimentColor(
                  sentiment.label
                )}`}
              >
                Sentiment: {sentiment.label} ({(sentiment.score * 100).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        <Button className="mt-8" disabled={loading} onClick={generateSummary}>
          {loading ? "Generating..." : "Generate Summary"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in with Google to use the summarization feature.
            </DialogDescription>
            <Button className="mt-6" onClick={signInWithGoogle}>
              Sign In with Google
            </Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SummarizePage;
