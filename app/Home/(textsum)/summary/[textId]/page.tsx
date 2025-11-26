"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/config/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// Helper: Sentiment color
const getSentimentColor = (label = "") => {
  switch (label.toLowerCase()) {
    case "positive":
      return "bg-gradient-to-r from-green-500 to-emerald-500";
    case "negative":
      return "bg-gradient-to-r from-red-500 to-rose-500";
    default:
      return "bg-gradient-to-r from-yellow-500 to-amber-500";
  }
};

const getSentimentBgColor = (label = "") => {
  switch (label.toLowerCase()) {
    case "positive":
      return "bg-green-50 border-green-200 text-green-800";
    case "negative":
      return "bg-red-50 border-red-200 text-red-800";
    default:
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
  }
};

// Firestore summary type
interface SummaryData {
  id: string;
  summary: string;
  userEmail: string;
  userText: string;
  sentiment: string;
  sentimentScore: number;
}

const SummaryPage = () => {
  const { textId } = useParams();
  const router = useRouter();

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [barData, setBarData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [sentimentDistribution, setSentimentDistribution] = useState<any[]>([]);

  // Fetch single summary
  const getSummary = async () => {
    try {
      const docRef = doc(db, "Summaries", textId as string);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const fetched = docSnap.data() as SummaryData;
        setData(fetched);
        await getPreviousData(fetched.userEmail, fetched.sentimentScore);
        await getFullSentimentHistory(fetched.userEmail);
        await getSentimentDistribution(fetched.userEmail);
      } else {
        toast.error("No summary found");
        router.push("/Home/summarize");
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  // Previous avg for bar chart
  const getPreviousData = async (userEmail: string, currentScore: number) => {
    try {
      const q = query(collection(db, "Summaries"), where("userEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);
      const allScores: number[] = [];

      querySnapshot.forEach((doc) => {
        const item = doc.data() as SummaryData;
        if (item.sentimentScore !== undefined && item.id !== textId) {
          allScores.push(item.sentimentScore);
        }
      });

      const avgPrevious = allScores.length
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0;

      setBarData([
        { name: "Current", score: currentScore * 100, fill: "#8B6B61" },
        { name: "Previous Avg", score: avgPrevious * 100, fill: "#A1887F" },
      ]);
    } catch (error) {
      console.error("Error loading previous data:", error);
    }
  };

  const getFullSentimentHistory = async (userEmail: string) => {
    try {
      const q = query(collection(db, "Summaries"), where("userEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);

      const allSummaries: { name: string; score: number; sentiment: string }[] = [];

      querySnapshot.forEach((doc) => {
        const item = doc.data() as SummaryData;
        const dateObj = new Date(Number(item.id));
        const dateLabel = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        allSummaries.push({
          name: dateLabel,
          score: item.sentimentScore * 100,
          sentiment: item.sentiment,
        });
      });

      allSummaries.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

      setTrendData(allSummaries);
    } catch (error) {
      console.error("Error loading full sentiment history:", error);
    }
  };

  const getSentimentDistribution = async (userEmail: string) => {
    try {
      const q = query(collection(db, "Summaries"), where("userEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);

      const sentimentCount: { [key: string]: number } = { positive: 0, negative: 0, neutral: 0 };

      querySnapshot.forEach((doc) => {
        const item = doc.data() as SummaryData;
        const sentiment = item.sentiment.toLowerCase();
        if (sentimentCount.hasOwnProperty(sentiment)) {
          sentimentCount[sentiment]++;
        }
      });

      const distribution = Object.entries(sentimentCount)
        .filter(([_, count]) => count > 0)
        .map(([sentiment, count]) => ({
          name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
          value: count,
          fill: sentiment === 'positive' ? '#10B981' : sentiment === 'negative' ? '#EF4444' : '#F59E0B'
        }));

      setSentimentDistribution(distribution);
    } catch (error) {
      console.error("Error loading sentiment distribution:", error);
    }
  };

  useEffect(() => {
    if (textId) getSummary();
  }, [textId]);

  // Sentiment box component
  const SentimentBox = () =>
    data?.sentiment ? (
      <div className={`mt-6 p-6 rounded-2xl border-2 ${getSentimentBgColor(data.sentiment)} transition-all duration-300 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getSentimentColor(data.sentiment)}`}>
              {data.sentiment.toLowerCase() === 'positive' && <span className="text-white text-lg">😊</span>}
              {data.sentiment.toLowerCase() === 'negative' && <span className="text-white text-lg">😔</span>}
              {data.sentiment.toLowerCase() === 'neutral' && <span className="text-white text-lg">😐</span>}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Sentiment Analysis</h4>
              <p className="text-gray-600 text-sm">AI-powered emotional tone detection</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-4 py-2 rounded-xl text-white font-bold text-sm ${getSentimentColor(data.sentiment)}`}>
              {data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1)}
            </div>
            <div className="text-xs text-gray-500 mt-2 font-medium">
              Confidence: {(data.sentimentScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
          <div
            className={`h-4 rounded-full ${getSentimentColor(data.sentiment)}`}
            style={{ width: `${data.sentimentScore * 100}%` }}
          ></div>
        </div>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] flex justify-center items-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#8B6B61]/30 border-t-[#8B6B61] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5D4037] text-lg font-medium">Loading your summary...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

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
        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/");
                }
              }}
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
              <span className="text-3xl text-white">📊</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#3A2A1F] mb-4">
                Summary{" "}
                <span className="bg-gradient-to-r from-[#8B6B61] to-[#5D4037] bg-clip-text text-transparent">
                  Analytics
                </span>
              </h1>
              <p className="text-xl text-[#6B4B35] max-w-3xl mx-auto font-medium">
                Complete analysis of your text with AI-powered insights and sentiment tracking
              </p>
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block">
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
                    <h3 className="text-white font-bold text-xl">Original Text</h3>
                    <p className="text-white/80 text-sm">Your input text for analysis</p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <textarea
                  className="w-full h-[500px] resize-none focus:outline-none text-[#3A2A1F] placeholder-[#8B6B61] text-lg leading-relaxed bg-white rounded-2xl p-8 border-2 border-[#D7CCC8] transition-colors duration-200 shadow-inner"
                  disabled
                  defaultValue={data.userText}
                />
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
                    <p className="text-white/80 text-sm">AI-powered analysis and insights</p>
                  </div>
                </div>
              </div>
              <div className="p-8 flex flex-col h-full">
                <div className="flex-1">
                  <textarea
                    disabled
                    className="w-full h-[400px] resize-none focus:outline-none text-[#3A2A1F] bg-white rounded-2xl p-8 border-2 border-[#D7CCC8] disabled:opacity-100 text-lg leading-relaxed shadow-inner"
                    defaultValue={data.summary}
                  />
                </div>
                <SentimentBox />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#D7CCC8] overflow-hidden">
          <Tabs defaultValue="summary" className="h-full">
            <TabsList className="rounded-none bg-gradient-to-r from-[#8B6B61] to-[#6D4C41]">
              <TabsTrigger value="summary" className="text-white data-[state=active]:bg-white/20">Summary</TabsTrigger>
              <TabsTrigger value="your-text" className="text-white data-[state=active]:bg-white/20">Original Text</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="p-6 h-96">
              <textarea
                disabled
                className="w-full h-full resize-none focus:outline-none text-[#3A2A1F] bg-white rounded-2xl p-4 border-2 border-[#D7CCC8] shadow-inner"
                defaultValue={data.summary}
              />
              <SentimentBox />
            </TabsContent>

            <TabsContent value="your-text" className="p-6 h-96">
              <textarea
                disabled
                className="w-full h-full resize-none focus:outline-none text-[#3A2A1F] bg-white rounded-2xl p-4 border-2 border-[#D7CCC8] shadow-inner"
                defaultValue={data.userText}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* New Summary Button */}
        <div className="text-center mt-12">
          <Link href="/Home/summarize">
            <Button className="px-12 py-6 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex items-center space-x-4 mx-auto border-2 border-[#A1887F]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Generate New Summary</span>
            </Button>
          </Link>
        </div>

        {/* Analytics Section */}
        <div className="mt-16 space-y-8">
          {/* Charts Grid */}
          <div className="grid xl:grid-cols-2 gap-8">
            {/* Bar Chart: Current vs Previous Avg */}
            {barData.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-[#D7CCC8] p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">📊</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#3A2A1F] text-xl">Sentiment Comparison</h3>
                    <p className="text-[#6B4B35] text-sm">Current vs historical average</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
                    <XAxis dataKey="name" stroke="#6B4B35" />
                    <YAxis domain={[0, 100]} stroke="#6B4B35" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '2px solid #D7CCC8',
                        borderRadius: '12px',
                        color: '#3A2A1F'
                      }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, "Score"]}
                    />
                    <Legend />
                    <Bar dataKey="score" name="Sentiment Score %" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Sentiment Distribution */}
            {sentimentDistribution.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-[#D7CCC8] p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🥧</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#3A2A1F] text-xl">Sentiment Distribution</h3>
                    <p className="text-[#6B4B35] text-sm">Overall sentiment breakdown</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sentimentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '2px solid #D7CCC8',
                        borderRadius: '12px',
                        color: '#3A2A1F'
                      }}
                      formatter={(value, name) => [`${value} summaries`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Line Chart: Full Sentiment Trend */}
          {trendData.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-[#D7CCC8] p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📈</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#3A2A1F] text-xl">Sentiment Trend Over Time</h3>
                  <p className="text-[#6B4B35] text-sm">Historical sentiment progression</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
                  <XAxis dataKey="name" stroke="#6B4B35" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} stroke="#6B4B35" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '2px solid #D7CCC8',
                      borderRadius: '12px',
                      color: '#3A2A1F'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, "Sentiment"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8B6B61"
                    strokeWidth={3}
                    name="Sentiment Score %"
                    dot={{ fill: '#8B6B61', r: 6, strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#A1887F' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;