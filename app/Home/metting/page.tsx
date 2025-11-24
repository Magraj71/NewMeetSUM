// pages/meeting.tsx (or app/meeting/page.tsx)
"use client";
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER = "http://localhost:3001"; // change to your server
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

type PeerMap = {
  [id: string]: {
    pc: RTCPeerConnection;
    streamEl?: HTMLVideoElement | HTMLAudioElement;
    recorder?: MediaRecorder;
    chunks: Blob[];
  };
};

export default function MeetingPage() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<any>(null);
  const peersRef = useRef<PeerMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const [roomId] = useState("my-room"); // generate / allow user input
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);
    const socket = socketRef.current;

    async function init() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(()=>{});
      }

      socket.emit("join-room", roomId, "some-user");

      socket.on("user-joined", async ({ socketId, userName }) => {
        // create peer connection and offer
        await createPeerConnection(socketId, true);
      });

      socket.on("signal", async (payload: any) => {
        const { from, description, candidate } = payload;
        let peer = peersRef.current[from];
        if (!peer) {
          await createPeerConnection(from, false);
          peer = peersRef.current[from];
        }
        if (description) {
          const pc = peer.pc;
          const desc = new RTCSessionDescription(description);
          await pc.setRemoteDescription(desc);
          if (description.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("signal", { to: from, from: socket.id, description: pc.localDescription });
          }
        }
        if (candidate) {
          try {
            await peer.pc.addIceCandidate(candidate);
          } catch (e) {
            console.error("addIceCandidate error", e);
          }
        }
      });

      socket.on("user-left", (id: string) => {
        cleanupPeer(id);
      });
    }

    init();

    return () => {
      socket.disconnect();
      // cleanup pcs
    };
  }, [roomId]);

  async function createPeerConnection(remoteId: string, isOfferer: boolean) {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("signal", { to: remoteId, from: socketRef.current.id, candidate: e.candidate });
      }
    };

    pc.ontrack = (event) => {
      // event.streams[0] is the remote stream for this peer
      const remoteStream = event.streams[0];
      addRemoteStreamElement(remoteId, remoteStream);
      // create recorder for remote audio only (separate file per speaker)
      const audioOnly = new MediaStream(remoteStream.getAudioTracks());
      const recorder = new MediaRecorder(audioOnly);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => chunks.push(ev.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        // upload with speaker metadata
        await uploadRecording(blob, remoteId);
      };
      peersRef.current[remoteId] = { pc, streamEl: undefined, recorder, chunks };
      if (isRecording) {
        recorder.start(1000);
      }
    };

    // add local tracks
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    // create offer if needed
    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("signal", { to: remoteId, from: socketRef.current.id, description: pc.localDescription });
    }

    // save peer
    peersRef.current[remoteId] = peersRef.current[remoteId] ?? { pc, chunks: [] };
  }

  function addRemoteStreamElement(id: string, stream: MediaStream) {
    // create a new audio element for remote
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.controls = true;
    audio.srcObject = stream;
    audio.id = `audio-${id}`;
    document.getElementById("remotes")?.appendChild(audio);
    if (peersRef.current[id]) peersRef.current[id].streamEl = audio;
  }

  async function uploadRecording(blob: Blob, speakerId: string) {
    const fd = new FormData();
    fd.append("file", blob, `${speakerId}_${Date.now()}.webm`);
    fd.append("speakerId", speakerId);
    fd.append("roomId", roomId);
    await fetch("/api/upload-recording", { method: "POST", body: fd });
  }

  function cleanupPeer(id: string) {
    const p = peersRef.current[id];
    if (!p) return;
    try { p.pc.close(); } catch {}
    if (p.streamEl && p.streamEl.parentElement) p.streamEl.parentElement.removeChild(p.streamEl);
    if (p.recorder && p.recorder.state !== "inactive") p.recorder.stop();
    delete peersRef.current[id];
  }

  function startRecording() {
    setIsRecording(true);
    // start local recorder too (if you want local file)
    // start all remote recorders
    Object.values(peersRef.current).forEach((p) => {
      if (p.recorder && p.recorder.state === "inactive") p.recorder.start(1000); // timeslice
    });
  }

  function stopRecording() {
    setIsRecording(false);
    Object.values(peersRef.current).forEach((p) => {
      if (p.recorder && p.recorder.state !== "inactive") p.recorder.stop();
    });
  }

  return (
    <div>
      <h1>Meeting</h1>
      <video ref={localVideoRef} autoPlay playsInline style={{ width: 300 }} />
      <div id="remotes"></div>
      <div>
        <button onClick={startRecording} disabled={isRecording}>Start Recording</button>
        <button onClick={stopRecording} disabled={!isRecording}>Stop Recording</button>
      </div>
    </div>
  );
}
