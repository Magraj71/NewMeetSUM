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
import { Copy, Trash } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const HistoryPage = () => {
  const { userEmail, isAuth } = useGetUserInfo();
  const [summaries, setSummaries] = useState([
    {
      id: "",
      summary: "",
      userEmail: "",
      userText: "",
    },
  ]);

  const getHistory = async () => {
    const q = query(
      collection(db, "Summaries"),
      where("userEmail", "==", userEmail)
    );

    let summariesArray: any[] = [];

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => summariesArray.unshift(doc.data()));

    setSummaries(summariesArray);
    console.log("Docs: ", summariesArray);
  };

  useEffect(() => {
    if (isAuth) {
      getHistory();
    }
  }, [isAuth]);

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Summary copied to clipboard.");
    } catch (error) {
      console.log(error);
    }
  };

  const deleteData = async (textId: string) => {
    try {
      const delRef = doc(db, "Summaries", textId as string);

      await deleteDoc(delRef);

      toast("History deleted");

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="px-4 md:px-12 py-5 max-w-5xl mx-auto">
      <h2 className="font-semibold text-2xl mb-8">Recent Summaries</h2>

      {summaries.length > 0 ? (
        <div className="flex flex-col space-y-5">
          {summaries.map((summary, index) => (
            <div key={index} className="shadow-md p-5 rounded-lg">
              <div className="flex justify-between mb-4 text-gray-500 text-sm">
                <p>
                  {new Date(Number(summary.id)).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>

                <div className="flex items-center space-x-4">
                  <Copy
                    onClick={() => onCopy(summary.summary)}
                    className="w-5 h-5"
                  />

                  <Trash
                    onClick={() => deleteData(summary.id)}
                    className="w-5 h-5 stroke-red-500"
                  />
                </div>
              </div>

              <Link href={`/Home/summary/${summary.id}`}>
                <p className="line-clamp-3">{summary.summary}</p>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p>No text summarized yet.</p>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
