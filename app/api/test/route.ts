import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const hfToken = process.env.HUGGINGFACE_API_KEY;
  if (!hfToken) {
    return NextResponse.json({ error: "HF API key missing" }, { status: 500 });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2",
      { inputs: "I love this product!" },
      {
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
      }
    );
    return NextResponse.json(response.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data || err.message }, { status: 500 });
  }
}
