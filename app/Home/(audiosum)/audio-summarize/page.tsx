"use client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { NextPage } from "next";

type Step =
  | "idle"
  | "uploading"
  | "transcribing"
  | "post-processing"
  | "done"
  | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "Waiting for file",
  uploading: "Uploading file",
  transcribing: "Transcribing audio",
  "post-processing": "Post-processing transcript",
  done: "Completed",
  error: "Error",
};

const AudioSummarizer: NextPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      setStep("idle");
      setTranscript("");
      setErrorMsg(null);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStep("idle");
      setTranscript("");
      setErrorMsg(null);
    }
  };

  const resetAll = () => {
    setFile(null);
    setStep("idle");
    setTranscript("");
    setLoading(false);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startTranscription = async () => {
    if (!file) {
      alert("Please upload an audio file first.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      setStep("uploading");

      const form = new FormData();
      form.append("file", file);

      // 1) Upload & transcribe (server /api/transcribe handles file -> text)
      setStep("transcribing");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      console.log(res);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Transcription failed: ${errText}`);
      }

      const data = await res.json();

      // Minimal validation
      if (!data?.transcript) {
        throw new Error("No transcript returned from server.");
      }

      setTranscript(""); // clear before streaming/setting
      setStep("post-processing");

      // Simulate a small post-processing streaming effect so user sees step-by-step.
      // (We append text in chunks so user sees "step-by-step" filling on the right.)
      const fullText: string = data.transcript;
      const chunkSize = 120; // characters per chunk to append
      let idx = 0;

      // Append in small chunks:
      while (idx < fullText.length) {
        const next = fullText.slice(idx, idx + chunkSize);
        setTranscript((prev) => prev + next);
        idx += chunkSize;
        // small pause to show progressive filling
        // NOTE: not blocking server — just UI pacing
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150));
      }

      setStep("done");
    } catch (err: any) {
      console.error(err);
      setStep("error");
      setErrorMsg(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="relative z-10">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="ml-10 mt-6 px-6 py-3 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg border border-[#A1887F] flex items-center space-x-2 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Go Back</span>
        </button>

        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center shadow-lg border border-[#A1887F]">
              <span className="text-2xl text-white">🎤</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-[#3A2A1F]">
                Audio to Text
              </h1>
              <p className="text-[#6B4B35] text-lg mt-2 max-w-2xl mx-auto font-medium">
                Upload meeting audio and watch it transform into text with AI-powered transcription
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* LEFT: Upload + Steps */}
          <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#D7CCC8] p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#3A2A1F]">Upload Audio</h2>
            </div>

            {/* File Upload Area */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="border-3 border-dashed border-[#D7CCC8] rounded-2xl p-8 flex flex-col items-center justify-center text-center mb-6 hover:border-[#8B6B61] transition-all duration-300 bg-gradient-to-br from-[#FAF3EB] to-[#F5ECE3] group cursor-pointer"
              style={{ minHeight: 200 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={onFileChange}
                className="hidden"
                id="audio-file-input"
              />
              
              <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>

              <label
                htmlFor="audio-file-input"
                className="cursor-pointer px-6 py-3 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg border border-[#A1887F]"
              >
                Choose Audio File
              </label>

              <div className="mt-4 text-[#6B4B35] font-medium">
                or drag & drop your file here
              </div>

              {file && (
                <div className="mt-6 p-4 bg-white rounded-xl border border-[#D7CCC8] shadow-sm w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-[#3A2A1F] truncate max-w-xs">{file.name}</p>
                        <p className="text-sm text-[#8B6B61]">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={startTranscription}
                disabled={loading || !file}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:scale-100 shadow-lg border border-[#A1887F] disabled:border-gray-400 flex items-center justify-center space-x-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Start Transcription</span>
                  </>
                )}
              </button>

              <button
                onClick={resetAll}
                className="px-6 py-4 bg-white hover:bg-[#8B6B61]/10 text-[#5D4037] font-semibold rounded-xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Reset
              </button>
            </div>

            {/* Progress Steps */}
            <div className="bg-gradient-to-br from-[#FAF3EB] to-[#F5ECE3] rounded-2xl p-6 border border-[#D7CCC8]">
              <h3 className="text-lg font-bold text-[#3A2A1F] mb-4 flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-full animate-ping"></div>
                <span>Processing Steps</span>
              </h3>
              
              <div className="space-y-4">
                {(
                  [
                    "uploading",
                    "transcribing",
                    "post-processing",
                    "done",
                  ] as Step[]
                ).map((s) => {
                  const isActive =
                    s === step ||
                    (step === "done" && s === "done") ||
                    (step !== "idle" &&
                      (s === "uploading" ||
                        s === "transcribing" ||
                        s === "post-processing") &&
                      ["uploading", "transcribing", "post-processing"].indexOf(
                        s
                      ) <=
                        [
                          "uploading",
                          "transcribing",
                          "post-processing",
                        ].indexOf(step as any));
                  
                  const isCurrent = s === step && step !== "done";
                  
                  return (
                    <div key={s} className="flex items-center space-x-4 p-3 bg-white rounded-xl border border-[#D7CCC8]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white shadow-lg' 
                          : 'bg-[#EFEBE9] text-[#8B6B61]'
                      }`}>
                        {isActive ? (
                          isCurrent ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )
                        ) : (
                          <div className="w-2 h-2 bg-[#8B6B61] rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold text-[#3A2A1F]">
                          {STEP_LABELS[s]}
                        </div>
                        <div className="text-sm text-[#8B6B61]">
                          {isActive
                            ? isCurrent
                              ? "In progress..."
                              : "Completed"
                            : "Waiting"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {step === "error" && errorMsg && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-red-800">Error occurred</div>
                      <div className="text-sm text-red-600">{errorMsg}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Transcript */}
          <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#D7CCC8] p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3A2A1F]">Transcript</h2>
                  <p className="text-[#6B4B35] font-medium">
                    Live transcription output
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(transcript || "");
                    alert("Copied transcript to clipboard");
                  }}
                  disabled={!transcript}
                  className="px-4 py-2 bg-white hover:bg-[#8B6B61]/10 text-[#5D4037] font-medium rounded-xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
                <button
                  onClick={downloadTranscript}
                  disabled={!transcript}
                  className="px-4 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 shadow-lg border border-[#A1887F] disabled:opacity-50 disabled:scale-100 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Transcript Area */}
            <div className="flex-1 bg-gradient-to-br from-[#FAF3EB] to-[#F5ECE3] rounded-2xl border border-[#D7CCC8] p-6">
              <textarea
                readOnly
                value={transcript}
                className="w-full h-full min-h-[400px] bg-transparent border-none resize-none text-[#3A2A1F] placeholder-[#8B6B61] font-medium leading-relaxed focus:outline-none focus:ring-0"
                placeholder={
                  step === "idle"
                    ? "Your transcribed text will appear here after processing... ✨"
                    : "Processing your audio... This may take a moment depending on file size."
                }
              />
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-gradient-to-r from-[#8B6B61]/10 to-[#6D4C41]/10 rounded-xl border border-[#D7CCC8]">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💡</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#5D4037]">Pro Tip</p>
                  <p className="text-sm text-[#6B4B35]">
                    For best results, use clear audio files (WAV, MP3, M4A) with minimal background noise.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AudioSummarizer;