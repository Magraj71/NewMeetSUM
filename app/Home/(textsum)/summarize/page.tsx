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
      toast.error("Please enter at least 10 characters to summarize.");
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
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "negative":
        return "bg-gradient-to-r from-red-500 to-rose-500";
      default:
        return "bg-gradient-to-r from-yellow-500 to-amber-500";
    }
  };

  const getSentimentBgColor = (label: string) => {
    switch (label.toLowerCase()) {
      case "positive":
        return "bg-green-50 border-green-200";
      case "negative":
        return "bg-red-50 border-red-200";
      default:
        return "bg-yellow-50 border-yellow-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8]">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-lg border-b border-[#D7CCC8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
              className="flex items-center space-x-2 px-6 py-2.5 bg-white hover:bg-[#8B6B61]/10 text-[#5D4037] font-medium rounded-xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center shadow-2xl border border-[#A1887F]">
              <span className="text-3xl text-white">📝</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#3A2A1F] mb-4">
                AI Text{" "}
                <span className="bg-gradient-to-r from-[#8B6B61] to-[#5D4037] bg-clip-text text-transparent">
                  Summarizer
                </span>
              </h1>
              <p className="text-xl text-[#6B4B35] max-w-3xl mx-auto font-medium">
                Transform lengthy texts into clear, concise summaries with advanced AI analysis and sentiment detection
              </p>
            </div>
          </div>
        </div>

        {/* Editor Section - Full Width Layout */}
        <div className="grid xl:grid-cols-2 gap-8 mb-8">
          {/* Input Panel - Wider */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#D7CCC8] overflow-hidden">
            <div className="bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] px-8 py-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Input Text</h3>
                  <p className="text-white/80 text-sm">Paste your text to summarize</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <textarea
                onChange={(e) => setUserText(e.target.value)}
                className="w-full h-[500px] resize-none focus:outline-none text-[#3A2A1F] placeholder-[#8B6B61] text-lg leading-relaxed bg-white rounded-2xl p-8 border-2 border-[#D7CCC8] focus:border-[#8B6B61] transition-colors duration-200 shadow-inner"
                placeholder='Paste your text here... (Minimum 10 characters required)

Example:
"The quarterly performance review indicates strong growth in key metrics. Revenue increased by 15% compared to last quarter, while customer satisfaction scores reached an all-time high of 92%. However, operational costs also rose by 8%, primarily due to increased marketing expenditure and infrastructure upgrades..."'
              />
              <div className="flex justify-between items-center mt-6 px-2">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#8B6B61] rounded-full"></div>
                    <span className="text-[#6B4B35] font-medium">{userText.length} characters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#6D4C41] rounded-full"></div>
                    <span className="text-[#6B4B35] font-medium">{userText.split(/\s+/).filter(word => word.length > 0).length} words</span>
                  </div>
                </div>
                {userText.trim().length < 10 && userText.length > 0 && (
                  <div className="flex items-center space-x-2 text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Minimum 10 characters required</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Output Panel - Wider */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#D7CCC8] overflow-hidden">
            <div className="bg-gradient-to-r from-[#6D4C41] to-[#8B6B61] px-8 py-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">AI Summary</h3>
                  <p className="text-white/80 text-sm">Powered by advanced AI analysis</p>
                </div>
              </div>
            </div>
            <div className="p-8 flex flex-col h-full">
              <div className="flex-1">
                <textarea
                  value={summary}
                  disabled
                  className="w-full h-[400px] resize-none focus:outline-none text-[#3A2A1F] bg-white rounded-2xl p-8 border-2 border-[#D7CCC8] disabled:opacity-100 text-lg leading-relaxed shadow-inner placeholder-[#8B6B61]"
                  placeholder={loading ? 
                    "Generating your summary... This may take a few moments depending on the text length. Our AI is analyzing the content and extracting key insights..." : 
                    "Your AI-powered summary will appear here. The summary will include key points, strengths, weaknesses, and overall sentiment analysis of the content."}
                />
              </div>
              
              {/* Sentiment Analysis */}
              {sentiment && (
                <div className={`mt-6 p-6 rounded-2xl border-2 ${getSentimentBgColor(sentiment.label)} transition-all duration-300 shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getSentimentColor(sentiment.label)}`}>
                        {sentiment.label.toLowerCase() === 'positive' && <span className="text-white text-lg">😊</span>}
                        {sentiment.label.toLowerCase() === 'negative' && <span className="text-white text-lg">😔</span>}
                        {sentiment.label.toLowerCase() === 'neutral' && <span className="text-white text-lg">😐</span>}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">Sentiment Analysis</h4>
                        <p className="text-gray-600 text-sm">AI-powered emotional tone detection</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-4 py-2 rounded-xl text-white font-bold text-sm ${getSentimentColor(sentiment.label)}`}>
                        {sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 font-medium">
                        Confidence: {(sentiment.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="text-center mb-16">
          <Button
            onClick={generateSummary}
            disabled={loading || userText.trim().length < 10}
            className="px-16 py-8 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-4 mx-auto border-2 border-[#A1887F]"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating AI Summary...</span>
              </>
            ) : (
              <>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generate AI Summary</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-8 max-w-6xl mx-auto">
          {[
            {
              icon: "⚡",
              title: "Lightning Fast",
              description: "Get comprehensive summaries in seconds with our advanced AI processing technology"
            },
            {
              icon: "🎯",
              title: "Smart Analysis",
              description: "Advanced key points extraction, sentiment analysis, and contextual understanding"
            },
            {
              icon: "🔒",
              title: "Secure & Private",
              description: "Your data is processed securely with end-to-end encryption and never stored permanently"
            }
          ].map((feature, index) => (
            <div key={index} className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#D7CCC8] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-[#A1887F]">
                <span className="text-2xl text-white">{feature.icon}</span>
              </div>
              <h4 className="font-bold text-[#3A2A1F] text-lg mb-3">{feature.title}</h4>
              <p className="text-[#6B4B35] text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sign In Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg border border-[#D7CCC8] rounded-2xl">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center">
                <span className="text-2xl text-white">🔒</span>
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-[#3A2A1F]">
              Sign In Required
            </DialogTitle>
            <DialogDescription className="text-center text-[#6B4B35] text-lg font-medium">
              Please sign in with Google to access the AI summarization feature
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Button 
              onClick={signInWithGoogle}
              className="w-full py-6 bg-white hover:bg-gray-50 text-[#5D4037] font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-3 border-2 border-[#D7CCC8] hover:border-[#8B6B61] shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign In with Google</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="w-full py-6 text-[#5D4037] font-semibold rounded-xl border-2 border-[#D7CCC8] hover:border-[#8B6B61] hover:bg-[#8B6B61]/10 transition-all duration-300"
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SummarizePage;