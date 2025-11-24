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
    <div>
      <button
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push("/"); // fallback route (homepage, or any path you want)
          }
        }}
        className="ml-10 mt-3 pt-1.5 pb-1.5 pl-2 pr-2 cursor-pointer rounded-2xl bg-black text-white"
      >
        Back
      </button>

      <div className="min-h-screen bg-gray-50 p-8">
        <header className="max-w-6xl mx-auto mb-8 flex flex-col items-center justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            🎤 Audio → Text
          </h1>
          <p className="text-gray-600 mt-2">
            Upload Meeting audio on the left. The transcribed text will appear
            on the right step-by-step.
          </p>
        </header>

        <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT: Upload + Steps */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload & Controls</h2>

            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-center mb-4 hover:border-blue-400 transition"
              style={{ minHeight: 180 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={onFileChange}
                className="hidden"
                id="audio-file-input"
              />
              <label
                htmlFor="audio-file-input"
                className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-md shadow"
                onClick={() => {
                  // clicking label triggers file input
                }}
              >
                Click to select file
              </label>

              <div className="mt-4 text-sm text-gray-600">
                or drag & drop audio file here
              </div>

              {file && (
                <div className="mt-4 w-full text-left">
                  <div className="text-sm text-gray-700">
                    <strong>Selected:</strong> {file.name} •{" "}
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={startTranscription}
                disabled={loading || !file}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md shadow disabled:opacity-50"
              >
                {loading ? "Working..." : "Start Transcription"}
              </button>

              <button
                onClick={resetAll}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
              >
                Reset
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Pipeline Steps
              </h3>
              <ol className="space-y-3">
                {(
                  [
                    "uploading",
                    "transcribing",
                    "post-processing",
                    "done",
                  ] as Step[]
                ).map((s) => {
                  const idx =
                    s === step
                      ? "current"
                      : step === "error" && s === "done"
                      ? "skipped"
                      : "";
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
                  return (
                    <li key={s} className="flex items-start gap-3">
                      <div
                        className={`w-3 h-3 mt-1 rounded-full ${
                          isActive ? "bg-blue-600" : "bg-gray-300"
                        }`}
                        aria-hidden
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {STEP_LABELS[s]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isActive
                            ? s === step && step !== "done"
                              ? "In progress..."
                              : s === "done" && step === "done"
                              ? "Completed"
                              : "Completed"
                            : "Waiting"}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {step === "error" && errorMsg && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Transcript */}
          <section className="bg-white rounded-lg shadow p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Transcript</h2>
                <p className="text-sm text-gray-600">
                  Live output appears here.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(transcript || "");
                    alert("Copied transcript to clipboard");
                  }}
                  disabled={!transcript}
                  className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-50"
                >
                  Copy
                </button>
                <button
                  onClick={downloadTranscript}
                  disabled={!transcript}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <textarea
                readOnly
                value={transcript}
                className="w-full h-full min-h-[260px] p-4 border rounded resize-none text-gray-800"
                placeholder={
                  step === "idle"
                    ? "Transcript will appear here after you start."
                    : "Transcribing..."
                }
              />
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Tip: For best results use clear audio (wav, mp3, m4a). Long files
              may take longer to transcribe.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AudioSummarizer;
