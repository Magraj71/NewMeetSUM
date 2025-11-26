"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:5000";

interface MeetingClientProps {
  roomId: string;
}

interface ChatMessage {
  senderId: string;
  text: string;
  time: string;
  type?: 'text' | 'emoji' | 'file';
  fileName?: string;
  fileUrl?: string;
  fileData?: string;
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
}

export default function MeetingClient({ roomId }: MeetingClientProps) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myId, setMyId] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraPermission, setCameraPermission] = useState<PermissionState | null>(null);
  const [micPermission, setMicPermission] = useState<PermissionState | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRecordings, setShowRecordings] = useState(false);

  // UI States
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'settings'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ],
  };

  const commonEmojis = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😊', '🙂', '👍', '❤️', '🔥', '🎉', '💯', '👏', '🙏'];

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallStarted) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallStarted]);

  // Load messages and recordings from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_messages_${roomId}`);
    const savedRecordings = localStorage.getItem(`audio_recordings_${roomId}`);
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error("Error loading saved messages:", error);
      }
    }
    if (savedRecordings) {
      try {
        setRecordings(JSON.parse(savedRecordings));
      } catch (error) {
        console.error("Error loading saved recordings:", error);
      }
    }
  }, [roomId]);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(`chat_messages_${roomId}`, JSON.stringify(messages));
  }, [messages, roomId]);

  // Save recordings to localStorage
  useEffect(() => {
    localStorage.setItem(`audio_recordings_${roomId}`, JSON.stringify(recordings));
  }, [recordings, roomId]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check permissions
  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        setCameraPermission(cameraPermission.state);
        setMicPermission(microphonePermission.state);

        cameraPermission.onchange = () => setCameraPermission(cameraPermission.state);
        microphonePermission.onchange = () => setMicPermission(microphonePermission.state);
      }
    } catch (error) {
      console.log("Permission API not supported");
    }
  };

  // Socket connection
  useEffect(() => {
    const socket = io(SERVER_URL, { 
      transports: ["websocket", "polling"],
      timeout: 10000
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      setMyId(socket.id);
      socket.emit("join", { room: roomId });
      setError("");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError("Failed to connect to server. Please check if backend is running on port 5000.");
    });

    socket.on("roomUsers", (list: string[]) => {
      console.log("Room users updated:", list);
      setUsers(list);
    });

    socket.on("chatMessage", (msg: ChatMessage) => {
      if (msg.senderId !== socket.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("offer", handleReceiveOffer);
    socket.on("answer", handleReceiveAnswer);
    socket.on("candidate", handleReceiveCandidate);

    checkPermissions();

    return () => {
      socket.disconnect();
      stopMedia();
      stopRecording();
    };
  }, [roomId]);

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      if (!localStreamRef.current) {
        setError("Please start call first to access microphone");
        return;
      }

      const audioStream = localStreamRef.current;
      recordedChunksRef.current = [];

      let mediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(audioStream);
        console.log("MediaRecorder created successfully");
      } catch (error) {
        console.error("MediaRecorder creation failed:", error);
        setError("Audio recording not supported in this browser");
        return;
      }

      audioRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("Recorded chunk:", event.data.size, "bytes");
        }
      };

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          setError("No audio data recorded");
          return;
        }

        const audioBlob = new Blob(recordedChunksRef.current, { 
          type: 'audio/webm'
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `recording-${timestamp}.webm`;
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newRecording: AudioRecording = {
          id: Date.now().toString(),
          userId: myId,
          userName: 'You',
          timestamp: new Date().toLocaleString(),
          duration: formatTime(recordingTime),
          blobUrl: audioUrl,
          blob: audioBlob,
          fileName: fileName
        };

        setRecordings(prev => [newRecording, ...prev]);
        setRecordingTime(0);
        console.log("Recording saved successfully");
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording error occurred");
        setIsRecording(false);
      };

      try {
        mediaRecorder.start();
        setIsRecording(true);
        setError("");
        console.log("Recording started successfully");
      } catch (startError) {
        console.error("Error starting MediaRecorder:", startError);
        setError("Failed to start recording. Please try again.");
      }

    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError("Recording failed: " + err.message);
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
      console.log("Recording stopped");
    }
  };

  // Download recording
  const downloadRecording = (recording: AudioRecording) => {
    try {
      const url = recording.blobUrl;
      const a = document.createElement('a');
      a.href = url;
      a.download = recording.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log("Download started:", recording.fileName);
    } catch (error) {
      console.error("Download error:", error);
      setError("Failed to download recording");
    }
  };

  // Delete recording
  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => {
      const updated = prev.filter(rec => rec.id !== recordingId);
      const deleted = prev.find(rec => rec.id === recordingId);
      if (deleted?.blobUrl) {
        URL.revokeObjectURL(deleted.blobUrl);
      }
      return updated;
    });
  };

  // Clear all recordings
  const clearAllRecordings = () => {
    if (window.confirm("Are you sure you want to delete all recordings?")) {
      recordings.forEach(rec => {
        if (rec.blobUrl) {
          URL.revokeObjectURL(rec.blobUrl);
        }
      });
      setRecordings([]);
    }
  };

  // Check recording compatibility
  const checkRecordingCompatibility = () => {
    if (typeof MediaRecorder === 'undefined') {
      return {
        supported: false,
        message: "Audio recording not supported in this browser."
      };
    }

    return { supported: true, message: "" };
  };

  const stopMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (isRecording) {
      stopRecording();
    }
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  };

  const startMedia = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError("");

      if (localStreamRef.current) {
        stopMedia();
      }

      console.log("Requesting media devices...");

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log("Media access granted");

      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(console.error);
      }

      setCameraPermission('granted');
      setMicPermission('granted');

      createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pcRef.current?.addTrack(track, stream);
      });

      setIsLoading(false);
      return true;

    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      
      let errorMessage = "Failed to access camera and microphone. ";
      
      if (err.name === 'NotFoundError') {
        errorMessage += "No camera/microphone found.";
      } else if (err.name === 'NotReadableError') {
        errorMessage += "Camera/microphone is being used by another application.";
      } else if (err.name === 'NotAllowedError') {
        errorMessage += "Permission denied. Please allow camera and microphone access.";
      } else {
        errorMessage += `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const createPeerConnection = () => {
    if (pcRef.current) return;

    pcRef.current = new RTCPeerConnection(rtcConfig);

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("candidate", {
          room: roomId,
          candidate: event.candidate,
        });
      }
    };

    pcRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pcRef.current.onconnectionstatechange = () => {
      console.log("Connection state:", pcRef.current?.connectionState);
    };
  };

  const startCall = async () => {
    if (!socketRef.current?.connected) {
      setError("Not connected to server. Please check backend.");
      return;
    }

    console.log("Starting call...");
    const mediaSuccess = await startMedia();
    if (!mediaSuccess) return;

    try {
      if (!pcRef.current) {
        createPeerConnection();
      }

      const offer = await pcRef.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await pcRef.current!.setLocalDescription(offer);

      socketRef.current.emit("offer", { 
        room: roomId, 
        sdp: offer 
      });

      setIsCallStarted(true);
      console.log("Call started");

    } catch (err) {
      console.error("Error starting call:", err);
      setError("Failed to start call");
    }
  };

  const handleReceiveOffer = async (data: any) => {
    console.log("Received offer from:", data.senderId);
    
    const mediaSuccess = await startMedia();
    if (!mediaSuccess) return;

    try {
      await pcRef.current!.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );

      const answer = await pcRef.current!.createAnswer();
      await pcRef.current!.setLocalDescription(answer);

      socketRef.current?.emit("answer", { 
        room: roomId, 
        sdp: answer 
      });

      setIsCallStarted(true);
    } catch (err) {
      console.error("Error handling offer:", err);
      setError("Failed to handle incoming call");
    }
  };

  const handleReceiveAnswer = async (data: any) => {
    console.log("Received answer from:", data.senderId);
    try {
      await pcRef.current!.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );
    } catch (err) {
      console.error("Error handling answer:", err);
    }
  };

  const handleReceiveCandidate = async (data: any) => {
    try {
      await pcRef.current!.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current?.connected) return;

    const msg: ChatMessage = {
      senderId: myId,
      text: message,
      time: new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'text'
    };

    setMessages((prev) => [...prev, msg]);
    
    socketRef.current.emit("chatMessage", {
      room: roomId,
      text: message,
      type: 'text'
    });

    setMessage("");
    setShowEmojiPicker(false);
  };

  const sendEmoji = (emoji: string) => {
    if (!socketRef.current?.connected) return;

    const msg: ChatMessage = {
      senderId: myId,
      text: emoji,
      time: new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'emoji'
    };

    setMessages((prev) => [...prev, msg]);
    
    socketRef.current.emit("chatMessage", {
      room: roomId,
      text: emoji,
      type: 'emoji'
    });

    setShowEmojiPicker(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !socketRef.current?.connected) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File size too large. Maximum 5MB allowed.");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      
      const msg: ChatMessage = {
        senderId: myId,
        text: `File: ${file.name}`,
        time: new Date().toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: 'file',
        fileName: file.name,
        fileData: fileData
      };

      setMessages((prev) => [...prev, msg]);
      
      socketRef.current.emit("chatMessage", {
        room: roomId,
        text: `File: ${file.name}`,
        type: 'file',
        fileName: file.name,
        fileData: fileData
      });
    };

    reader.onerror = () => {
      setError("Failed to read file");
    };

    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const leaveCall = () => {
    stopMedia();
    setIsCallStarted(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const testMedia = async () => {
    try {
      setError("Testing media devices...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (stream) {
        setError("Camera and microphone are working! Now try Start Call.");
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      setError("Test failed: " + err.message);
    }
  };

  const downloadFile = (fileData: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = fileName;
      link.click();
    } catch (error) {
      setError("Failed to download file");
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear all chat messages?")) {
      setMessages([]);
      localStorage.removeItem(`chat_messages_${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] text-[#3A2A1F]">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-lg border-b border-[#D7CCC8]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] p-2 rounded-xl shadow-lg border border-[#A1887F]">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[#6B4B35] text-sm">
                  Room: <span className="font-mono text-[#8B6B61] font-semibold">{roomId}</span> • 
                  Users: <span className="text-[#5D4037] font-semibold">{users.length}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Indicators */}
              <div className="flex items-center space-x-4 text-sm">
                <div className={`flex items-center space-x-1 ${cameraPermission === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${cameraPermission === 'granted' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                  <span>Camera</span>
                </div>
                <div className={`flex items-center space-x-1 ${micPermission === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${micPermission === 'granted' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                  <span>Microphone</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={testMedia}
                  className="px-4 py-2 bg-white hover:bg-[#8B6B61]/10 text-[#5D4037] font-medium rounded-xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  Test Media
                </button>

                {isCallStarted ? (
                  <button
                    onClick={leaveCall}
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border border-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Leave Call</span>
                  </button>
                ) : (
                  <button
                    onClick={startCall}
                    disabled={isLoading}
                    className="px-6 py-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center space-x-2 shadow-lg border border-[#A1887F]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{isLoading ? "Connecting..." : "Start Call"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-5 relative z-10 max-w-7xl mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Video Section - WhatsApp Style */}
          <div className="flex-1">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl h-[500px] lg:h-[600px]">
              
              {/* Remote Video - Main Screen */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video - Picture-in-Picture */}
              <div className="absolute top-4 right-4 w-32 h-48 lg:w-40 lg:h-60 bg-black rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center text-white">
                      <svg className="w-8 h-8 mx-auto mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">Camera Off</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Call Info Overlay */}
              {isCallStarted && (
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <p className="text-xs text-gray-300">{formatTime(callDuration)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* User Info Overlay */}
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
                <h3 className="text-white text-lg font-semibold bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl">
                  {isCallStarted ? "Connected" : "Waiting to connect..."}
                </h3>
                {isCallStarted && (
                  <p className="text-white/80 text-sm mt-1 bg-black/30 px-3 py-1 rounded-full">
                    {users.length} participant{users.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Control Bar - WhatsApp Style */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                
                {/* Recording Button */}
                {isCallStarted && (
                  <button
                    onClick={() => {
                      if (!isRecording) {
                        const compatibility = checkRecordingCompatibility();
                        if (!compatibility.supported) {
                          setError(compatibility.message);
                          return;
                        }
                        startRecording();
                      } else {
                        stopRecording();
                      }
                    }}
                    className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      {isRecording ? (
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                      ) : (
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  </button>
                )}

                {/* Mute/Unmute Audio */}
                {isCallStarted && (
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
                      isAudioEnabled 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-red-500 text-white'
                    }`}
                    title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isAudioEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      )}
                    </svg>
                  </button>
                )}

                {/* Video On/Off */}
                {isCallStarted && (
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${
                      isVideoEnabled 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-red-500 text-white'
                    }`}
                    title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isVideoEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 014.242 1.226m-8.484 2.094a7.975 7.975 0 010 11.314M3 3l18 18" />
                      )}
                    </svg>
                  </button>
                )}

                {/* End Call Button */}
                {isCallStarted && (
                  <button
                    onClick={leaveCall}
                    className="p-4 bg-red-500 text-white rounded-full transition-all duration-200 hover:scale-110 hover:bg-red-600 transform rotate-135"
                    title="End Call"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Recordings Button */}
                {isCallStarted && (
                  <button
                    onClick={() => setShowRecordings(true)}
                    className="p-3 bg-white/20 text-white rounded-full transition-all duration-200 hover:scale-110 hover:bg-white/30"
                    title="View Recordings"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 right-40 bg-red-500 text-white px-3 py-1 rounded-full flex items-center space-x-2 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-sm font-medium">Recording • {formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            {/* Additional Controls */}
            {isCallStarted && (
              <div className="mt-4 bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] p-4 shadow-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-[#5D4037] font-medium">
                        {isAudioEnabled ? 'Microphone On' : 'Microphone Off'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-[#5D4037] font-medium">
                        {isVideoEnabled ? 'Camera On' : 'Camera Off'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-[#8B6B61] font-medium">
                    Call Duration: {formatTime(callDuration)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          {isSidebarOpen && (
            <div className="w-full lg:w-[450px] xl:w-[500px] bg-white/80 backdrop-blur-lg rounded-2xl border border-[#D7CCC8] shadow-2xl">
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
                          <p className="font-medium">No messages yet</p>
                          <p className="text-sm mt-1">Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((m, i) => {
                          const isMe = m.senderId === myId;
                          return (
                            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-xs px-4 py-3 rounded-2xl ${
                                isMe 
                                  ? "bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] text-white rounded-br-none" 
                                  : "bg-[#EFEBE9] text-[#5D4037] rounded-bl-none border border-[#D7CCC8]"
                              }`}>
                                {!isMe && (
                                  <p className="text-xs font-medium text-[#8B6B61] mb-1">
                                    User {m.senderId.slice(-4)}
                                  </p>
                                )}
                                {m.type === 'emoji' ? (
                                  <div className="text-2xl text-center">{m.text}</div>
                                ) : m.type === 'file' ? (
                                  <div className="flex items-center space-x-3 bg-white/50 rounded-lg p-3">
                                    <div className="text-2xl">📎</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{m.fileName}</p>
                                      <button 
                                        onClick={() => m.fileData && downloadFile(m.fileData, m.fileName || 'file')}
                                        className="text-xs text-[#8B6B61] hover:text-[#5D4037] underline mt-1"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm">{m.text}</p>
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
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />
                        
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
                          placeholder="Type your message..." 
                          className="flex-1 bg-white border border-[#D7CCC8] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#8B6B61] focus:border-transparent placeholder-[#8B6B61] text-[#5D4037]"
                          disabled={!socketRef.current?.connected} 
                        />
                        
                        <button 
                          onClick={sendMessage} 
                          disabled={!message.trim() || !socketRef.current?.connected} 
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
                      {users.map((userId, index) => (
                        <div key={userId} className="flex items-center space-x-3 p-3 bg-[#EFEBE9] rounded-lg border border-[#D7CCC8]">
                          <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <p className="font-medium text-[#5D4037]">
                              {userId === myId ? "You" : `User ${userId.slice(-4)}`}
                            </p>
                            <p className="text-xs text-[#8B6B61] font-mono">{userId}</p>
                          </div>
                          {userId === myId && (
                            <span className="px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
                              Me
                            </span>
                          )}
                        </div>
                      ))}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Recordings Modal */}
      {showRecordings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#D7CCC8] w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="border-b border-[#D7CCC8] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#5D4037]">
                Audio Recordings ({recordings.length})
              </h2>
              <div className="flex space-x-2">
                {recordings.length > 0 && (
                  <button
                    onClick={clearAllRecordings}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowRecordings(false)}
                  className="px-4 py-2 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-lg font-medium transition-all duration-200 shadow-lg border border-[#A1887F]"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {recordings.length === 0 ? (
                <div className="text-center text-[#8B6B61] py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-lg font-medium">No recordings yet</p>
                  <p className="text-sm mt-2">Start a call and click "Start Recording" to record audio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recordings.map((recording) => (
                    <div key={recording.id} className="bg-[#EFEBE9] rounded-xl p-4 border border-[#D7CCC8]">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#5D4037]">
                            {recording.userName} 
                            {recording.userId === myId && (
                              <span className="ml-2 px-2 py-1 bg-[#8B6B61]/20 text-[#5D4037] text-xs rounded-full border border-[#8B6B61]/30">
                                You
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-[#8B6B61] mt-1">
                            {recording.timestamp} • Duration: {recording.duration}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <audio
                            controls
                            className="h-8 bg-white rounded-lg border border-[#D7CCC8]"
                            src={recording.blobUrl}
                          >
                            Your browser does not support the audio element.
                          </audio>
                          <button
                            onClick={() => downloadRecording(recording)}
                            className="p-2 bg-[#8B6B61] hover:bg-[#6D4C41] text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-lg"
                            title="Download"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteRecording(recording.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-lg"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg border border-red-400 max-w-sm animate-in slide-in-from-right">
          <div className="flex items-center justify-between">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-4 text-white hover:text-red-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}