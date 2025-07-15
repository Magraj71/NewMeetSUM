"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const SummaryPage = () => {
  const { textId } = useParams();
  const [data, setData] = useState({
    id: "",
    summary: "",
    userEmail: "",
    userText: "",
  });

  const getSummary = async () => {
    const docRef = doc(db, "Summaries", textId as string);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document: ", docSnap.data());
      const { id, summary, userEmail, userText } = docSnap.data();
      setData({ id, summary, userEmail, userText });
    } else {
      console.log("No such document");
      toast("No summary found");
    }
  };

  useEffect(() => {
    if (textId) {
      getSummary();
    }
  }, [textId]);

  return (
    <div className="bg-[#f5f5f5] flex flex-col justify-center items-center px-4 md:px-12 h-[90vh]">
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

        <textarea
          disabled
          className="w-full rounded-r-2xl p-5 resize-none focus:outline-none hidden md:inline-flex"
          defaultValue={data.summary}
        />
      </div>

      <div className="bg-white w-full h-[70vh] shadow-md rounded-2xl md:hidden">
        <Tabs defaultValue="summary" className="h-full">
          <TabsList className="rounded-none bg-white">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="your-text">Your text</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="p-3">
            <textarea
              disabled
              className="w-full h-full resize-none focus:outline-none"
              defaultValue={data.summary}
            />
          </TabsContent>
          <TabsContent value="your-text" className="p-3">
            {" "}
            <textarea
              disabled
              className="w-full h-full resize-none focus:outline-none"
              defaultValue={data.userText}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Link href="/summarize">
        <Button className="mt-8">Generate a New Summary</Button>
      </Link>
    </div>
  );
};

export default SummaryPage;
