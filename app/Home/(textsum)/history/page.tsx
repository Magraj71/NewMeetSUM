"use client";

import { db } from "@/config/firebaseConfig";
import { useGetUserInfo } from "@/hooks/useGetUserInfo";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Copy, Trash, Calendar, FileText, Clock, Search } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface Summary {
  id: string;
  summary: string;
  userEmail: string;
  userText: string;
  sentiment?: string;
  sentimentScore?: number;
}

const HistoryPage = () => {
  const { userEmail, isAuth } = useGetUserInfo();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const getHistory = async () => {
    if (!isAuth) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, "Summaries"),
        where("userEmail", "==", userEmail)
      );

      const querySnapshot = await getDocs(q);
      const summariesArray: Summary[] = [];
      
      querySnapshot.forEach((doc) => {
        summariesArray.unshift({ id: doc.id, ...doc.data() } as Summary);
      });

      setSummaries(summariesArray);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuth) {
      getHistory();
    }
  }, [isAuth]);

  const filteredSummaries = summaries.filter(summary =>
    summary.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.userText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied to clipboard!");
    } catch (error) {
      console.log(error);
      toast.error("Failed to copy summary");
    }
  };

  const deleteData = async (textId: string) => {
    try {
      const delRef = doc(db, "Summaries", textId);
      await deleteDoc(delRef);
      toast.success("Summary deleted successfully");
      
      // Update local state instead of reloading
      setSummaries(prev => prev.filter(summary => summary.id !== textId));
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete summary");
    }
  };

  const getSentimentColor = (label = "") => {
    switch (label?.toLowerCase()) {
      case "positive":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "negative":
        return "bg-gradient-to-r from-red-500 to-rose-500";
      case "neutral":
        return "bg-gradient-to-r from-yellow-500 to-amber-500";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500";
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(Number(timestamp));
    return {
      full: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: '2-digit',
        minute: '2-digit'
      }),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] flex items-center justify-center">
        <div className="text-center p-8 bg-white/80 backdrop-blur-lg rounded-3xl border border-[#D7CCC8] shadow-2xl max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-[#3A2A1F] mb-2">Sign In Required</h2>
          <p className="text-[#6B4B35] mb-6">Please sign in to view your summary history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8]">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center shadow-2xl border border-[#A1887F]">
              <span className="text-3xl text-white">📚</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#3A2A1F] mb-4">
                Summary{" "}
                <span className="bg-gradient-to-r from-[#8B6B61] to-[#5D4037] bg-clip-text text-transparent">
                  History
                </span>
              </h1>
              <p className="text-xl text-[#6B4B35] max-w-2xl mx-auto font-medium">
                Review and manage all your AI-generated summaries in one place
              </p>
            </div>
          </div>
        </div>

        {/* Stats and Search */}
        <div className="mb-8">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-[#D7CCC8] shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#3A2A1F]">{summaries.length}</p>
                  <p className="text-[#6B4B35] text-sm">Total Summaries</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-[#D7CCC8] shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">😊</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#3A2A1F]">
                    {summaries.filter(s => s.sentiment === 'positive').length}
                  </p>
                  <p className="text-[#6B4B35] text-sm">Positive</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-[#D7CCC8] shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">😐</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#3A2A1F]">
                    {summaries.filter(s => s.sentiment === 'neutral').length}
                  </p>
                  <p className="text-[#6B4B35] text-sm">Neutral</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-[#D7CCC8] shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">😔</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#3A2A1F]">
                    {summaries.filter(s => s.sentiment === 'negative').length}
                  </p>
                  <p className="text-[#6B4B35] text-sm">Negative</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-[#D7CCC8] shadow-lg">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8B6B61] w-5 h-5" />
              <input
                type="text"
                placeholder="Search through your summaries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#D7CCC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6B61] focus:border-transparent text-[#3A2A1F] placeholder-[#8B6B61]"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#8B6B61]/30 border-t-[#8B6B61] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#5D4037] text-lg font-medium">Loading your summaries...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSummaries.length === 0 && (
          <div className="text-center py-16 bg-white/80 backdrop-blur-lg rounded-3xl border border-[#D7CCC8] shadow-2xl">
            <div className="w-24 h-24 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-white">📝</span>
            </div>
            <h3 className="text-2xl font-bold text-[#3A2A1F] mb-3">No summaries yet</h3>
            <p className="text-[#6B4B35] text-lg mb-6 max-w-md mx-auto">
              Start creating amazing summaries with our AI-powered tool
            </p>
            <Link href="/Home/summarize">
              <button className="px-8 py-4 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-bold text-lg rounded-xl transition-all duration-300 hover:scale-105 shadow-lg border border-[#A1887F]">
                Create Your First Summary
              </button>
            </Link>
          </div>
        )}

        {/* Summaries Grid */}
        {!loading && filteredSummaries.length > 0 && (
          <div className="grid gap-6">
            {filteredSummaries.map((summary, index) => (
              <div 
                key={summary.id} 
                className="bg-white/80 backdrop-blur-lg rounded-3xl border border-[#D7CCC8] shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden"
              >
                <div className="p-8">
                  {/* Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-[#6B4B35]">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{formatDate(summary.id).full}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[#6B4B35]">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{formatDate(summary.id).time}</span>
                      </div>
                      {summary.sentiment && (
                        <div className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${getSentimentColor(summary.sentiment)}`}>
                          {summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onCopy(summary.summary)}
                        className="p-3 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-xl transition-all duration-200 hover:scale-110 border border-[#D7CCC8] hover:border-[#8B6B61]"
                        title="Copy summary"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this summary?")) {
                            deleteData(summary.id);
                          }
                        }}
                        className="p-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all duration-200 hover:scale-110 border border-red-200 hover:border-red-300"
                        title="Delete summary"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Content */}
                  <Link href={`/Home/summary/${summary.id}`}>
                    <div className="cursor-pointer group">
                      <p className="text-[#3A2A1F] text-lg leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                        {summary.summary}
                      </p>
                      <div className="mt-4 flex items-center space-x-2 text-[#8B6B61] text-sm">
                        <span>Click to view full analysis</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </Link>

                  {/* Original Text Preview */}
                  <div className="mt-6 p-4 bg-gradient-to-br from-[#FAF3EB] to-[#F5ECE3] rounded-xl border border-[#D7CCC8]">
                    <p className="text-sm text-[#6B4B35] font-medium mb-2">Original Text Preview:</p>
                    <p className="text-[#3A2A1F] text-sm leading-relaxed line-clamp-2">
                      {summary.userText}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Results Info */}
        {searchTerm && !loading && (
          <div className="text-center mt-8 p-4 bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8]">
            <p className="text-[#6B4B35]">
              Found {filteredSummaries.length} summary{filteredSummaries.length !== 1 ? 's' : ''} matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;