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
} from "recharts";

// Helper: Sentiment color
const getSentimentColor = (label = "") => {
  switch (label.toLowerCase()) {
    case "positive":
      return "bg-green-100 text-green-700 border-green-300";
    case "negative":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
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
        { name: "Current", score: currentScore * 100 },
        { name: "Previous Avg", score: avgPrevious * 100 },
      ]);
    } catch (error) {
      console.error("Error loading previous data:", error);
    }
  };

  // Full historical trend for line chart
  // const getFullSentimentHistory = async (userEmail: string) => {
  //   try {
  //     const q = query(collection(db, "Summaries"), where("userEmail", "==", userEmail));
  //     const querySnapshot = await getDocs(q);

  //     const allSummaries: { name: string; score: number; sentiment: string }[] = [];

  //     querySnapshot.forEach((doc) => {
  //       const item = doc.data() as SummaryData;
  //       const dateLabel = new Date(Number(item.id)).toLocaleDateString();
  //       allSummaries.push({
  //         name: dateLabel,
  //         score: item.sentimentScore * 100,
  //         sentiment: item.sentiment,
  //       });
  //     });

  //     allSummaries.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  //     setTrendData(allSummaries);
  //   } catch (error) {
  //     console.error("Error loading full sentiment history:", error);
  //   }
  // };
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


  useEffect(() => {
    if (textId) getSummary();
  }, [textId]);

  // Sentiment box component
  const SentimentBox = () =>
    data?.sentiment ? (
      <div
        className={`mt-4 p-3 border rounded-xl text-center font-semibold ${getSentimentColor(
          data.sentiment
        )}`}
      >
        Sentiment: {data.sentiment} ({(data.sentimentScore * 100).toFixed(1)}%)
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${
              data.sentiment.toLowerCase() === "positive"
                ? "bg-green-500"
                : data.sentiment.toLowerCase() === "negative"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
            style={{ width: `${data.sentimentScore * 100}%` }}
          ></div>
        </div>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[90vh]">
        <p className="text-gray-600 text-lg font-medium animate-pulse">
          Loading summary...
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-[#f5f5f5] flex flex-col justify-center items-center px-4 md:px-12 min-h-[90vh] pb-10">
      {/* Back Button */}
      <div className="w-full flex justify-start">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="mt-3 mb-4 px-4 py-2 cursor-pointer rounded-2xl bg-black text-white"
        >
          Back
        </button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex pt-5 pb-2 justify-between items-center w-full text-lg font-semibold">
        <p>Your Text</p>
        <p>Summary</p>
      </div>

      <div className="bg-white w-full h-[70vh] shadow-md rounded-2xl hidden md:flex p-2">
        <textarea
          className="w-full rounded-l-2xl p-5 resize-none md:border-r focus:outline-none"
          disabled
          defaultValue={data.userText}
        />
        <div className="w-full flex flex-col gap-2 p-3">
          <textarea
            disabled
            className="w-full flex-1 resize-none focus:outline-none border rounded-xl p-3"
            defaultValue={data.summary}
          />
          <SentimentBox />
        </div>
      </div>

      {/* Mobile View */}
      <div className="bg-white w-full h-[70vh] shadow-md rounded-2xl md:hidden">
        <Tabs defaultValue="summary" className="h-full">
          <TabsList className="rounded-none bg-white">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="your-text">Your Text</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="p-3">
            <textarea
              disabled
              className="w-full h-full resize-none focus:outline-none"
              defaultValue={data.summary}
            />
            <SentimentBox />
          </TabsContent>

          <TabsContent value="your-text" className="p-3">
            <textarea
              disabled
              className="w-full h-full resize-none focus:outline-none"
              defaultValue={data.userText}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Button */}
      <Link href="/Home/summarize">
        <Button className="mt-8">Generate a New Summary</Button>
      </Link>

      {/* Bar Chart: Current vs Previous Avg */}
      {barData.length > 0 && (
        <div className="bg-white w-full md:w-[70%] mt-10 p-5 shadow-md rounded-xl">
          <h3 className="text-center font-semibold mb-4 text-lg">
            Sentiment Comparison
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={barData}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#3b82f6" name="Sentiment %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Line Chart: Full Sentiment Trend */}
      {trendData.length > 0 && (
        <div className="bg-white w-full md:w-[90%] mt-10 p-5 shadow-md rounded-xl">
          <h3 className="text-center font-semibold mb-4 text-lg">
            Sentiment Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(value) => [`${value.toFixed(1)}%`, "Sentiment"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                name="Sentiment %"
                dot={{ r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SummaryPage;
