"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import VideoCall from "./VideoCall";

interface MeetingClientProps {
  roomId: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  type?: 'text' | 'emoji' | 'file';
  fileName?: string;
  fileData?: string;
  timestamp: number;
  roomId: string;
}

interface AudioRecording {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  duration: string;
  blobUrl: string;
  blob: Blob;
  fileName: string;
  fileSize: string;
}

export default function MeetingClient({ roomId }: MeetingClientProps) {
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // States
  const [myId, setMyId] = useState(`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [users, setUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const commonEmojis = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😊', '🙂', '👍', '❤️', '🔥', '🎉', '💯', '👏', '🙏'];

  // API Call function
  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Room management
  const joinRoom = async (): Promise<boolean> => {
    try {
      await apiCall('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: myId, 
          roomId: roomId, 
          action: 'join' 
        })
      });
      return true;
    } catch (error: any) {
      console.error('Join room error:', error);
      return false;
    }
  };

  const leaveRoom = async (): Promise<boolean> => {
    try {
      await apiCall('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: myId, 
          roomId: roomId, 
          action: 'leave' 
        })
      });
      return true;
    } catch (error: any) {
      console.error('Leave room error:', error);
      return false;
    }
  };

  const getRoomUsers = async (): Promise<string[]> => {
    try {
      const data = await apiCall(`/api/rooms?roomId=${encodeURIComponent(roomId)}`);
      return data.users || [];
    } catch (error: any) {
      console.error('Get room users error:', error);
      return [];
    }
  };

  // Chat functions
  const sendChatMessage = async (messageData: {
    message: string;
    type: 'text' | 'emoji' | 'file';
    fileName?: string;
    fileData?: string;
    timestamp: number;
  }): Promise<boolean> => {
    try {
      const payload = {
        roomId: roomId,
        senderId: myId,
        message: messageData.message,
        type: messageData.type,
        fileName: messageData.fileName,
        fileData: messageData.fileData,
        timestamp: messageData.timestamp
      };

      await apiCall('/api/chat', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return true;
    } catch (error: any) {
      console.error('Send message error:', error);
      return false;
    }
  };

  const getChatMessages = async (): Promise<ChatMessage[]> => {
    try {
      const data = await apiCall(`/api/chat?roomId=${encodeURIComponent(roomId)}`);
      return data.messages || [];
    } catch (error: any) {
      console.error('Get chat messages error:', error);
      return [];
    }
  };

  // Share Room Functionality
  const getRoomUrl = (): string => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/Home/metting/${roomId}`;
    }
    return `http://localhost:3000/Home/metting/${roomId}`;
  };

  const shareRoom = async () => {
    const roomUrl = getRoomUrl();
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join my meeting: ${roomId}`,
          text: `Join my video meeting room: ${roomId}`,
          url: roomUrl,
        });
      } else {
        await navigator.clipboard.writeText(roomUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copy
      await navigator.clipboard.writeText(roomUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const copyRoomLink = async () => {
    const roomUrl = getRoomUrl();
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const shareViaWhatsApp = () => {
    const roomUrl = getRoomUrl();
    const text = `Join my video metting: ${roomId}\n${roomUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const roomUrl = getRoomUrl();
    const subject = `Join my video metting: ${roomId}`;
    const body = `Hi,\n\nJoin my video meeting room: ${roomId}\n\nClick here to join: ${roomUrl}\n\nSee you there!`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim()) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    const messageData = {
      message: message.trim(),
      type: 'text' as const,
      timestamp: timestamp
    };

    const localMsg: ChatMessage = {
      id: messageId,
      senderId: myId,
      text: message.trim(),
      time: new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'text',
      timestamp: timestamp,
      roomId: roomId
    };

    setMessages(prev => [...prev, localMsg]);
    setMessage("");
    setShowEmojiPicker(false);

    await sendChatMessage(messageData);
  };

  const sendEmoji = async (emoji: string) => {
    const timestamp = Date.now();

    const messageData = {
      message: emoji,
      type: 'emoji' as const,
      timestamp: timestamp
    };

    const localMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: myId,
      text: emoji,
      time: new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'emoji',
      timestamp: timestamp,
      roomId: roomId
    };

    setMessages(prev => [...prev, localMsg]);
    setShowEmojiPicker(false);

    await sendChatMessage(messageData);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Maximum 5MB allowed.");
      return;
    }

    const timestamp = Date.now();

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result as string;
        
        const messageData = {
          message: `File: ${file.name}`,
          type: 'file' as const,
          fileName: file.name,
          fileData: fileData,
          timestamp: timestamp
        };

        const localMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          senderId: myId,
          text: `File: ${file.name}`,
          time: new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: 'file',
          fileName: file.name,
          fileData: fileData,
          timestamp: timestamp,
          roomId: roomId
        };

        setMessages(prev => [...prev, localMsg]);
        
        await sendChatMessage(messageData);
      } catch (error) {
        alert("Failed to process file");
      }
    };

    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadFile = (fileData: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert("Failed to download file");
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear all chat messages?")) {
      setMessages([]);
    }
  };

  // Utility functions
  const getSafeUserName = (userId: string): string => {
    if (!userId) return 'Unknown User';
    return userId === myId ? 'You' : `User ${userId.slice(-4)}`;
  };

  const getSafeUserIdDisplay = (userId: string): string => {
    if (!userId) return 'unknown';
    return userId.length > 8 ? userId.slice(-8) : userId;
  };

  // Polling for chat and users
  useEffect(() => {
    if (!roomId) return;

    const pollData = async () => {
      if (!isOnline) return;
      
      try {
        const [roomUsers, newMessages] = await Promise.all([
          getRoomUsers().catch(() => []),
          getChatMessages().catch(() => [])
        ]);

        setUsers(prev => {
          const prevJson = JSON.stringify(prev.sort());
          const newJson = JSON.stringify(roomUsers.sort());
          return prevJson === newJson ? prev : roomUsers;
        });

        if (newMessages.length > 0) {
          setMessages(prev => {
            const combined = [...prev, ...newMessages];
            const uniqueCombined = combined.filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            );

            return uniqueCombined
              .sort((a, b) => a.timestamp - b.timestamp)
              .slice(-50);
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    pollData();

    // Set up interval
    const interval = setInterval(pollData, 3000);
    pollingRef.current = interval;

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [roomId, isOnline]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize meeting
  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        await joinRoom();
        const roomUsers = await getRoomUsers();
        setUsers(roomUsers);

        const existingMessages = await getChatMessages();
        setMessages(existingMessages);

      } catch (err: any) {
        console.error("Failed to initialize meeting:", err);
      }
    };

    if (roomId) {
      initializeMeeting();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      leaveRoom();
    };
  }, [roomId]);

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] text-[#3A2A1F]">
      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-lg border-b border-[#D7CCC8]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg border border-blue-400">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[#6B4B35] text-sm">
                  Room: <span className="font-mono text-blue-600 font-semibold">{roomId}</span> • 
                  Users: <span className="text-[#5D4037] font-semibold">{users.length}</span>
                </p>
                <p className="text-xs text-blue-600">
                  Your ID: {getSafeUserIdDisplay(myId)} • {isOnline ? '🟢 Online' : '🔴 Offline'}
                  {isVideoCallActive && ' • 📹 Agora Video Call Active'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Share Room Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-green-400"
                title="Share room link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share Room</span>
              </button>

              {/* Video Call Button */}
              <button
                onClick={() => setIsVideoCallActive(!isVideoCallActive)}
                className={`px-6 py-2 font-semibold rounded-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border ${
                  isVideoCallActive
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-400'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{isVideoCallActive ? "End Video Call" : "Start Agora Call"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-5 relative z-10 max-w-7xl mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Video Section */}
          <div className="flex-1">
            {isVideoCallActive ? (
              <VideoCall 
                roomId={roomId} 
                userId={myId}
                onCallEnd={() => setIsVideoCallActive(false)}
              />
            ) : (
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl h-[600px] flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-24 h-24 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-2xl font-semibold mb-2">Agora Video Calling Ready</h3>
                  <p className="text-gray-400">Click "Start Agora Call" to begin your meeting</p>
                  <p className="text-sm text-gray-500 mt-4">
                    Room: {roomId} • Participants: {users.length} • 10,000 free minutes/month
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          {isSidebarOpen && (
            <div className="w-full lg:w-[450px] bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] shadow-2xl">
              {/* Sidebar Header */}
              <div className="border-b border-[#D7CCC8] px-6 py-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === 'chat' 
                          ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white' 
                          : 'text-[#6B4B35] hover:text-[#5D4037] hover:bg-[#8B6B61]/10'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === 'users' 
                          ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white' 
                          : 'text-[#6B4B35] hover:text-[#5D4037] hover:bg-[#8B6B61]/10'
                      }`}
                    >
                      Users ({users.length})
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={clearChat}
                      className="p-2 text-[#8B6B61] hover:text-red-500 transition-colors"
                      title="Clear chat"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="text-[#8B6B61] hover:text-[#5D4037] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="h-[500px] overflow-hidden flex flex-col">
                {activeTab === 'chat' ? (
                  <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center text-[#8B6B61] py-8">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="font-medium">No messages yet in room {roomId}</p>
                          <p className="text-sm mt-1">Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((m) => {
                          const isMe = m.senderId === myId;
                          return (
                            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-xs px-4 py-3 rounded-2xl ${
                                isMe 
                                  ? "bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white rounded-br-none" 
                                  : "bg-[#EFEBE9] text-[#5D4037] rounded-bl-none border border-[#D7CCC8]"
                              }`}>
                                {!isMe && (
                                  <p className="text-xs font-medium text-[#8B6B61] mb-1">
                                    {getSafeUserName(m.senderId)}
                                  </p>
                                )}
                                {m.type === 'emoji' ? (
                                  <div className="text-2xl text-center">{m.text}</div>
                                ) : m.type === 'file' ? (
                                  <div className="flex items-center space-x-3 bg-white/50 rounded-lg p-3">
                                    <div className="text-2xl">📎</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{m.fileName || 'File'}</p>
                                      <button 
                                        onClick={() => m.fileData && downloadFile(m.fileData, m.fileName || 'file')}
                                        className="text-xs text-[#8B6B61] hover:text-[#5D4037] underline mt-1"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm break-words">{m.text}</p>
                                )}
                                <p className={`text-xs mt-2 ${isMe ? "text-[#D7CCC8]" : "text-[#8B6B61]"}`}>
                                  {m.time}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-[#D7CCC8] p-4 bg-white/50">
                      {showEmojiPicker && (
                        <div className="mb-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
                          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                            {commonEmojis.map((emoji, index) => (
                              <button 
                                key={index} 
                                onClick={() => sendEmoji(emoji)} 
                                className="text-xl hover:bg-[#D7CCC8] rounded-lg p-1 transition-colors hover:scale-110"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="p-2 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-lg transition-all duration-200 hover:scale-110 border border-[#D7CCC8]"
                          title="Attach file (Max 5MB)"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          className="hidden" 
                          accept="*/*" 
                        />
                        
                        <button 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                          className="p-2 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-lg transition-all duration-200 hover:scale-110 border border-[#D7CCC8]"
                          title="Add emoji"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        
                        <input 
                          value={message} 
                          onChange={(e) => setMessage(e.target.value)} 
                          onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
                          placeholder={`Type your message in ${roomId}...`} 
                          className="flex-1 bg-white border border-[#D7CCC8] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#8B6B61] focus:border-transparent placeholder-[#8B6B61] text-[#5D4037]"
                          disabled={!isOnline} 
                        />
                        
                        <button 
                          onClick={sendMessage} 
                          disabled={!message.trim() || !isOnline} 
                          className="px-4 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-[#A1887F]"
                        >
                          <span>Send</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Users Tab */
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {users.map((userId) => (
                        <div key={userId} className="flex items-center space-x-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
                          <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <p className="font-medium text-[#5D4037]">
                              {userId === myId ? "You" : getSafeUserName(userId)}
                            </p>
                            <p className="text-xs text-[#8B6B61] font-mono">{getSafeUserIdDisplay(userId)}</p>
                          </div>
                          {userId === myId && (
                            <span className="px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
                              Me
                            </span>
                          )}
                        </div>
                      ))}
                      {users.length === 0 && (
                        <div className="text-center text-[#8B6B61] py-8">
                          <p className="font-medium">No users in room</p>
                          <p className="text-sm mt-1">Waiting for participants to join...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sidebar Toggle Button */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="fixed right-4 top-20 lg:relative lg:right-auto lg:top-auto p-3 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 border border-[#A1887F]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03-8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Share Room Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#D7CCC8] w-full max-w-md">
            <div className="border-b border-[#D7CCC8] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#5D4037]">
                Share Meeting Room
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[#8B6B61] hover:text-[#5D4037] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#5D4037] mb-2">
                  Room ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={roomId}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#EFEBE9] border border-[#D7CCC8] rounded-xl text-[#5D4037] font-medium"
                  />
                  <button
                    onClick={copyRoomLink}
                    className="px-4 py-3 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-xl font-semibold transition-all duration-200"
                  >
                    {copySuccess ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#5D4037] mb-2">
                  Meeting Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={getRoomUrl()}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#EFEBE9] border border-[#D7CCC8] rounded-xl text-[#5D4037] font-medium text-sm"
                  />
                  <button
                    onClick={copyRoomLink}
                    className="px-4 py-3 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-xl font-semibold transition-all duration-200"
                  >
                    {copySuccess ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareRoom}
                  className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>📤</span>
                  <span>Share</span>
                </button>
                
                <button
                  onClick={shareViaWhatsApp}
                  className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
                
                <button
                  onClick={shareViaEmail}
                  className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>📧</span>
                  <span>Email</span>
                </button>
                
                <button
                  onClick={copyRoomLink}
                  className="p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>{copySuccess ? '✅' : '📋'}</span>
                  <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {copySuccess && (
                <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-xl text-center">
                  ✅ Meeting link copied to clipboard!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copy Success Toast */}
      {copySuccess && !showShareModal && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg border border-green-400 animate-in slide-in-from-right z-50">
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span>Meeting link copied to clipboard!</span>
          </div>
        </div>
      )}
    </div>
  );
}

// "use client";

// import React, { useEffect, useRef, useState, useCallback } from "react";

// interface MeetingClientProps {
//   roomId: string;
// }

// interface ChatMessage {
//   id: string;
//   senderId: string;
//   text: string;
//   time: string;
//   type?: 'text' | 'emoji' | 'file';
//   fileName?: string;
//   fileData?: string;
//   timestamp: number;
//   roomId: string;
// }

// interface AudioRecording {
//   id: string;
//   userId: string;
//   userName: string;
//   timestamp: string;
//   duration: string;
//   blobUrl: string;
//   blob: Blob;
//   fileName: string;
//   fileSize: string;
// }

// interface ApiError {
//   message: string;
//   type: 'network' | 'server' | 'permission' | 'media' | 'unknown';
//   retryable: boolean;
// }

// export default function MeetingClient({ roomId }: MeetingClientProps) {
//   // Refs
//   const pcRef = useRef<RTCPeerConnection | null>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);
//   const audioRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordedChunksRef = useRef<Blob[]>([]);
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const pollingRef = useRef<NodeJS.Timeout | null>(null);
//   const retryCountRef = useRef<number>(0);
//   const lastMessageIdRef = useRef<string>('');

//   // States
//   const [myId, setMyId] = useState(`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
//   const [users, setUsers] = useState<string[]>([]);
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [message, setMessage] = useState("");
//   const [isCallStarted, setIsCallStarted] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<ApiError | null>(null);
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordings, setRecordings] = useState<AudioRecording[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [showRecordings, setShowRecordings] = useState(false);
//   const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//   const [isAudioEnabled, setIsAudioEnabled] = useState(true);
//   const [callDuration, setCallDuration] = useState(0);
//   const [isOnline, setIsOnline] = useState(true);
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const [isConnected, setIsConnected] = useState(false);

//   const commonEmojis = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😊', '🙂', '👍', '❤️', '🔥', '🎉', '💯', '👏', '🙏'];

//   // ✅ UPDATED: Improved WebRTC Configuration
//   const rtcConfig: RTCConfiguration = {
//     iceServers: [
//       { urls: "stun:stun.l.google.com:19302" },
//       { urls: "stun:stun1.l.google.com:19302" },
//       { urls: "stun:stun2.l.google.com:19302" },
//       { urls: "stun:stun3.l.google.com:19302" },
//       { urls: "stun:stun4.l.google.com:19302" },
//       { urls: "stun:stun.services.mozilla.com:3478" },
//       { urls: "stun:stun.stunprotocol.org:3478" }
//     ],
//     iceCandidatePoolSize: 10,
//     iceTransportPolicy: 'all',
//     bundlePolicy: 'max-bundle',
//     rtcpMuxPolicy: 'require'
//   };

//   // Error Handler
//   const handleError = useCallback((message: string, type: ApiError['type'] = 'unknown', retryable: boolean = true) => {
//     console.error(`[${type}] ${message}`);
//     setError({ message, type, retryable });
    
//     // Auto-clear non-critical errors after 5 seconds
//     if (type !== 'permission' && type !== 'media') {
//       setTimeout(() => {
//         setError(prev => prev?.message === message ? null : prev);
//       }, 5000);
//     }
//   }, []);

//   // Network status monitoring
//   useEffect(() => {
//     const handleOnline = () => {
//       setIsOnline(true);
//       setError(null);
//     };
    
//     const handleOffline = () => {
//       setIsOnline(false);
//       handleError('You are offline. Please check your internet connection.', 'network', true);
//     };

//     window.addEventListener('online', handleOnline);
//     window.addEventListener('offline', handleOffline);

//     return () => {
//       window.removeEventListener('online', handleOnline);
//       window.removeEventListener('offline', handleOffline);
//     };
//   }, [handleError]);

//   // Format time utility
//   const formatTime = (seconds: number): string => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   // Format file size utility
//   const formatFileSize = (bytes: number): string => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   // Safe user display utilities
//   const getSafeUserName = (userId: string): string => {
//     if (!userId) return 'Unknown User';
//     return userId === myId ? 'You' : `User ${userId.slice(-4)}`;
//   };

//   const getSafeUserIdDisplay = (userId: string): string => {
//     if (!userId) return 'unknown';
//     return userId.length > 8 ? userId.slice(-8) : userId;
//   };

//   // ✅ UPDATED: API Functions with better error handling
//   const apiCall = async (url: string, options: RequestInit = {}) => {
//     if (!isOnline) {
//       throw new Error('No internet connection');
//     }

//     try {
//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), 10000);

//       const requestOptions: RequestInit = {
//         ...options,
//         headers: {
//           'Content-Type': 'application/json',
//           ...options.headers,
//         },
//         signal: controller.signal,
//       };

//       if (options.body && options.method !== 'GET') {
//         requestOptions.body = typeof options.body === 'string' 
//           ? options.body 
//           : JSON.stringify(options.body);
//       }

//       const response = await fetch(url, requestOptions);
//       clearTimeout(timeoutId);

//       if (!response.ok) {
//         let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
//         try {
//           const errorData = await response.json();
//           errorMessage = errorData.error || errorMessage;
//         } catch {
//           const errorText = await response.text();
//           errorMessage = errorText || errorMessage;
//         }
//         throw new Error(errorMessage);
//       }

//       const contentType = response.headers.get('content-type');
//       if (contentType && contentType.includes('application/json')) {
//         return await response.json();
//       } else {
//         return { success: true, message: 'Operation completed successfully' };
//       }
//     } catch (err: any) {
//       if (err.name === 'AbortError') {
//         throw new Error('Request timeout - server is not responding');
//       } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
//         throw new Error('Network error - cannot connect to server');
//       }
//       throw err;
//     }
//   };

//   const checkServerHealth = async (): Promise<boolean> => {
//     try {
//       await apiCall('/api/status');
//       retryCountRef.current = 0;
//       return true;
//     } catch (error: any) {
//       retryCountRef.current++;
//       handleError(
//         `Server connection failed: ${error.message}`,
//         'server',
//         retryCountRef.current < 3
//       );
//       return false;
//     }
//   };

//   const joinRoom = async (): Promise<boolean> => {
//     try {
//       await apiCall('/api/rooms', {
//         method: 'POST',
//         body: JSON.stringify({ 
//           userId: myId, 
//           roomId: roomId, 
//           action: 'join' 
//         })
//       });
//       return true;
//     } catch (error: any) {
//       console.error('Join room error:', error);
//       return false;
//     }
//   };

//   const leaveRoom = async (): Promise<boolean> => {
//     try {
//       await apiCall('/api/rooms', {
//         method: 'POST',
//         body: JSON.stringify({ 
//           userId: myId, 
//           roomId: roomId, 
//           action: 'leave' 
//         })
//       });
//       return true;
//     } catch (error: any) {
//       console.error('Leave room error:', error);
//       return false;
//     }
//   };

//   const getRoomUsers = async (): Promise<string[]> => {
//     try {
//       const data = await apiCall(`/api/rooms?roomId=${encodeURIComponent(roomId)}`);
//       return data.users || [];
//     } catch (error: any) {
//       console.error('Get room users error:', error);
//       return [];
//     }
//   };

//   // ✅ UPDATED: WebRTC Signaling Functions
//   const sendWebRTCSignal = async (type: 'offer' | 'answer' | 'candidate' | 'clear', data: any): Promise<boolean> => {
//     try {
//       await apiCall('/api/webrtc', {
//         method: 'POST',
//         body: JSON.stringify({
//           roomId,
//           type,
//           data,
//           userId: myId
//         })
//       });
//       return true;
//     } catch (error: any) {
//       console.error(`Failed to send ${type}:`, error);
//       return false;
//     }
//   };

//   const getWebRTCSignals = async (type: 'offers' | 'answers' | 'candidates') => {
//     try {
//       const response = await apiCall(`/api/webrtc?roomId=${encodeURIComponent(roomId)}&type=${type}&userId=${encodeURIComponent(myId)}`);
//       return response[type] || [];
//     } catch (error: any) {
//       console.error(`Failed to get ${type}:`, error);
//       return [];
//     }
//   };

//   const sendChatMessage = async (messageData: {
//     message: string;
//     type: 'text' | 'emoji' | 'file';
//     fileName?: string;
//     fileData?: string;
//     timestamp: number;
//   }): Promise<boolean> => {
//     try {
//       const payload = {
//         roomId: roomId,
//         senderId: myId,
//         message: messageData.message,
//         type: messageData.type,
//         fileName: messageData.fileName,
//         fileData: messageData.fileData,
//         timestamp: messageData.timestamp
//       };

//       const response = await apiCall('/api/chat', {
//         method: 'POST',
//         body: JSON.stringify(payload)
//       });

//       if (response.success) {
//         console.log('Message sent successfully:', response.messageId);
//         return true;
//       } else {
//         throw new Error(response.error || 'Failed to send message');
//       }
//     } catch (error: any) {
//       console.error('Send message error:', error);
//       handleError(`Failed to send message: ${error.message}`, 'server', true);
//       return false;
//     }
//   };

//   const getChatMessages = async (): Promise<ChatMessage[]> => {
//     try {
//       const data = await apiCall(`/api/chat?roomId=${encodeURIComponent(roomId)}`);
      
//       if (data.messages && Array.isArray(data.messages)) {
//         return data.messages;
//       } else {
//         console.warn('Invalid response format from chat API:', data);
//         return [];
//       }
//     } catch (error: any) {
//       console.error('Get chat messages error:', error);
//       return [];
//     }
//   };

//   // ✅ UPDATED: Improved WebRTC Peer Connection
//   const createPeerConnection = () => {
//     if (pcRef.current) {
//       pcRef.current.close();
//     }

//     try {
//       pcRef.current = new RTCPeerConnection(rtcConfig);

//       // Add local tracks if available
//       if (localStreamRef.current) {
//         localStreamRef.current.getTracks().forEach(track => {
//           if (localStreamRef.current && pcRef.current) {
//             pcRef.current.addTrack(track, localStreamRef.current);
//           }
//         });
//       }

//       // Handle ICE candidates
//       pcRef.current.onicecandidate = (event) => {
//         if (event.candidate) {
//           console.log("New ICE candidate generated");
//           sendWebRTCSignal('candidate', event.candidate.toJSON());
//         }
//       };

//       // Handle incoming tracks
//       pcRef.current.ontrack = (event) => {
//         console.log("Received remote track:", event.track.kind);
//         if (remoteVideoRef.current && event.streams[0]) {
//           remoteVideoRef.current.srcObject = event.streams[0];
//           setIsConnected(true);
//           setError(null);
//           console.log("Remote stream connected successfully");
//         }
//       };

//       // Connection state handling
//       pcRef.current.onconnectionstatechange = () => {
//         const state = pcRef.current?.connectionState;
//         console.log("Connection state:", state);
        
//         if (state === 'connected') {
//           setIsConnected(true);
//           setError(null);
//         } else if (state === 'disconnected') {
//           setIsConnected(false);
//           handleError("Connection lost. Trying to reconnect...", 'network', true);
//         } else if (state === 'failed') {
//           setIsConnected(false);
//           handleError("Connection failed. Please try again.", 'network', true);
//         }
//       };

//       // ICE connection state
//       pcRef.current.oniceconnectionstatechange = () => {
//         const iceState = pcRef.current?.iceConnectionState;
//         console.log("ICE connection state:", iceState);
//       };

//       console.log("Peer connection created successfully");

//     } catch (err: any) {
//       console.error("Failed to create peer connection:", err);
//       handleError("Failed to create connection: " + err.message, 'media', true);
//     }
//   };

//   // Create and send offer
//   const createAndSendOffer = async () => {
//     if (!pcRef.current) return;

//     try {
//       const offer = await pcRef.current.createOffer({
//         offerToReceiveAudio: true,
//         offerToReceiveVideo: true,
//       });
      
//       await pcRef.current.setLocalDescription(offer);
      
//       // Send offer to signaling server
//       await sendWebRTCSignal('offer', offer);
//       console.log("Offer created and sent successfully");

//     } catch (err: any) {
//       console.error("Error creating offer:", err);
//       handleError("Failed to create offer: " + err.message, 'media', true);
//     }
//   };

//   // Handle incoming offer
//   const handleIncomingOffer = async (offer: RTCSessionDescriptionInit) => {
//     if (!pcRef.current) return;

//     try {
//       await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
//       // Create and send answer
//       const answer = await pcRef.current.createAnswer();
//       await pcRef.current.setLocalDescription(answer);
      
//       await sendWebRTCSignal('answer', answer);
//       console.log("Answer created and sent for incoming offer");

//     } catch (err: any) {
//       console.error("Error handling incoming offer:", err);
//       handleError("Failed to handle incoming offer: " + err.message, 'media', true);
//     }
//   };

//   // Handle incoming answer
//   const handleIncomingAnswer = async (answer: RTCSessionDescriptionInit) => {
//     if (!pcRef.current) return;

//     try {
//       await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
//       console.log("Remote description set successfully from answer");

//     } catch (err: any) {
//       console.error("Error handling incoming answer:", err);
//       handleError("Failed to handle incoming answer: " + err.message, 'media', true);
//     }
//   };

//   // Handle incoming ICE candidate
//   const handleIncomingCandidate = async (candidate: RTCIceCandidateInit) => {
//     if (!pcRef.current) return;

//     try {
//       await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//       console.log("ICE candidate added successfully");

//     } catch (err: any) {
//       console.error("Error adding ICE candidate:", err);
//     }
//   };

//   // WebRTC signaling polling
//   const pollWebRTCSignals = async () => {
//     if (!isCallStarted || !isOnline) return;

//     try {
//       const [offers, answers, candidates] = await Promise.all([
//         getWebRTCSignals('offers'),
//         getWebRTCSignals('answers'),
//         getWebRTCSignals('candidates')
//       ]);

//       // Handle offers
//       for (const offerData of offers) {
//         await handleIncomingOffer(offerData.data);
//       }

//       // Handle answers
//       for (const answerData of answers) {
//         await handleIncomingAnswer(answerData.data);
//       }

//       // Handle candidates
//       for (const candidateData of candidates) {
//         await handleIncomingCandidate(candidateData.data);
//       }

//     } catch (error) {
//       console.error("Error polling WebRTC signals:", error);
//     }
//   };

//   // Polling for chat and users
//   useEffect(() => {
//     if (!roomId) return;

//     let isPolling = false;
//     const processedMessageIds = new Set<string>();

//     const pollData = async () => {
//       if (isPolling || !isOnline) return;
      
//       isPolling = true;
//       try {
//         const [roomUsers, newMessages] = await Promise.all([
//           getRoomUsers().catch(() => []),
//           getChatMessages().catch(() => [])
//         ]);

//         setUsers(prev => {
//           const prevJson = JSON.stringify(prev.sort());
//           const newJson = JSON.stringify(roomUsers.sort());
//           return prevJson === newJson ? prev : roomUsers;
//         });

//         if (newMessages.length > 0) {
//           setMessages(prev => {
//             const uniqueNewMessages = newMessages.filter((msg: ChatMessage) => {
//               if (processedMessageIds.has(msg.id)) {
//                 return false;
//               }
//               processedMessageIds.add(msg.id);
//               return true;
//             });
            
//             if (uniqueNewMessages.length === 0) return prev;

//             const combined = [...prev, ...uniqueNewMessages];
//             const uniqueCombined = combined.filter((msg, index, self) => 
//               index === self.findIndex(m => m.id === msg.id)
//             );

//             return uniqueCombined
//               .sort((a, b) => a.timestamp - b.timestamp)
//               .slice(-50);
//           });
//         }
//       } catch (error) {
//         console.error('Polling error:', error);
//       } finally {
//         isPolling = false;
//       }
//     };

//     // Initial poll
//     pollData();

//     // Set up interval
//     const interval = setInterval(pollData, 3000);
//     pollingRef.current = interval;

//     return () => {
//       if (pollingRef.current) {
//         clearInterval(pollingRef.current);
//       }
//     };
//   }, [roomId, isOnline]);

//   // WebRTC signaling polling
//   useEffect(() => {
//     if (isCallStarted && isOnline) {
//       const interval = setInterval(pollWebRTCSignals, 2000);
//       return () => clearInterval(interval);
//     }
//   }, [isCallStarted, isOnline]);

//   // Call duration timer
//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (isCallStarted) {
//       interval = setInterval(() => {
//         setCallDuration(prev => prev + 1);
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [isCallStarted]);

//   // Load messages and recordings from localStorage
//   useEffect(() => {
//     const savedMessages = localStorage.getItem(`chat_messages_${roomId}`);
//     const savedRecordings = localStorage.getItem(`audio_recordings_${roomId}`);
    
//     if (savedMessages) {
//       try {
//         const parsedMessages = JSON.parse(savedMessages);
//         setMessages(parsedMessages);
        
//         parsedMessages.forEach((msg: ChatMessage) => {
//           lastMessageIdRef.current = msg.id;
//         });
//       } catch (error) {
//         console.error("Error loading saved messages:", error);
//       }
//     }
    
//     if (savedRecordings) {
//       try {
//         setRecordings(JSON.parse(savedRecordings));
//       } catch (error) {
//         console.error("Error loading saved recordings:", error);
//       }
//     }
//   }, [roomId]);

//   // Save messages to localStorage
//   useEffect(() => {
//     localStorage.setItem(`chat_messages_${roomId}`, JSON.stringify(messages));
//   }, [messages, roomId]);

//   // Save recordings to localStorage
//   useEffect(() => {
//     localStorage.setItem(`audio_recordings_${roomId}`, JSON.stringify(recordings));
//   }, [recordings, roomId]);

//   // Recording timer
//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [isRecording]);

//   // Auto scroll chat
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // Initialize meeting
//   useEffect(() => {
//     const initializeMeeting = async () => {
//       try {
//         setIsLoading(true);
        
//         const joined = await joinRoom();
//         if (!joined) {
//           handleError("Failed to join room. Please try again.", 'server', true);
//           setIsLoading(false);
//           return;
//         }

//         const roomUsers = await getRoomUsers();
//         setUsers(roomUsers);

//         const existingMessages = await getChatMessages();
//         setMessages(existingMessages);

//         setError(null);
//         setIsLoading(false);

//       } catch (err: any) {
//         console.error("Failed to initialize meeting:", err);
//         handleError("Connection failed: " + (err.message || 'Unknown error'), 'server', true);
//         setIsLoading(false);
//       }
//     };

//     if (roomId) {
//       initializeMeeting();
//     }

//     return () => {
//       if (pollingRef.current) {
//         clearInterval(pollingRef.current);
//       }
//       leaveRoom();
//       stopMedia();
//     };
//   }, [roomId]);

//   // Media Functions
//   const toggleVideo = () => {
//     if (localStreamRef.current) {
//       const videoTrack = localStreamRef.current.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setIsVideoEnabled(videoTrack.enabled);
//       }
//     }
//   };

//   const toggleAudio = () => {
//     if (localStreamRef.current) {
//       const audioTrack = localStreamRef.current.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         setIsAudioEnabled(audioTrack.enabled);
//       }
//     }
//   };

//   // Audio Recording Functions
//   const startRecording = async () => {
//     try {
//       if (!localStreamRef.current) {
//         handleError("Please start call first to access microphone", 'media', false);
//         return;
//       }

//       if (typeof MediaRecorder === 'undefined') {
//         handleError("Audio recording is not supported in this browser", 'media', false);
//         return;
//       }

//       const audioTracks = localStreamRef.current.getAudioTracks();
//       if (audioTracks.length === 0) {
//         handleError("No microphone access available", 'permission', false);
//         return;
//       }

//       const audioStream = new MediaStream(audioTracks);
//       recordedChunksRef.current = [];

//       const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
//         ? 'audio/webm;codecs=opus' 
//         : 'audio/webm';

//       const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
//       audioRecorderRef.current = mediaRecorder;

//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           recordedChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorder.onstop = () => {
//         if (recordedChunksRef.current.length === 0) {
//           handleError("No audio data recorded", 'media', true);
//           return;
//         }

//         try {
//           const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
//           const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//           const fileName = `recording-${timestamp}.webm`;
//           const audioUrl = URL.createObjectURL(audioBlob);
          
//           const newRecording: AudioRecording = {
//             id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//             userId: myId,
//             userName: 'You',
//             timestamp: new Date().toLocaleString(),
//             duration: formatTime(recordingTime),
//             blobUrl: audioUrl,
//             blob: audioBlob,
//             fileName: fileName,
//             fileSize: formatFileSize(audioBlob.size)
//           };

//           setRecordings(prev => [newRecording, ...prev]);
//           setRecordingTime(0);
//         } catch (err: any) {
//           handleError("Failed to process recording: " + err.message, 'media', true);
//         }
//       };

//       mediaRecorder.onerror = (event) => {
//         console.error("MediaRecorder error:", event);
//         handleError("Recording error occurred", 'media', true);
//         setIsRecording(false);
//       };

//       mediaRecorder.start(1000);
//       setIsRecording(true);
//       setError(null);

//     } catch (err: any) {
//       console.error("Error starting recording:", err);
//       handleError("Recording failed: " + (err.message || 'Unknown error'), 'media', true);
//     }
//   };

//   const stopRecording = () => {
//     if (audioRecorderRef.current && isRecording) {
//       try {
//         audioRecorderRef.current.stop();
//         setIsRecording(false);
//       } catch (err: any) {
//         handleError("Error stopping recording: " + err.message, 'media', true);
//       }
//     }
//   };

//   const downloadRecording = (recording: AudioRecording) => {
//     try {
//       const url = recording.blobUrl;
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = recording.fileName;
//       a.style.display = 'none';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//     } catch (error) {
//       handleError("Failed to download recording", 'unknown', true);
//     }
//   };

//   const deleteRecording = (recordingId: string) => {
//     setRecordings(prev => {
//       const updated = prev.filter(rec => rec.id !== recordingId);
//       const deleted = prev.find(rec => rec.id === recordingId);
//       if (deleted?.blobUrl) {
//         URL.revokeObjectURL(deleted.blobUrl);
//       }
//       return updated;
//     });
//   };

//   const clearAllRecordings = () => {
//     if (window.confirm("Are you sure you want to delete all recordings?")) {
//       recordings.forEach(rec => {
//         if (rec.blobUrl) {
//           URL.revokeObjectURL(rec.blobUrl);
//         }
//       });
//       setRecordings([]);
//     }
//   };

//   // ✅ UPDATED: Improved Media Functions
//   const startMedia = async (): Promise<boolean> => {
//     try {
//       setIsLoading(true);
//       setError(null);

//       if (localStreamRef.current) {
//         stopMedia();
//       }

//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//           frameRate: { ideal: 30 }
//         },
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           channelCount: 1
//         }
//       });
      
//       localStreamRef.current = stream;
      
//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//         localVideoRef.current.play().catch(console.error);
//       }

//       setIsLoading(false);
//       return true;

//     } catch (err: any) {
//       console.error("Error accessing media devices:", err);
      
//       let errorMessage = "Failed to access camera and microphone. ";
//       let errorType: ApiError['type'] = 'media';
      
//       if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
//         errorMessage += "No camera/microphone found or constraints cannot be met.";
//       } else if (err.name === 'NotReadableError') {
//         errorMessage += "Camera/microphone is being used by another application.";
//       } else if (err.name === 'NotAllowedError') {
//         errorMessage += "Permission denied. Please allow camera and microphone access.";
//         errorType = 'permission';
//       } else {
//         errorMessage += `Error: ${err.message || 'Unknown error'}`;
//       }
      
//       handleError(errorMessage, errorType, false);
//       setIsLoading(false);
//       return false;
//     }
//   };

//   // ✅ UPDATED: Improved stopMedia function
//   const stopMedia = () => {
//     if (isRecording) {
//       stopRecording();
//     }

//     // Clear WebRTC data
//     sendWebRTCSignal('clear', {});

//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach(track => {
//         track.stop();
//       });
//       localStreamRef.current = null;
//     }

//     if (pcRef.current) {
//       pcRef.current.close();
//       pcRef.current = null;
//     }

//     if (pollingRef.current) {
//       clearInterval(pollingRef.current);
//       pollingRef.current = null;
//     }

//     setIsVideoEnabled(true);
//     setIsAudioEnabled(true);
//     setIsConnected(false);
//     setIsCallStarted(false);
//   };

//   // ✅ UPDATED: Improved startCall function with WebRTC
//   const startCall = async () => {
//     const mediaSuccess = await startMedia();
//     if (!mediaSuccess) return;

//     try {
//       createPeerConnection();
//       await createAndSendOffer();
      
//       setIsCallStarted(true);
//       console.log("Call started successfully in room:", roomId);

//     } catch (err: any) {
//       console.error("Error starting call:", err);
//       handleError("Failed to start call: " + err.message, 'media', true);
//     }
//   };

//   const leaveCall = () => {
//     stopMedia();
//     setIsCallStarted(false);
//     setCallDuration(0);
//     if (remoteVideoRef.current) {
//       remoteVideoRef.current.srcObject = null;
//     }
//   };

//   // Chat message handling
//   const sendMessage = async () => {
//     if (!message.trim()) return;

//     const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//     const timestamp = Date.now();
    
//     const messageData = {
//       message: message.trim(),
//       type: 'text' as const,
//       timestamp: timestamp
//     };

//     if (lastMessageIdRef.current === messageId) {
//       return;
//     }

//     lastMessageIdRef.current = messageId;

//     const localMsg: ChatMessage = {
//       id: messageId,
//       senderId: myId,
//       text: message.trim(),
//       time: new Date().toLocaleTimeString('en-US', { 
//         hour12: false,
//         hour: '2-digit',
//         minute: '2-digit'
//       }),
//       type: 'text',
//       timestamp: timestamp,
//       roomId: roomId
//     };

//     setMessages(prev => {
//       if (prev.some(msg => msg.id === messageId)) {
//         return prev;
//       }
//       return [...prev, localMsg];
//     });
    
//     setMessage("");
//     setShowEmojiPicker(false);

//     const success = await sendChatMessage(messageData);
    
//     if (!success) {
//       setMessages(prev => prev.filter(msg => msg.id !== messageId));
//       lastMessageIdRef.current = '';
//     }
//   };

//   const sendEmoji = async (emoji: string) => {
//     const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//     const timestamp = Date.now();

//     if (lastMessageIdRef.current === messageId) {
//       return;
//     }

//     lastMessageIdRef.current = messageId;

//     const messageData = {
//       message: emoji,
//       type: 'emoji' as const,
//       timestamp: timestamp
//     };

//     const localMsg: ChatMessage = {
//       id: messageId,
//       senderId: myId,
//       text: emoji,
//       time: new Date().toLocaleTimeString('en-US', { 
//         hour12: false,
//         hour: '2-digit',
//         minute: '2-digit'
//       }),
//       type: 'emoji',
//       timestamp: timestamp,
//       roomId: roomId
//     };

//     setMessages(prev => {
//       if (prev.some(msg => msg.id === messageId)) {
//         return prev;
//       }
//       return [...prev, localMsg];
//     });
    
//     setShowEmojiPicker(false);

//     const success = await sendChatMessage(messageData);
    
//     if (!success) {
//       setMessages(prev => prev.filter(msg => msg.id !== messageId));
//       lastMessageIdRef.current = '';
//     }
//   };

//   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     if (file.size > 5 * 1024 * 1024) {
//       handleError("File size too large. Maximum 5MB allowed.", 'unknown', false);
//       return;
//     }

//     const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//     const timestamp = Date.now();

//     if (lastMessageIdRef.current === messageId) {
//       return;
//     }

//     lastMessageIdRef.current = messageId;

//     const reader = new FileReader();
    
//     reader.onload = async (e) => {
//       try {
//         const fileData = e.target?.result as string;
        
//         const messageData = {
//           message: `File: ${file.name}`,
//           type: 'file' as const,
//           fileName: file.name,
//           fileData: fileData,
//           timestamp: timestamp
//         };

//         const localMsg: ChatMessage = {
//           id: messageId,
//           senderId: myId,
//           text: `File: ${file.name}`,
//           time: new Date().toLocaleTimeString('en-US', { 
//             hour12: false,
//             hour: '2-digit',
//             minute: '2-digit'
//           }),
//           type: 'file',
//           fileName: file.name,
//           fileData: fileData,
//           timestamp: timestamp,
//           roomId: roomId
//         };

//         setMessages(prev => {
//           if (prev.some(msg => msg.id === messageId)) {
//             return prev;
//           }
//           return [...prev, localMsg];
//         });
        
//         const success = await sendChatMessage(messageData);
        
//         if (!success) {
//           setMessages(prev => prev.filter(msg => msg.id !== messageId));
//           lastMessageIdRef.current = '';
//         }
//       } catch (error) {
//         handleError("Failed to process file", 'unknown', true);
//         lastMessageIdRef.current = '';
//       }
//     };

//     reader.onerror = () => {
//       handleError("Failed to read file", 'unknown', true);
//       lastMessageIdRef.current = '';
//     };

//     reader.readAsDataURL(file);

//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   const downloadFile = (fileData: string, fileName: string) => {
//     try {
//       const link = document.createElement('a');
//       link.href = fileData;
//       link.download = fileName;
//       link.style.display = 'none';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     } catch (error) {
//       handleError("Failed to download file", 'unknown', true);
//     }
//   };

//   const clearChat = () => {
//     if (window.confirm("Are you sure you want to clear all chat messages in this room?")) {
//       setMessages([]);
//       lastMessageIdRef.current = '';
//     }
//   };

//   // Render component (same as before)
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] text-[#3A2A1F]">
//       {/* Header */}
//       <div className="relative z-10 bg-white/80 backdrop-blur-lg border-b border-[#D7CCC8]">
//         <div className="max-w-7xl mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className="bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] p-2 rounded-xl shadow-lg border border-[#A1887F]">
//                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-[#6B4B35] text-sm">
//                   Room: <span className="font-mono text-[#8B6B61] font-semibold">{roomId}</span> • 
//                   Users: <span className="text-[#5D4037] font-semibold">{users.length}</span>
//                 </p>
//                 <p className="text-xs text-[#8B6B61]">
//                   Your ID: {getSafeUserIdDisplay(myId)} • {isOnline ? '🟢 Online' : '🔴 Offline'}
//                   {isConnected && ' • 🟢 Connected'}
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center space-x-3">
//               <div className="flex space-x-2">
//                 {isCallStarted ? (
//                   <button
//                     onClick={leaveCall}
//                     className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-red-400"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                     <span>Leave Call</span>
//                   </button>
//                 ) : (
//                   <button
//                     onClick={startCall}
//                     disabled={isLoading || !isOnline}
//                     className="px-6 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center space-x-2 shadow-lg border border-[#A1887F]"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                     </svg>
//                     <span>
//                       {isLoading ? "Connecting..." : 
//                        !isOnline ? "Offline" : "Start Call"}
//                     </span>
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mt-5 relative z-10 max-w-7xl mx-auto p-4">
//         <div className="flex flex-col lg:flex-row gap-6">
//           {/* Video Section */}
//           <div className="flex-1">
//             <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl h-[500px] lg:h-[600px]">
              
//               {/* Remote Video - Main Screen */}
//               <video
//                 ref={remoteVideoRef}
//                 autoPlay
//                 playsInline
//                 muted={false}
//                 className="w-full h-full object-cover"
//               />

//               {/* Connection Status */}
//               {isCallStarted && !isConnected && (
//                 <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
//                   <div className="text-center text-white">
//                     <div className="w-16 h-16 border-4 border-[#8B6B61] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//                     <p className="text-xl font-semibold">Waiting for connection...</p>
//                     <p className="text-gray-400 mt-2">Connecting to other participants</p>
//                   </div>
//                 </div>
//               )}

//               {/* Local Video - Picture-in-Picture */}
//               {isCallStarted && (
//                 <div className="absolute top-4 right-4 w-32 h-48 lg:w-40 lg:h-60 bg-black rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
//                   <video
//                     ref={localVideoRef}
//                     autoPlay
//                     muted
//                     playsInline
//                     className="w-full h-full object-cover"
//                   />
//                   {!isVideoEnabled && (
//                     <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
//                       <div className="text-center text-white">
//                         <svg className="w-8 h-8 mx-auto mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                         </svg>
//                         <span className="text-xs">Camera Off</span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Call Info Overlay */}
//               {isCallStarted && (
//                 <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
//                   <div className="flex items-center space-x-3">
//                     <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
//                     <div>
//                       <p className="text-sm font-medium">
//                         {isConnected ? 'Connected' : 'Connecting'} • Room: {roomId}
//                       </p>
//                       <p className="text-xs text-gray-300">{formatTime(callDuration)}</p>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Control Bar */}
//               {isCallStarted && (
//                 <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                  
//                   {/* Recording Button */}
//                   <button
//                     onClick={isRecording ? stopRecording : startRecording}
//                     disabled={!isAudioEnabled}
//                     className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
//                       isRecording 
//                         ? 'bg-red-500 text-white animate-pulse' 
//                         : 'bg-white/20 text-white hover:bg-white/30 disabled:opacity-50'
//                     }`}
//                     title={isRecording ? "Stop Recording" : "Start Recording"}
//                   >
//                     <div className="w-6 h-6 flex items-center justify-center">
//                       {isRecording ? (
//                         <div className="w-3 h-3 bg-white rounded-sm"></div>
//                       ) : (
//                         <div className="w-4 h-4 bg-red-500 rounded-full"></div>
//                       )}
//                     </div>
//                   </button>

//                   {/* Mute/Unmute Audio */}
//                   <button
//                     onClick={toggleAudio}
//                     className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
//                       isAudioEnabled 
//                         ? 'bg-white/20 text-white hover:bg-white/30' 
//                         : 'bg-red-500 text-white'
//                     }`}
//                     title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
//                   >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       {isAudioEnabled ? (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//                       ) : (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
//                       )}
//                     </svg>
//                   </button>

//                   {/* Video On/Off */}
//                   <button
//                     onClick={toggleVideo}
//                     className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
//                       isVideoEnabled 
//                         ? 'bg-white/20 text-white hover:bg-white/30' 
//                         : 'bg-red-500 text-white'
//                     }`}
//                     title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
//                   >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       {isVideoEnabled ? (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                       ) : (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 014.242 1.226m-8.484 2.094a7.975 7.975 0 010 11.314M3 3l18 18" />
//                       )}
//                     </svg>
//                   </button>

//                   {/* Recordings Button */}
//                   {recordings.length > 0 && (
//                     <button
//                       onClick={() => setShowRecordings(true)}
//                       className="p-3 bg-white/20 text-white rounded-full transition-all duration-200 hover:scale-110 hover:bg-white/30"
//                       title="View Recordings"
//                     >
//                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
//                         <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
//                       </svg>
//                     </button>
//                   )}

//                   {/* End Call Button */}
//                   <button
//                     onClick={leaveCall}
//                     className="p-4 bg-red-500 text-white rounded-full transition-all duration-200 hover:scale-110 hover:bg-red-600"
//                     title="End Call"
//                   >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 </div>
//               )}

//               {/* Recording Indicator */}
//               {isRecording && (
//                 <div className="absolute top-4 right-40 bg-red-500 text-white px-3 py-1 rounded-full flex items-center space-x-2 animate-pulse">
//                   <div className="w-2 h-2 bg-white rounded-full"></div>
//                   <span className="text-sm font-medium">Recording • {formatTime(recordingTime)}</span>
//                 </div>
//               )}

//               {/* Room Info */}
//               {!isCallStarted && (
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <div className="text-center text-white bg-black/50 backdrop-blur-sm px-8 py-6 rounded-2xl">
//                     <svg className="w-16 h-16 mx-auto mb-4 text-[#8B6B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                     </svg>
//                     <h3 className="text-2xl font-semibold mb-2">Ready to Connect</h3>
//                     <p className="text-gray-300">Click "Start Call" to begin your meeting</p>
//                     <p className="text-sm text-gray-400 mt-4">Room: {roomId} • Participants: {users.length}</p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Additional Controls */}
//             {isCallStarted && (
//               <div className="mt-4 bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] p-4 shadow-2xl">
//                 <div className="flex justify-between items-center">
//                   <div className="flex items-center space-x-4">
//                     <div className="flex items-center space-x-2">
//                       <div className={`w-3 h-3 rounded-full ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                       <span className="text-sm text-[#5D4037] font-medium">
//                         {isAudioEnabled ? 'Microphone On' : 'Microphone Off'}
//                       </span>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <div className={`w-3 h-3 rounded-full ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                       <span className="text-sm text-[#5D4037] font-medium">
//                         {isVideoEnabled ? 'Camera On' : 'Camera Off'}
//                       </span>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
//                       <span className="text-sm text-[#5D4037] font-medium">
//                         {isConnected ? 'Connected' : 'Connecting...'}
//                       </span>
//                     </div>
//                   </div>
                  
//                   <div className="text-sm text-[#8B6B61] font-medium">
//                     Call Duration: {formatTime(callDuration)}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Chat Sidebar */}
//           {isSidebarOpen && (
//             <div className="w-full lg:w-[450px] bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] shadow-2xl">
//               {/* Sidebar Header */}
//               <div className="border-b border-[#D7CCC8] px-6 py-4">
//                 <div className="flex justify-between items-center">
//                   <div className="flex space-x-4">
//                     <button
//                       onClick={() => setActiveTab('chat')}
//                       className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
//                         activeTab === 'chat' 
//                           ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white' 
//                           : 'text-[#6B4B35] hover:text-[#5D4037] hover:bg-[#8B6B61]/10'
//                       }`}
//                     >
//                       Chat
//                     </button>
//                     <button
//                       onClick={() => setActiveTab('users')}
//                       className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
//                         activeTab === 'users' 
//                           ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white' 
//                           : 'text-[#6B4B35] hover:text-[#5D4037] hover:bg-[#8B6B61]/10'
//                       }`}
//                     >
//                       Users ({users.length})
//                     </button>
//                   </div>
//                   <div className="flex space-x-2">
//                     <button
//                       onClick={clearChat}
//                       className="p-2 text-[#8B6B61] hover:text-red-500 transition-colors"
//                       title="Clear chat"
//                     >
//                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                       </svg>
//                     </button>
//                     <button
//                       onClick={() => setIsSidebarOpen(false)}
//                       className="text-[#8B6B61] hover:text-[#5D4037] transition-colors"
//                     >
//                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {/* Sidebar Content */}
//               <div className="h-[500px] overflow-hidden flex flex-col">
//                 {activeTab === 'chat' ? (
//                   <>
//                     {/* Chat Messages */}
//                     <div className="flex-1 overflow-y-auto p-4 space-y-3">
//                       {messages.length === 0 ? (
//                         <div className="text-center text-[#8B6B61] py-8">
//                           <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                           </svg>
//                           <p className="font-medium">No messages yet in room {roomId}</p>
//                           <p className="text-sm mt-1">Start the conversation!</p>
//                         </div>
//                       ) : (
//                         messages.map((m) => {
//                           const isMe = m.senderId === myId;
//                           return (
//                             <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
//                               <div className={`max-w-xs px-4 py-3 rounded-2xl ${
//                                 isMe 
//                                   ? "bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white rounded-br-none" 
//                                   : "bg-[#EFEBE9] text-[#5D4037] rounded-bl-none border border-[#D7CCC8]"
//                               }`}>
//                                 {!isMe && (
//                                   <p className="text-xs font-medium text-[#8B6B61] mb-1">
//                                     {getSafeUserName(m.senderId)}
//                                   </p>
//                                 )}
//                                 {m.type === 'emoji' ? (
//                                   <div className="text-2xl text-center">{m.text}</div>
//                                 ) : m.type === 'file' ? (
//                                   <div className="flex items-center space-x-3 bg-white/50 rounded-lg p-3">
//                                     <div className="text-2xl">📎</div>
//                                     <div className="flex-1 min-w-0">
//                                       <p className="text-sm font-medium truncate">{m.fileName || 'File'}</p>
//                                       <button 
//                                         onClick={() => m.fileData && downloadFile(m.fileData, m.fileName || 'file')}
//                                         className="text-xs text-[#8B6B61] hover:text-[#5D4037] underline mt-1"
//                                       >
//                                         Download
//                                       </button>
//                                     </div>
//                                   </div>
//                                 ) : (
//                                   <p className="text-sm break-words">{m.text}</p>
//                                 )}
//                                 <p className={`text-xs mt-2 ${isMe ? "text-[#D7CCC8]" : "text-[#8B6B61]"}`}>
//                                   {m.time}
//                                 </p>
//                               </div>
//                             </div>
//                           );
//                         })
//                       )}
//                       <div ref={chatEndRef} />
//                     </div>

//                     {/* Chat Input */}
//                     <div className="border-t border-[#D7CCC8] p-4 bg-white/50">
//                       {showEmojiPicker && (
//                         <div className="mb-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
//                           <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
//                             {commonEmojis.map((emoji, index) => (
//                               <button 
//                                 key={index} 
//                                 onClick={() => sendEmoji(emoji)} 
//                                 className="text-xl hover:bg-[#D7CCC8] rounded-lg p-1 transition-colors hover:scale-110"
//                               >
//                                 {emoji}
//                               </button>
//                             ))}
//                           </div>
//                         </div>
//                       )}
                      
//                       <div className="flex space-x-2">
//                         <button 
//                           onClick={() => fileInputRef.current?.click()} 
//                           className="p-2 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-lg transition-all duration-200 hover:scale-110 border border-[#D7CCC8]"
//                           title="Attach file (Max 5MB)"
//                         >
//                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
//                           </svg>
//                         </button>
//                         <input 
//                           type="file" 
//                           ref={fileInputRef} 
//                           onChange={handleFileUpload} 
//                           className="hidden" 
//                           accept="*/*" 
//                         />
                        
//                         <button 
//                           onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
//                           className="p-2 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-lg transition-all duration-200 hover:scale-110 border border-[#D7CCC8]"
//                           title="Add emoji"
//                         >
//                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                           </svg>
//                         </button>
                        
//                         <input 
//                           value={message} 
//                           onChange={(e) => setMessage(e.target.value)} 
//                           onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
//                           placeholder={`Type your message in ${roomId}...`} 
//                           className="flex-1 bg-white border border-[#D7CCC8] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#8B6B61] focus:border-transparent placeholder-[#8B6B61] text-[#5D4037]"
//                           disabled={!isOnline} 
//                         />
                        
//                         <button 
//                           onClick={sendMessage} 
//                           disabled={!message.trim() || !isOnline} 
//                           className="px-4 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-[#A1887F]"
//                         >
//                           <span>Send</span>
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
//                           </svg>
//                         </button>
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   /* Users Tab */
//                   <div className="flex-1 overflow-y-auto p-4">
//                     <div className="space-y-3">
//                       {users.map((userId) => (
//                         <div key={userId} className="flex items-center space-x-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
//                           <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
//                           <div className="flex-1">
//                             <p className="font-medium text-[#5D4037]">
//                               {userId === myId ? "You" : getSafeUserName(userId)}
//                             </p>
//                             <p className="text-xs text-[#8B6B61] font-mono">{getSafeUserIdDisplay(userId)}</p>
//                           </div>
//                           {userId === myId && (
//                             <span className="px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
//                               Me
//                             </span>
//                           )}
//                         </div>
//                       ))}
//                       {users.length === 0 && (
//                         <div className="text-center text-[#8B6B61] py-8">
//                           <p className="font-medium">No users in room</p>
//                           <p className="text-sm mt-1">Waiting for participants to join...</p>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Sidebar Toggle Button */}
//           {!isSidebarOpen && (
//             <button
//               onClick={() => setIsSidebarOpen(true)}
//               className="fixed right-4 top-20 lg:relative lg:right-auto lg:top-auto p-3 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 border border-[#A1887F]"
//             >
//               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03-8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//               </svg>
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Recordings Modal */}
//       {showRecordings && (
//         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#D7CCC8] w-full max-w-4xl max-h-[80vh] overflow-hidden">
//             <div className="border-b border-[#D7CCC8] px-6 py-4 flex justify-between items-center">
//               <h2 className="text-xl font-semibold text-[#5D4037]">
//                 Audio Recordings ({recordings.length})
//               </h2>
//               <div className="flex space-x-2">
//                 {recordings.length > 0 && (
//                   <button
//                     onClick={clearAllRecordings}
//                     className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
//                   >
//                     Clear All
//                   </button>
//                 )}
//                 <button
//                   onClick={() => setShowRecordings(false)}
//                   className="px-4 py-2 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-lg font-medium transition-all duration-200 shadow-lg border border-[#A1887F]"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
            
//             <div className="p-6 overflow-y-auto max-h-[60vh]">
//               {recordings.length === 0 ? (
//                 <div className="text-center text-[#8B6B61] py-8">
//                   <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//                   </svg>
//                   <p className="text-lg font-medium">No recordings yet</p>
//                   <p className="text-sm mt-2">Start a call and click "Start Recording" to record audio</p>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {recordings.map((recording) => (
//                     <div key={recording.id} className="bg-[#EFEBE9] rounded-xl p-4 border border-[#D7CCC8]">
//                       <div className="flex justify-between items-start mb-3">
//                         <div className="flex-1">
//                           <h3 className="font-semibold text-[#5D4037]">
//                             {recording.userName} 
//                             {recording.userId === myId && (
//                               <span className="ml-2 px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
//                                 You
//                               </span>
//                             )}
//                           </h3>
//                           <p className="text-sm text-[#8B6B61] mt-1">
//                             {recording.timestamp} • Duration: {recording.duration} • Size: {recording.fileSize}
//                           </p>
//                         </div>
//                         <div className="flex space-x-2">
//                           <audio
//                             controls
//                             className="h-8 bg-white rounded-lg border border-[#D7CCC8]"
//                             src={recording.blobUrl}
//                           >
//                             Your browser does not support the audio element.
//                           </audio>
//                           <button
//                             onClick={() => downloadRecording(recording)}
//                             className="p-2 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-lg"
//                             title="Download"
//                           >
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//                             </svg>
//                           </button>
//                           <button
//                             onClick={() => deleteRecording(recording.id)}
//                             className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-lg"
//                             title="Delete"
//                           >
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Error Toast */}
//       {error && (
//         <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg border border-red-400 max-w-sm animate-in slide-in-from-right z-50">
//           <div className="flex items-center justify-between">
//             <div className="flex-1">
//               <p className="text-sm font-medium">{error.message}</p>
//               {error.retryable && (
//                 <button
//                   onClick={() => window.location.reload()}
//                   className="text-xs underline mt-1 hover:text-red-100"
//                 >
//                   Retry
//                 </button>
//               )}
//             </div>
//             <button
//               onClick={() => setError(null)}
//               className="ml-4 text-white hover:text-red-100 flex-shrink-0"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

//now ye server ki file hai or uper vali without server vali hai



// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import { io, Socket } from "socket.io-client";

// const SERVER_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// interface MeetingClientProps {
//   roomId: string;
// }

// interface ChatMessage {
//   senderId: string;
//   text: string;
//   time: string;
//   type?: 'text' | 'emoji' | 'file';
//   fileName?: string;
//   fileUrl?: string;
//   fileData?: string;
// }

// interface AudioRecording {
//   id: string;
//   userId: string;
//   userName: string;
//   timestamp: string;
//   duration: string;
//   blobUrl: string;
//   blob: Blob;
//   fileName: string;
// }

// export default function MeetingClient({ roomId }: MeetingClientProps) {
//   const socketRef = useRef<Socket | null>(null);
//   const pcRef = useRef<RTCPeerConnection | null>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);
//   const audioRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordedChunksRef = useRef<Blob[]>([]);

//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const [myId, setMyId] = useState("");
//   const [users, setUsers] = useState<string[]>([]);
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [message, setMessage] = useState("");
//   const [isCallStarted, setIsCallStarted] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [cameraPermission, setCameraPermission] = useState<PermissionState | null>(null);
//   const [micPermission, setMicPermission] = useState<PermissionState | null>(null);
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
//   // Audio Recording States
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordings, setRecordings] = useState<AudioRecording[]>([]);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [showRecordings, setShowRecordings] = useState(false);

//   // UI States
//   const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'settings'>('chat');
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//   const [isAudioEnabled, setIsAudioEnabled] = useState(true);
//   const [callDuration, setCallDuration] = useState(0);

//   const rtcConfig: RTCConfiguration = {
//     iceServers: [
//       { urls: "stun:stun.l.google.com:19302" },
//       { urls: "stun:stun1.l.google.com:19302" }
//     ],
//   };

//   const commonEmojis = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😊', '🙂', '👍', '❤️', '🔥', '🎉', '💯', '👏', '🙏'];

//   // Call duration timer
//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (isCallStarted) {
//       interval = setInterval(() => {
//         setCallDuration(prev => prev + 1);
//       }, 1000);
//     } else {
//       setCallDuration(0);
//     }
//     return () => clearInterval(interval);
//   }, [isCallStarted]);

//   // Load messages and recordings from localStorage
//   useEffect(() => {
//     const savedMessages = localStorage.getItem(`chat_messages_${roomId}`);
//     const savedRecordings = localStorage.getItem(`audio_recordings_${roomId}`);
    
//     if (savedMessages) {
//       try {
//         setMessages(JSON.parse(savedMessages));
//       } catch (error) {
//         console.error("Error loading saved messages:", error);
//       }
//     }
//     if (savedRecordings) {
//       try {
//         setRecordings(JSON.parse(savedRecordings));
//       } catch (error) {
//         console.error("Error loading saved recordings:", error);
//       }
//     }
//   }, [roomId]);

//   // Save messages to localStorage
//   useEffect(() => {
//     localStorage.setItem(`chat_messages_${roomId}`, JSON.stringify(messages));
//   }, [messages, roomId]);

//   // Save recordings to localStorage
//   useEffect(() => {
//     localStorage.setItem(`audio_recordings_${roomId}`, JSON.stringify(recordings));
//   }, [recordings, roomId]);

//   // Recording timer
//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (isRecording) {
//       interval = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [isRecording]);

//   // Auto scroll chat
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // Check permissions
//   const checkPermissions = async () => {
//     try {
//       if (navigator.permissions) {
//         const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
//         const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
//         setCameraPermission(cameraPermission.state);
//         setMicPermission(microphonePermission.state);

//         cameraPermission.onchange = () => setCameraPermission(cameraPermission.state);
//         microphonePermission.onchange = () => setMicPermission(microphonePermission.state);
//       }
//     } catch (error) {
//       console.log("Permission API not supported");
//     }
//   };

//   // Socket connection
//   useEffect(() => {
//     const socket = io(SERVER_URL, { 
//       transports: ["websocket", "polling"],
//       timeout: 10000
//     });
//     socketRef.current = socket;

//     socket.on("connect", () => {
//       console.log("Connected to server:", socket.id);
//       setMyId(socket.id);
//       socket.emit("join", { room: roomId });
//       setError("");
//     });

//     socket.on("connect_error", (error) => {
//       console.error("Connection error:", error);
//       setError("Failed to connect to server. Please check if backend is running on port 5000.");
//     });

//     socket.on("roomUsers", (list: string[]) => {
//       console.log("Room users updated:", list);
//       setUsers(list);
//     });

//     socket.on("chatMessage", (msg: ChatMessage) => {
//       if (msg.senderId !== socket.id) {
//         setMessages((prev) => [...prev, msg]);
//       }
//     });

//     socket.on("offer", handleReceiveOffer);
//     socket.on("answer", handleReceiveAnswer);
//     socket.on("candidate", handleReceiveCandidate);

//     checkPermissions();

//     return () => {
//       socket.disconnect();
//       stopMedia();
//       stopRecording();
//     };
//   }, [roomId]);

//   // Toggle Video
//   const toggleVideo = () => {
//     if (localStreamRef.current) {
//       const videoTrack = localStreamRef.current.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setIsVideoEnabled(videoTrack.enabled);
//       }
//     }
//   };

//   // Toggle Audio
//   const toggleAudio = () => {
//     if (localStreamRef.current) {
//       const audioTrack = localStreamRef.current.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         setIsAudioEnabled(audioTrack.enabled);
//       }
//     }
//   };

//   // Format time for display
//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   // Start Audio Recording
//   const startRecording = async () => {
//     try {
//       if (!localStreamRef.current) {
//         setError("Please start call first to access microphone");
//         return;
//       }

//       const audioStream = localStreamRef.current;
//       recordedChunksRef.current = [];

//       let mediaRecorder;
      
//       try {
//         mediaRecorder = new MediaRecorder(audioStream);
//         console.log("MediaRecorder created successfully");
//       } catch (error) {
//         console.error("MediaRecorder creation failed:", error);
//         setError("Audio recording not supported in this browser");
//         return;
//       }

//       audioRecorderRef.current = mediaRecorder;

//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           recordedChunksRef.current.push(event.data);
//           console.log("Recorded chunk:", event.data.size, "bytes");
//         }
//       };

//       mediaRecorder.onstop = () => {
//         if (recordedChunksRef.current.length === 0) {
//           setError("No audio data recorded");
//           return;
//         }

//         const audioBlob = new Blob(recordedChunksRef.current, { 
//           type: 'audio/webm'
//         });
        
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//         const fileName = `recording-${timestamp}.webm`;
        
//         const audioUrl = URL.createObjectURL(audioBlob);
        
//         const newRecording: AudioRecording = {
//           id: Date.now().toString(),
//           userId: myId,
//           userName: 'You',
//           timestamp: new Date().toLocaleString(),
//           duration: formatTime(recordingTime),
//           blobUrl: audioUrl,
//           blob: audioBlob,
//           fileName: fileName
//         };

//         setRecordings(prev => [newRecording, ...prev]);
//         setRecordingTime(0);
//         console.log("Recording saved successfully");
//       };

//       mediaRecorder.onerror = (event) => {
//         console.error("MediaRecorder error:", event);
//         setError("Recording error occurred");
//         setIsRecording(false);
//       };

//       try {
//         mediaRecorder.start();
//         setIsRecording(true);
//         setError("");
//         console.log("Recording started successfully");
//       } catch (startError) {
//         console.error("Error starting MediaRecorder:", startError);
//         setError("Failed to start recording. Please try again.");
//       }

//     } catch (err: any) {
//       console.error("Error starting recording:", err);
//       setError("Recording failed: " + err.message);
//     }
//   };

//   // Stop Audio Recording
//   const stopRecording = () => {
//     if (audioRecorderRef.current && isRecording) {
//       audioRecorderRef.current.stop();
//       setIsRecording(false);
//       console.log("Recording stopped");
//     }
//   };

//   // Download recording
//   const downloadRecording = (recording: AudioRecording) => {
//     try {
//       const url = recording.blobUrl;
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = recording.fileName;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       console.log("Download started:", recording.fileName);
//     } catch (error) {
//       console.error("Download error:", error);
//       setError("Failed to download recording");
//     }
//   };

//   // Delete recording
//   const deleteRecording = (recordingId: string) => {
//     setRecordings(prev => {
//       const updated = prev.filter(rec => rec.id !== recordingId);
//       const deleted = prev.find(rec => rec.id === recordingId);
//       if (deleted?.blobUrl) {
//         URL.revokeObjectURL(deleted.blobUrl);
//       }
//       return updated;
//     });
//   };

//   // Clear all recordings
//   const clearAllRecordings = () => {
//     if (window.confirm("Are you sure you want to delete all recordings?")) {
//       recordings.forEach(rec => {
//         if (rec.blobUrl) {
//           URL.revokeObjectURL(rec.blobUrl);
//         }
//       });
//       setRecordings([]);
//     }
//   };

//   // Check recording compatibility
//   const checkRecordingCompatibility = () => {
//     if (typeof MediaRecorder === 'undefined') {
//       return {
//         supported: false,
//         message: "Audio recording not supported in this browser."
//       };
//     }

//     return { supported: true, message: "" };
//   };

//   const stopMedia = () => {
//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach(track => {
//         track.stop();
//       });
//       localStreamRef.current = null;
//     }
//     if (pcRef.current) {
//       pcRef.current.close();
//       pcRef.current = null;
//     }
//     if (isRecording) {
//       stopRecording();
//     }
//     setIsVideoEnabled(true);
//     setIsAudioEnabled(true);
//   };

//   const startMedia = async (): Promise<boolean> => {
//     try {
//       setIsLoading(true);
//       setError("");

//       if (localStreamRef.current) {
//         stopMedia();
//       }

//       console.log("Requesting media devices...");

//       const constraints = {
//         video: {
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//           frameRate: { ideal: 30 }
//         },
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           channelCount: 1
//         }
//       };

//       const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
//       console.log("Media access granted");

//       localStreamRef.current = stream;
      
//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//         localVideoRef.current.play().catch(console.error);
//       }

//       setCameraPermission('granted');
//       setMicPermission('granted');

//       createPeerConnection();
      
//       stream.getTracks().forEach(track => {
//         pcRef.current?.addTrack(track, stream);
//       });

//       setIsLoading(false);
//       return true;

//     } catch (err: any) {
//       console.error("Error accessing media devices:", err);
      
//       let errorMessage = "Failed to access camera and microphone. ";
      
//       if (err.name === 'NotFoundError') {
//         errorMessage += "No camera/microphone found.";
//       } else if (err.name === 'NotReadableError') {
//         errorMessage += "Camera/microphone is being used by another application.";
//       } else if (err.name === 'NotAllowedError') {
//         errorMessage += "Permission denied. Please allow camera and microphone access.";
//       } else {
//         errorMessage += `Error: ${err.message}`;
//       }
      
//       setError(errorMessage);
//       setIsLoading(false);
//       return false;
//     }
//   };

//   const createPeerConnection = () => {
//     if (pcRef.current) return;

//     pcRef.current = new RTCPeerConnection(rtcConfig);

//     pcRef.current.onicecandidate = (event) => {
//       if (event.candidate) {
//         socketRef.current?.emit("candidate", {
//           room: roomId,
//           candidate: event.candidate,
//         });
//       }
//     };

//     pcRef.current.ontrack = (event) => {
//       if (remoteVideoRef.current) {
//         remoteVideoRef.current.srcObject = event.streams[0];
//       }
//     };

//     pcRef.current.onconnectionstatechange = () => {
//       console.log("Connection state:", pcRef.current?.connectionState);
//     };
//   };

//   const startCall = async () => {
//     if (!socketRef.current?.connected) {
//       setError("Not connected to server. Please check backend.");
//       return;
//     }

//     console.log("Starting call...");
//     const mediaSuccess = await startMedia();
//     if (!mediaSuccess) return;

//     try {
//       if (!pcRef.current) {
//         createPeerConnection();
//       }

//       const offer = await pcRef.current!.createOffer({
//         offerToReceiveAudio: true,
//         offerToReceiveVideo: true,
//       });
      
//       await pcRef.current!.setLocalDescription(offer);

//       socketRef.current.emit("offer", { 
//         room: roomId, 
//         sdp: offer 
//       });

//       setIsCallStarted(true);
//       console.log("Call started");

//     } catch (err) {
//       console.error("Error starting call:", err);
//       setError("Failed to start call");
//     }
//   };

//   const handleReceiveOffer = async (data: any) => {
//     console.log("Received offer from:", data.senderId);
    
//     const mediaSuccess = await startMedia();
//     if (!mediaSuccess) return;

//     try {
//       await pcRef.current!.setRemoteDescription(
//         new RTCSessionDescription(data.sdp)
//       );

//       const answer = await pcRef.current!.createAnswer();
//       await pcRef.current!.setLocalDescription(answer);

//       socketRef.current?.emit("answer", { 
//         room: roomId, 
//         sdp: answer 
//       });

//       setIsCallStarted(true);
//     } catch (err) {
//       console.error("Error handling offer:", err);
//       setError("Failed to handle incoming call");
//     }
//   };

//   const handleReceiveAnswer = async (data: any) => {
//     console.log("Received answer from:", data.senderId);
//     try {
//       await pcRef.current!.setRemoteDescription(
//         new RTCSessionDescription(data.sdp)
//       );
//     } catch (err) {
//       console.error("Error handling answer:", err);
//     }
//   };

//   const handleReceiveCandidate = async (data: any) => {
//     try {
//       await pcRef.current!.addIceCandidate(
//         new RTCIceCandidate(data.candidate)
//       );
//     } catch (err) {
//       console.error("Error adding ICE candidate:", err);
//     }
//   };

//   const sendMessage = () => {
//     if (!message.trim() || !socketRef.current?.connected) return;

//     const msg: ChatMessage = {
//       senderId: myId,
//       text: message,
//       time: new Date().toLocaleTimeString('en-US', { 
//         hour12: false,
//         hour: '2-digit',
//         minute: '2-digit'
//       }),
//       type: 'text'
//     };

//     setMessages((prev) => [...prev, msg]);
    
//     socketRef.current.emit("chatMessage", {
//       room: roomId,
//       text: message,
//       type: 'text'
//     });

//     setMessage("");
//     setShowEmojiPicker(false);
//   };

//   const sendEmoji = (emoji: string) => {
//     if (!socketRef.current?.connected) return;

//     const msg: ChatMessage = {
//       senderId: myId,
//       text: emoji,
//       time: new Date().toLocaleTimeString('en-US', { 
//         hour12: false,
//         hour: '2-digit',
//         minute: '2-digit'
//       }),
//       type: 'emoji'
//     };

//     setMessages((prev) => [...prev, msg]);
    
//     socketRef.current.emit("chatMessage", {
//       room: roomId,
//       text: emoji,
//       type: 'emoji'
//     });

//     setShowEmojiPicker(false);
//   };

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file || !socketRef.current?.connected) return;

//     if (file.size > 5 * 1024 * 1024) {
//       setError("File size too large. Maximum 5MB allowed.");
//       return;
//     }

//     const reader = new FileReader();
    
//     reader.onload = (e) => {
//       const fileData = e.target?.result as string;
      
//       const msg: ChatMessage = {
//         senderId: myId,
//         text: `File: ${file.name}`,
//         time: new Date().toLocaleTimeString('en-US', { 
//           hour12: false,
//           hour: '2-digit',
//           minute: '2-digit'
//         }),
//         type: 'file',
//         fileName: file.name,
//         fileData: fileData
//       };

//       setMessages((prev) => [...prev, msg]);
      
//       socketRef.current.emit("chatMessage", {
//         room: roomId,
//         text: `File: ${file.name}`,
//         type: 'file',
//         fileName: file.name,
//         fileData: fileData
//       });
//     };

//     reader.onerror = () => {
//       setError("Failed to read file");
//     };

//     reader.readAsDataURL(file);

//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   const leaveCall = () => {
//     stopMedia();
//     setIsCallStarted(false);
//     if (remoteVideoRef.current) {
//       remoteVideoRef.current.srcObject = null;
//     }
//   };

//   const testMedia = async () => {
//     try {
//       setError("Testing media devices...");
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       if (stream) {
//         setError("Camera and microphone are working! Now try Start Call.");
//         stream.getTracks().forEach(track => track.stop());
//       }
//     } catch (err: any) {
//       setError("Test failed: " + err.message);
//     }
//   };

//   const downloadFile = (fileData: string, fileName: string) => {
//     try {
//       const link = document.createElement('a');
//       link.href = fileData;
//       link.download = fileName;
//       link.click();
//     } catch (error) {
//       setError("Failed to download file");
//     }
//   };

//   const clearChat = () => {
//     if (window.confirm("Are you sure you want to clear all chat messages?")) {
//       setMessages([]);
//       localStorage.removeItem(`chat_messages_${roomId}`);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] text-[#3A2A1F]">
//       {/* Background Elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl animate-float"></div>
//         <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl animate-float-reverse"></div>
//         <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
//       </div>

//       {/* Header */}
//       <div className="relative z-10 bg-white/80 backdrop-blur-lg border-b border-[#D7CCC8]">
//         <div className="max-w-7xl mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className="bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] p-2 rounded-xl shadow-lg border border-[#A1887F]">
//                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-[#6B4B35] text-sm">
//                   Room: <span className="font-mono text-[#8B6B61] font-semibold">{roomId}</span> • 
//                   Users: <span className="text-[#5D4037] font-semibold">{users.length}</span>
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center space-x-3">
//               {/* Status Indicators */}
//               <div className="flex items-center space-x-4 text-sm">
//                 <div className={`flex items-center space-x-1 ${cameraPermission === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
//                   <div className={`w-2 h-2 rounded-full ${cameraPermission === 'granted' ? 'bg-green-600' : 'bg-red-600'}`}></div>
//                   <span>Camera</span>
//                 </div>
//                 <div className={`flex items-center space-x-1 ${micPermission === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
//                   <div className={`w-2 h-2 rounded-full ${micPermission === 'granted' ? 'bg-green-600' : 'bg-red-600'}`}></div>
//                   <span>Microphone</span>
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="flex space-x-2">
//                 <button
//                   onClick={testMedia}
//                   className="px-4 py-2 bg-white hover:bg-[#8B6B61]/10 text-[#5D4037] font-medium rounded-xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-200 hover:scale-105 shadow-lg"
//                 >
//                   Test Media
//                 </button>

//                 {isCallStarted ? (
//                   <button
//                     onClick={leaveCall}
//                     className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-red-400"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                     <span>Leave Call</span>
//                   </button>
//                 ) : (
//                   <button
//                     onClick={startCall}
//                     disabled={isLoading}
//                     className="px-6 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center space-x-2 shadow-lg border border-[#A1887F]"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                     </svg>
//                     <span>{isLoading ? "Connecting..." : "Start Call"}</span>
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mt-5 relative z-10 max-w-7xl mx-auto p-4">
//         <div className="flex flex-col lg:flex-row gap-6">
//           {/* Video Section - WhatsApp Style */}
//           <div className="flex-1">
//             <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl h-[500px] lg:h-[600px]">
              
//               {/* Remote Video - Main Screen */}
//               <video
//                 ref={remoteVideoRef}
//                 autoPlay
//                 playsInline
//                 className="w-full h-full object-cover"
//               />

//               {/* Local Video - Picture-in-Picture */}
//               <div className="absolute top-4 right-4 w-32 h-48 lg:w-40 lg:h-60 bg-black rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
//                 <video
//                   ref={localVideoRef}
//                   autoPlay
//                   muted
//                   playsInline
//                   className="w-full h-full object-cover"
//                 />
//                 {!isVideoEnabled && (
//                   <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
//                     <div className="text-center text-white">
//                       <svg className="w-8 h-8 mx-auto mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                       </svg>
//                       <span className="text-xs">Camera Off</span>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Call Info Overlay */}
//               {isCallStarted && (
//                 <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
//                   <div className="flex items-center space-x-3">
//                     <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
//                     <div>
//                       <p className="text-sm font-medium">Connected</p>
//                       <p className="text-xs text-gray-300">{formatTime(callDuration)}</p>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* User Info Overlay */}
//               <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
//                 <h3 className="text-white text-lg font-semibold bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl">
//                   {isCallStarted ? "Connected" : "Waiting to connect..."}
//                 </h3>
//                 {isCallStarted && (
//                   <p className="text-white/80 text-sm mt-1 bg-black/30 px-3 py-1 rounded-full">
//                     {users.length} participant{users.length !== 1 ? 's' : ''}
//                   </p>
//                 )}
//               </div>

//               {/* Control Bar - WhatsApp Style */}
//               <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                
//                 {/* Recording Button */}
//                 {isCallStarted && (
//                   <button
//                     onClick={() => {
//                       if (!isRecording) {
//                         const compatibility = checkRecordingCompatibility();
//                         if (!compatibility.supported) {
//                           setError(compatibility.message);
//                           return;
//                         }
//                         startRecording();
//                       } else {
//                         stopRecording();
//                       }
//                     }}
//                     className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
//                       isRecording 
//                         ? 'bg-red-500 text-white animate-pulse' 
//                         : 'bg-white/20 text-white hover:bg-white/30'
//                     }`}
//                     title={isRecording ? "Stop Recording" : "Start Recording"}
//                   >
//                     <div className="w-6 h-6 flex items-center justify-center">
//                       {isRecording ? (
//                         <div className="w-3 h-3 bg-white rounded-sm"></div>
//                       ) : (
//                         <div className="w-4 h-4 bg-red-500 rounded-full"></div>
//                       )}
//                     </div>
//                   </button>
//                 )}

//                 {/* Mute/Unmute Audio */}
//                 {isCallStarted && (
//                   <button
//                     onClick={toggleAudio}
//                     className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
//                       isAudioEnabled 
//                         ? 'bg-white/20 text-white hover:bg-white/30' 
//                         : 'bg-red-500 text-white'
//                     }`}
//                     title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
//                   >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       {isAudioEnabled ? (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//                       ) : (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
//                       )}
//                     </svg>
//                   </button>
//                 )}

//                 {/* Video On/Off */}
//                 {isCallStarted && (
//                   <button
//                     onClick={toggleVideo}
//                     className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
//                       isVideoEnabled 
//                         ? 'bg-white/20 text-white hover:bg-white/30' 
//                         : 'bg-red-500 text-white'
//                     }`}
//                     title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
//                   >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       {isVideoEnabled ? (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                       ) : (
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 014.242 1.226m-8.484 2.094a7.975 7.975 0 010 11.314M3 3l18 18" />
//                       )}
//                     </svg>
//                   </button>
//                 )}

//                 {/* End Call Button */}
//                 {isCallStarted && (
//                   <button
//                     onClick={leaveCall}
//                     className="p-4 bg-red-500 text-white rounded-full transition-all duration-200 hover:scale-110 hover:bg-red-600 transform rotate-135"
//                     title="End Call"
//                   >
//                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 )}

//                 {/* Recordings Button */}
//                 {isCallStarted && (
//                   <button
//                     onClick={() => setShowRecordings(true)}
//                     className="p-3 bg-white/20 text-white rounded-full transition-all duration-200 hover:scale-110 hover:bg-white/30"
//                     title="View Recordings"
//                   >
//                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
//                       <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
//                     </svg>
//                   </button>
//                 )}
//               </div>

//               {/* Recording Indicator */}
//               {isRecording && (
//                 <div className="absolute top-4 right-40 bg-red-500 text-white px-3 py-1 rounded-full flex items-center space-x-2 animate-pulse">
//                   <div className="w-2 h-2 bg-white rounded-full"></div>
//                   <span className="text-sm font-medium">Recording • {formatTime(recordingTime)}</span>
//                 </div>
//               )}
//             </div>

//             {/* Additional Controls */}
//             {isCallStarted && (
//               <div className="mt-4 bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] p-4 shadow-2xl">
//                 <div className="flex justify-between items-center">
//                   <div className="flex items-center space-x-4">
//                     <div className="flex items-center space-x-2">
//                       <div className={`w-3 h-3 rounded-full ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                       <span className="text-sm text-[#5D4037] font-medium">
//                         {isAudioEnabled ? 'Microphone On' : 'Microphone Off'}
//                       </span>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <div className={`w-3 h-3 rounded-full ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                       <span className="text-sm text-[#5D4037] font-medium">
//                         {isVideoEnabled ? 'Camera On' : 'Camera Off'}
//                       </span>
//                     </div>
//                   </div>
                  
//                   <div className="text-sm text-[#8B6B61] font-medium">
//                     Call Duration: {formatTime(callDuration)}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Chat Sidebar */}
//           {isSidebarOpen && (
//             <div className="w-full lg:w-[450px] xl:w-[500px] bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] shadow-2xl">
//               {/* Sidebar Header */}
//               <div className="border-b border-[#D7CCC8] px-6 py-4">
//                 <div className="flex justify-between items-center">
//                   <div className="flex space-x-4">
//                     <button
//                       onClick={() => setActiveTab('chat')}
//                       className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
//                         activeTab === 'chat' 
//                           ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white' 
//                           : 'text-[#6B4B35] hover:text-[#5D4037] hover:bg-[#8B6B61]/10'
//                       }`}
//                     >
//                       Chat
//                     </button>
//                     <button
//                       onClick={() => setActiveTab('users')}
//                       className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
//                         activeTab === 'users' 
//                           ? 'bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white' 
//                           : 'text-[#6B4B35] hover:text-[#5D4037] hover:bg-[#8B6B61]/10'
//                       }`}
//                     >
//                       Users ({users.length})
//                     </button>
//                   </div>
//                   <button
//                     onClick={() => setIsSidebarOpen(false)}
//                     className="text-[#8B6B61] hover:text-[#5D4037] transition-colors"
//                   >
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>

//               {/* Sidebar Content */}
//               <div className="h-[500px] overflow-hidden flex flex-col">
//                 {activeTab === 'chat' ? (
//                   <>
//                     {/* Chat Messages */}
//                     <div className="flex-1 overflow-y-auto p-4 space-y-3">
//                       {messages.length === 0 ? (
//                         <div className="text-center text-[#8B6B61] py-8">
//                           <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                           </svg>
//                           <p className="font-medium">No messages yet</p>
//                           <p className="text-sm mt-1">Start the conversation!</p>
//                         </div>
//                       ) : (
//                         messages.map((m, i) => {
//                           const isMe = m.senderId === myId;
//                           return (
//                             <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
//                               <div className={`max-w-xs px-4 py-3 rounded-2xl ${
//                                 isMe 
//                                   ? "bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white rounded-br-none" 
//                                   : "bg-[#EFEBE9] text-[#5D4037] rounded-bl-none border border-[#D7CCC8]"
//                               }`}>
//                                 {!isMe && (
//                                   <p className="text-xs font-medium text-[#8B6B61] mb-1">
//                                     User {m.senderId.slice(-4)}
//                                   </p>
//                                 )}
//                                 {m.type === 'emoji' ? (
//                                   <div className="text-2xl text-center">{m.text}</div>
//                                 ) : m.type === 'file' ? (
//                                   <div className="flex items-center space-x-3 bg-white/50 rounded-lg p-3">
//                                     <div className="text-2xl">📎</div>
//                                     <div className="flex-1 min-w-0">
//                                       <p className="text-sm font-medium truncate">{m.fileName}</p>
//                                       <button 
//                                         onClick={() => m.fileData && downloadFile(m.fileData, m.fileName || 'file')}
//                                         className="text-xs text-[#8B6B61] hover:text-[#5D4037] underline mt-1"
//                                       >
//                                         Download
//                                       </button>
//                                     </div>
//                                   </div>
//                                 ) : (
//                                   <p className="text-sm">{m.text}</p>
//                                 )}
//                                 <p className={`text-xs mt-2 ${isMe ? "text-[#D7CCC8]" : "text-[#8B6B61]"}`}>
//                                   {m.time}
//                                 </p>
//                               </div>
//                             </div>
//                           );
//                         })
//                       )}
//                       <div ref={chatEndRef} />
//                     </div>

//                     {/* Chat Input */}
//                     <div className="border-t border-[#D7CCC8] p-4 bg-white/50">
//                       {showEmojiPicker && (
//                         <div className="mb-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
//                           <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
//                             {commonEmojis.map((emoji, index) => (
//                               <button 
//                                 key={index} 
//                                 onClick={() => sendEmoji(emoji)} 
//                                 className="text-xl hover:bg-[#D7CCC8] rounded-lg p-1 transition-colors hover:scale-110"
//                               >
//                                 {emoji}
//                               </button>
//                             ))}
//                           </div>
//                         </div>
//                       )}
                      
//                       <div className="flex space-x-2">
//                         <button 
//                           onClick={() => fileInputRef.current?.click()} 
//                           className="p-2 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-lg transition-all duration-200 hover:scale-110 border border-[#D7CCC8]"
//                           title="Attach file (Max 5MB)"
//                         >
//                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
//                           </svg>
//                         </button>
//                         <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />
                        
//                         <button 
//                           onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
//                           className="p-2 bg-[#EFEBE9] hover:bg-[#D7CCC8] text-[#5D4037] rounded-lg transition-all duration-200 hover:scale-110 border border-[#D7CCC8]"
//                           title="Add emoji"
//                         >
//                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                           </svg>
//                         </button>
                        
//                         <input 
//                           value={message} 
//                           onChange={(e) => setMessage(e.target.value)} 
//                           onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
//                           placeholder="Type your message..." 
//                           className="flex-1 bg-white border border-[#D7CCC8] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#8B6B61] focus:border-transparent placeholder-[#8B6B61] text-[#5D4037]"
//                           disabled={!socketRef.current?.connected} 
//                         />
                        
//                         <button 
//                           onClick={sendMessage} 
//                           disabled={!message.trim() || !socketRef.current?.connected} 
//                           className="px-4 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-[#A1887F]"
//                         >
//                           <span>Send</span>
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
//                           </svg>
//                         </button>
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   /* Users Tab */
//                   <div className="flex-1 overflow-y-auto p-4">
//                     <div className="space-y-3">
//                       {users.map((userId, index) => (
//                         <div key={userId} className="flex items-center space-x-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
//                           <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
//                           <div className="flex-1">
//                             <p className="font-medium text-[#5D4037]">
//                               {userId === myId ? "You" : `User ${userId.slice(-4)}`}
//                             </p>
//                             <p className="text-xs text-[#8B6B61] font-mono">{userId}</p>
//                           </div>
//                           {userId === myId && (
//                             <span className="px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
//                               Me
//                             </span>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Sidebar Toggle Button */}
//           {!isSidebarOpen && (
//             <button
//               onClick={() => setIsSidebarOpen(true)}
//               className="fixed right-4 top-20 lg:relative lg:right-auto lg:top-auto p-3 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 border border-[#A1887F]"
//             >
//               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//               </svg>
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Recordings Modal */}
//       {showRecordings && (
//         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#D7CCC8] w-full max-w-4xl max-h-[80vh] overflow-hidden">
//             <div className="border-b border-[#D7CCC8] px-6 py-4 flex justify-between items-center">
//               <h2 className="text-xl font-semibold text-[#5D4037]">
//                 Audio Recordings ({recordings.length})
//               </h2>
//               <div className="flex space-x-2">
//                 {recordings.length > 0 && (
//                   <button
//                     onClick={clearAllRecordings}
//                     className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
//                   >
//                     Clear All
//                   </button>
//                 )}
//                 <button
//                   onClick={() => setShowRecordings(false)}
//                   className="px-4 py-2 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-lg font-medium transition-all duration-200 shadow-lg border border-[#A1887F]"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
            
//             <div className="p-6 overflow-y-auto max-h-[60vh]">
//               {recordings.length === 0 ? (
//                 <div className="text-center text-[#8B6B61] py-8">
//                   <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//                   </svg>
//                   <p className="text-lg font-medium">No recordings yet</p>
//                   <p className="text-sm mt-2">Start a call and click "Start Recording" to record audio</p>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {recordings.map((recording) => (
//                     <div key={recording.id} className="bg-[#EFEBE9] rounded-xl p-4 border border-[#D7CCC8]">
//                       <div className="flex justify-between items-start mb-3">
//                         <div className="flex-1">
//                           <h3 className="font-semibold text-[#5D4037]">
//                             {recording.userName} 
//                             {recording.userId === myId && (
//                               <span className="ml-2 px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
//                                 You
//                               </span>
//                             )}
//                           </h3>
//                           <p className="text-sm text-[#8B6B61] mt-1">
//                             {recording.timestamp} • Duration: {recording.duration}
//                           </p>
//                         </div>
//                         <div className="flex space-x-2">
//                           <audio
//                             controls
//                             className="h-8 bg-white rounded-lg border border-[#D7CCC8]"
//                             src={recording.blobUrl}
//                           >
//                             Your browser does not support the audio element.
//                           </audio>
//                           <button
//                             onClick={() => downloadRecording(recording)}
//                             className="p-2 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-lg"
//                             title="Download"
//                           >
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//                             </svg>
//                           </button>
//                           <button
//                             onClick={() => deleteRecording(recording.id)}
//                             className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-lg"
//                             title="Delete"
//                           >
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Error Toast */}
//       {error && (
//         <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg border border-red-400 max-w-sm animate-in slide-in-from-right">
//           <div className="flex items-center justify-between">
//             <p className="text-sm">{error}</p>
//             <button
//               onClick={() => setError("")}
//               className="ml-4 text-white hover:text-red-100"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }