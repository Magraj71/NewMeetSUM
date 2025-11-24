"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div>
      <div>
        <button 
        className="ml-10 mt-3 pt-1.5 pb-1.5 pl-2 pr-2 cursor-pointer rounded-2xl bg-black text-white "
        onClick={()=>router.back()}
        >Back</button>
      </div>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-20 bg-gray-50">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Look like an <span className="italic text-blue-600">expert</span>{" "}
            right from the start
          </h1>
          <p className="text-gray-600 text-lg mb-6 max-w-2xl">
            Head start your stylish project with a powerful AI-driven Meeting
            summariser. Generate insights from text or audio with just one
            click.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/Home/audio-summarize")}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
            >
              🎤 Summarise by Audio
            </button>

            <button
              onClick={() => router.push("/Home/summarize")}
              className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow hover:bg-gray-900 transition"
            >
              📝 Summarise by Text
            </button>

            <button
              onClick={() => router.push("/Home/metting")}
              className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow hover:bg-gray-900 transition"
            >
               Record Audio and Video 
            </button>
          </div>
        </section>

        {/* Cards Section */}
        <section className="bg-gray-900 text-white py-16 px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
            Choose your mode of summarisation
          </h2>
          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Audio Summarizer Card */}
            <div
              onClick={() => router.push("/Home/audio-summarize")}
              className="bg-white text-gray-900 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition transform hover:-translate-y-1 p-6 flex flex-col"
            >
              <h3 className="text-xl font-bold mb-2">🎤 Audio Summariser</h3>
              <p className="text-gray-600 flex-grow">
                Upload an Meeting audio and get a structured AI-powered summary
                highlighting strengths, weaknesses, and overall feedback.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Try Now →
              </button>
            </div>

            {/* Text Summarizer Card */}
            <div
              onClick={() => router.push("/Home/summarize")}
              className="bg-white text-gray-900 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition transform hover:-translate-y-1 p-6 flex flex-col"
            >
              <h3 className="text-xl font-bold mb-2">📝 Text Summariser</h3>
              <p className="text-gray-600 flex-grow">
                Paste an Meeting transcript and get instant summaries with key
                insights, saving time for recruiters and HR teams.
              </p>
              <button className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
                Try Now →
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
