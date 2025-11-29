"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Define types for TypeScript
type IAgoraRTCClient = any;
type IAgoraRTCRemoteUser = any;
type ICameraVideoTrack = any;
type IMicrophoneAudioTrack = any;

interface VideoCallProps {
  roomId: string;
  userId: string;
  onCallEnd: () => void;
}

export default function VideoCall({ roomId, userId, onCallEnd }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
  
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('DISCONNECTED');
  const [retryCount, setRetryCount] = useState(0);
  const [agoraRTC, setAgoraRTC] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);

  // Agora App ID
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';

  // Convert string userId to numeric UID
  const getNumericUid = useCallback((): number => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 1000000;
  }, [userId]);

  const numericUid = getNumericUid();

  // Load AgoraRTC dynamically - FIXED: Only load once
  useEffect(() => {
    const loadAgoraRTC = async () => {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        setAgoraRTC(AgoraRTC);
        console.log('AgoraRTC loaded successfully');
      } catch (error) {
        console.error('Failed to load AgoraRTC:', error);
        setError('Failed to load video call library. Please refresh the page.');
      }
    };

    loadAgoraRTC();
  }, []); // Empty dependency array - load only once

  // Initialize Agora Client
  const initAgoraClient = useCallback(() => {
    if (!appId) {
      setError('Agora App ID not configured.');
      return null;
    }

    if (!agoraRTC) {
      setError('Agora SDK not available.');
      return null;
    }

    try {
      const agoraClient = agoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8'
      });

      // Event handlers
      agoraClient.on('user-published', async (user: any, mediaType: any) => {
        console.log('User published:', user.uid, mediaType);
        
        try {
          await agoraClient.subscribe(user, mediaType);
          console.log('Subscribe success for:', user.uid);

          if (mediaType === 'video') {
            setRemoteUsers(prev => {
              const exists = prev.find(u => u.uid === user.uid);
              return exists ? prev : [...prev, user];
            });

            setTimeout(() => {
              if (user.videoTrack && remoteVideoContainerRef.current) {
                user.videoTrack.play(remoteVideoContainerRef.current);
              }
            }, 1000);
          }

          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        } catch (subscribeError) {
          console.error('Subscribe error:', subscribeError);
        }
      });

      agoraClient.on('user-unpublished', (user: any, mediaType: any) => {
        if (mediaType === 'video') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
      });

      agoraClient.on('user-joined', (user: any) => {
        console.log('User joined:', user.uid);
        setError(null);
      });

      agoraClient.on('user-left', (user: any) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      agoraClient.on('connection-state-change', (curState: any) => {
        setConnectionState(curState);
        
        if (curState === 'CONNECTED') {
          setIsConnected(true);
          setError(null);
        } else if (curState === 'DISCONNECTED') {
          setIsConnected(false);
          setHasJoined(false);
        } else if (curState === 'FAILED') {
          setIsConnected(false);
          setHasJoined(false);
        }
      });

      return agoraClient;
    } catch (err) {
      console.error('Error creating Agora client:', err);
      setError('Failed to initialize video call client');
      return null;
    }
  }, [agoraRTC, appId]);

  // Check device permissions
  const checkDevicePermissions = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStream.getTracks().forEach(track => track.stop());
      
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error: any) {
      console.error('Device permission error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow permissions.');
      } else if (error.name === 'NotFoundError') {
        setError('Camera or microphone not found.');
      } else if (error.name === 'NotReadableError') {
        setError('Camera or microphone is busy.');
      } else {
        setError(`Device error: ${error.message}`);
      }
      return false;
    }
  };

  // Create local tracks
  const createLocalTracks = async () => {
    try {
      const hasPermissions = await checkDevicePermissions();
      if (!hasPermissions) return null;

      const [microphoneTrack, cameraTrack] = await agoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true },
        { encoderConfig: '480p_1' }
      );

      return { microphoneTrack, cameraTrack };
    } catch (trackError: any) {
      console.error('Error creating tracks:', trackError);
      setError(`Failed to access camera/microphone: ${trackError.message}`);
      return null;
    }
  };

  // Start call - FIXED: Proper sequence and error handling
  const startCall = useCallback(async () => {
    if (!appId || !agoraRTC) {
      setError('Agora not configured properly.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // STEP 1: Initialize client
      const agoraClient = initAgoraClient();
      if (!agoraClient) return;
      setClient(agoraClient);

      // STEP 2: Create tracks first
      const tracks = await createLocalTracks();
      if (!tracks) {
        setIsLoading(false);
        return;
      }

      const { microphoneTrack, cameraTrack } = tracks;
      setLocalAudioTrack(microphoneTrack);
      setLocalVideoTrack(cameraTrack);

      // Play local video
      if (localVideoRef.current && cameraTrack) {
        cameraTrack.play(localVideoRef.current);
      }

      // STEP 3: Join channel
      console.log('Joining channel:', roomId);
      await agoraClient.join(appId, roomId, null, numericUid);
      console.log('Successfully joined channel');
      setHasJoined(true);

      // STEP 4: Publish tracks AFTER join confirmation
      if (microphoneTrack && cameraTrack) {
        await agoraClient.publish([microphoneTrack, cameraTrack]);
        console.log('Local tracks published successfully');
      }

      setIsConnected(true);
      setIsLoading(false);
      setError(null);
      
    } catch (error: any) {
      console.error('Failed to start call:', error);
      
      let errorMessage = 'Failed to start call. ';
      if (error.message.includes('INVALID_APP_ID')) {
        errorMessage = 'Invalid App ID. Check your Agora configuration.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Network connection failed. Check your internet.';
      } else {
        errorMessage += error.message || 'Unknown error.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
      await cleanup();
    }
  }, [agoraRTC, appId, roomId, numericUid, initAgoraClient]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    try {
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }

      if (client && hasJoined) {
        await client.leave();
      }

      setLocalAudioTrack(null);
      setLocalVideoTrack(null);
      setRemoteUsers([]);
      setIsConnected(false);
      setHasJoined(false);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, [client, localAudioTrack, localVideoTrack, hasJoined]);

  // End call
  const endCall = useCallback(async () => {
    await cleanup();
    onCallEnd();
  }, [cleanup, onCallEnd]);

  // Toggle video/audio
  const toggleVideo = useCallback(async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localVideoTrack, isVideoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [localAudioTrack, isAudioEnabled]);

  // Call duration timer - FIXED: Proper useEffect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]); // Only depend on isConnected

  // Cleanup on unmount - FIXED: Proper cleanup
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading if AgoraRTC is not ready
  if (!agoraRTC) {
    return (
      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl h-[600px] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Loading Video Call...</h3>
          <p className="text-gray-300">Initializing Agora SDK</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl h-[600px] relative">
      {/* Remote Video */}
      <div 
        ref={remoteVideoContainerRef}
        className="w-full h-full flex items-center justify-center bg-gray-900 relative"
      >
        {remoteUsers.length > 0 ? (
          remoteUsers.map(user => (
            <div key={String(user.uid)} className="w-full h-full relative">
              <div className="w-full h-full bg-gray-800" />
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                User {String(user.uid).slice(-6)}
              </div>
            </div>
          ))
        ) : isConnected ? (
          <div className="text-white text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-lg">Waiting for other participants...</p>
          </div>
        ) : (
          <div className="text-white text-center">
            <button
              onClick={startCall}
              disabled={isLoading}
              className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center space-x-3 mx-auto text-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting Call...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Start Video Call</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Local Video */}
      {isConnected && localVideoTrack && (
        <div className="absolute top-4 right-4 w-48 h-64 bg-black rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <span className="text-xs text-white">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            You
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg max-w-md text-center z-50">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Control Bar */}
      {isConnected && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${isVideoEnabled ? 'bg-white/20' : 'bg-red-500'}`}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isVideoEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 014.242 1.226m-8.484 2.094a7.975 7.975 0 010 11.314M3 3l18 18" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${isAudioEnabled ? 'bg-white/20' : 'bg-red-500'}`}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isAudioEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
          </button>

          <button
            onClick={endCall}
            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}