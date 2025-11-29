"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MeetingEntryPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const generateRandomRoom = () => {
    const randomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    setRoomId(randomId);
  };

  const handleJoin = () => {
    if (roomId.trim()) {
      setIsCreating(true);
      router.push(`/Home/metting/${roomId.trim()}`);
    }
  };

  const handleCreateAndJoin = () => {
    setIsCreating(true);
    const randomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    router.push(`/Home/metting/${randomId}`);
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#8B6B61] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-[#5D4037] mb-2">Creating Room...</h1>
          <p className="text-[#6B4B35]">Please wait while we set up your meeting room</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-[#D7CCC8] p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-[#A1887F]">
            <span className="text-2xl text-white">🎥</span>
          </div>
          <h1 className="text-3xl font-black text-[#3A2A1F] mb-2">
            Join Meeting
          </h1>
          <p className="text-[#6B4B35] font-medium">
            Enter room ID or create new meeting
          </p>
        </div>
        
        {/* Join Form */}
        <div className="space-y-6">
          <div>
            <label htmlFor="roomId" className="block text-sm font-semibold text-[#5D4037] mb-3">
              Room ID
            </label>
            <div className="flex space-x-2">
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter meeting room ID"
                className="flex-1 px-4 py-3 bg-white border border-[#D7CCC8] rounded-xl focus:ring-2 focus:ring-[#8B6B61] focus:border-[#8B6B61] transition-all duration-300 placeholder-[#A1887F] text-[#5D4037] font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <button
                onClick={generateRandomRoom}
                className="px-4 py-3 bg-[#8B6B61]/10 hover:bg-[#8B6B61]/20 text-[#5D4037] rounded-xl font-semibold transition-all duration-300 border border-[#D7CCC8]"
                title="Generate random room ID"
              >
                🎲
              </button>
            </div>
          </div>
          
          <button
            onClick={handleJoin}
            disabled={!roomId.trim()}
            className="w-full bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] disabled:from-gray-400 disabled:to-gray-500 text-white py-3.5 px-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl border border-[#A1887F] disabled:border-gray-400 group"
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🚪 Join Existing Room</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D7CCC8]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#8B6B61]">OR</span>
            </div>
          </div>

          {/* Create New Room Button */}
          <button
            onClick={handleCreateAndJoin}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3.5 px-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl border border-green-400 group"
          >
            <span className="flex items-center justify-center space-x-2">
              <span>✨ Create New Room</span>
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 p-6 bg-gradient-to-r from-[#8B6B61]/10 to-[#6D4C41]/10 rounded-2xl border border-[#D7CCC8]">
          <h3 className="font-bold text-[#5D4037] mb-3">💡 How it works:</h3>
          <ul className="text-sm text-[#6B4B35] space-y-2 font-medium">
            <li>• Create a room and share the URL</li>
            <li>• Participants join via the shared link</li>
            <li>• Everyone automatically joins the same room</li>
            <li>• No manual room ID entry needed</li>
          </ul>
        </div>

        {/* Current URL Info */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-700 text-center">
            <strong>New:</strong> Rooms now have unique URLs for easy sharing!
          </p>
        </div>
      </div>
    </div>
  );
}