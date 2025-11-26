"use client";

import { useState } from "react";
import MeetingClient from "@/components/MeetingClient";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (roomId.trim()) {
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl animate-float-reverse"></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>

        <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-[#D7CCC8] p-8 w-full max-w-md hover:shadow-3xl transition-all duration-500">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-[#A1887F]">
              <span className="text-2xl text-white">🎥</span>
            </div>
            <h1 className="text-3xl font-black text-[#3A2A1F] mb-2">
              Video Meeting
            </h1>
            <p className="text-[#6B4B35] font-medium">
              Start or join a video call with AI-powered features
            </p>
          </div>
          
          {/* Join Form */}
          <div className="space-y-6">
            <div>
              <label htmlFor="roomId" className="block text-sm font-semibold text-[#5D4037] mb-3">
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter your meeting room ID"
                className="w-full px-4 py-3 bg-white border border-[#D7CCC8] rounded-xl focus:ring-2 focus:ring-[#8B6B61] focus:border-[#8B6B61] transition-all duration-300 placeholder-[#A1887F] text-[#5D4037] font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            
            <button
              onClick={handleJoin}
              disabled={!roomId.trim()}
              className="w-full bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] disabled:from-gray-400 disabled:to-gray-500 text-white py-3.5 px-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl border border-[#A1887F] disabled:border-gray-400 group"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🚀 Join Meeting</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

          {/* Features Info */}
          <div className="mt-8 p-6 bg-gradient-to-r from-[#8B6B61]/10 to-[#6D4C41]/10 rounded-2xl border border-[#D7CCC8]">
            <h3 className="font-bold text-[#5D4037] mb-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-full animate-ping"></div>
              <span>AI-Powered Features:</span>
            </h3>
            <ul className="text-sm text-[#6B4B35] space-y-2 font-medium">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-[#8B6B61] rounded-full"></div>
                <span>Real-time transcription</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-[#8B6B61] rounded-full"></div>
                <span>Smart meeting summaries</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-[#8B6B61] rounded-full"></div>
                <span>Action item detection</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-[#8B6B61] rounded-full"></div>
                <span>Live chat with participants</span>
              </li>
            </ul>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 p-4 bg-white/60 rounded-xl border border-[#D7CCC8]">
            <h4 className="font-semibold text-[#5D4037] text-sm mb-2">💡 Quick Tips:</h4>
            <ul className="text-xs text-[#6B4B35] space-y-1 font-medium">
              <li>• Create a unique room name for your meeting</li>
              <li>• Share the room ID with participants</li>
              <li>• Allow camera & microphone access</li>
              <li>• Use headphones for better audio quality</li>
            </ul>
          </div>
        </div>

        {/* Bottom Decoration */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-xs text-[#8B6B61] font-medium">
            Powered by MeetSum AI Technology
          </p>
        </div>
      </div>
    );
  }

  return <MeetingClient roomId={roomId} />;
}