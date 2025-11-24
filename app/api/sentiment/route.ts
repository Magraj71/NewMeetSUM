import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { text } = await req.json();

		if (!text || text.trim().length === 0) {
			return NextResponse.json({ error: "No text provided." }, { status: 400 });
		}

		const HF_TOKEN = process.env.HF_TOKEN;

		if (!HF_TOKEN) {
			return NextResponse.json({ error: "Missing HF_TOKEN in environment." }, { status: 500 });
		}

		const response = await fetch(
			"https://router.huggingface.co/hf-inference/models/ProsusAI/finbert",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${HF_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ inputs: text }),
			}
		);

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json({ error }, { status: response.status });
		}

		const result = await response.json();

		// FinBERT returns array of objects like [{ label: 'positive', score: 0.98 }, ...]
		const topSentiment = Array.isArray(result[0])
			? result[0].sort((a, b) => b.score - a.score)[0]
			: result.sort((a, b) => b.score - a.score)[0];

		return NextResponse.json(topSentiment);
	} catch (error: any) {
		console.error("Sentiment API Error:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
