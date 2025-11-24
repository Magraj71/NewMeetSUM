import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const baseUrl = "https://api.assemblyai.com";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY as string;

    if (!apiKey) {
      throw new Error("AssemblyAI API key not found in environment variables");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1: Upload audio
    const uploadResponse = await axios.post(`${baseUrl}/v2/upload`, buffer, {
      headers: {
        authorization: apiKey,
        "content-type": "application/octet-stream",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const uploadUrl = uploadResponse.data.upload_url;

    // Step 2: Create transcription request
    const transcriptResponse = await axios.post(
      `${baseUrl}/v2/transcript`,
      { audio_url: uploadUrl },
      {
        headers: {
          authorization: apiKey,
          "content-type": "application/json",
        },
      }
    );

    const transcriptId = transcriptResponse.data.id;

    // Step 3: Poll until complete (with timeout)
    let transcriptionText = "";
    const timeout = 60 * 1000; // 60 seconds max wait
    const startTime = Date.now();

    while (true) {
      const pollingResponse = await axios.get(
        `${baseUrl}/v2/transcript/${transcriptId}`,
        {
          headers: { authorization: apiKey },
        }
      );

      const status = pollingResponse.data.status;

      if (status === "completed") {
        transcriptionText = pollingResponse.data.text;
        break;
      } else if (status === "error") {
        throw new Error(`Transcription failed: ${pollingResponse.data.error}`);
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Transcription timeout exceeded");
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return NextResponse.json({ transcript: transcriptionText });
  } catch (err: any) {
    console.error("❌ AssemblyAI API error:", err.message);
    return NextResponse.json(
      { error: err.message || "Transcription failed" },
      { status: 500 }
    );
  }
}
