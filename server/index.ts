import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
const PORT = 5000;
const CLIENT_ORIGIN = "http://localhost:3000";

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ["GET", "POST"],
}));

app.use(express.json({ limit: '10mb' })); // ✅ Increased limit for file data

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8 // ✅ 100MB buffer size for file transfers
});

// Types
interface SignalPayload {
  room: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// ✅ UPDATED: Chat message payload with file support
interface ChatMsgPayload {
  room: string;
  text: string;
  type?: 'text' | 'emoji' | 'file';
  fileName?: string;
  fileData?: string; // Base64 encoded file data
}

interface User {
  id: string;
  room: string;
}

// Store connected users
const connectedUsers = new Map<string, User>();

const getRoomUsers = (room: string): string[] => {
  const users: string[] = [];
  connectedUsers.forEach((user, userId) => {
    if (user.room === room) {
      users.push(userId);
    }
  });
  return users;
};

const removeUser = (socketId: string): void => {
  connectedUsers.delete(socketId);
};

io.on("connection", (socket: Socket) => {
  console.log("🔌 User connected:", socket.id);

  // JOIN ROOM
  socket.on("join", ({ room }: { room: string }) => {
    try {
      socket.join(room);
      
      // Store user information
      connectedUsers.set(socket.id, { id: socket.id, room });
      
      const users = getRoomUsers(room);
      io.to(room).emit("roomUsers", users);
      
      console.log(`👥 ${socket.id} joined room: ${room}`, users);
    } catch (error) {
      console.error("Join error:", error);
    }
  });

  // WEBRTC SIGNALING
  socket.on("offer", (data: SignalPayload) => {
    try {
      console.log("📞 Offer from:", socket.id, "to room:", data.room);
      socket.to(data.room).emit("offer", {
        ...data,
        senderId: socket.id
      });
    } catch (error) {
      console.error("Offer error:", error);
    }
  });

  socket.on("answer", (data: SignalPayload) => {
    try {
      console.log("✅ Answer from:", socket.id, "to room:", data.room);
      socket.to(data.room).emit("answer", {
        ...data,
        senderId: socket.id
      });
    } catch (error) {
      console.error("Answer error:", error);
    }
  });

  socket.on("candidate", (data: SignalPayload) => {
    try {
      console.log("🧊 ICE candidate from:", socket.id);
      socket.to(data.room).emit("candidate", {
        ...data,
        senderId: socket.id
      });
    } catch (error) {
      console.error("Candidate error:", error);
    }
  });

  // ✅ UPDATED: CHAT MESSAGES with file support
  socket.on("chatMessage", ({ room, text, type, fileName, fileData }: ChatMsgPayload) => {
    try {
      const message = {
        senderId: socket.id,
        text,
        time: new Date().toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: type || 'text',
        fileName,
        fileData // Include file data for other users
      };

      console.log("💬 Chat message in room:", room, "from:", socket.id, "type:", type);
      
      if (type === 'file') {
        console.log("📁 File shared:", fileName, "size:", fileData?.length);
      }

      // Send to all users in the room including sender (for consistency)
      io.to(room).emit("chatMessage", message);
    } catch (error) {
      console.error("Chat message error:", error);
    }
  });

  // Handle user leaving
  socket.on("disconnecting", () => {
    console.log("🚪 User disconnecting:", socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      const users = getRoomUsers(user.room).filter(id => id !== socket.id);
      io.to(user.room).emit("roomUsers", users);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    removeUser(socket.id);
  });
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    status: "✅ WebRTC + Chat Socket Server Running",
    timestamp: new Date().toISOString(),
    features: ["Video Call", "Audio Call", "Text Chat", "File Sharing", "Emoji Support"]
  });
});

// Get room info endpoint
app.get("/rooms/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  const users = getRoomUsers(roomId);
  res.json({ 
    roomId, 
    users, 
    userCount: users.length,
    activeConnections: io.engine.clientsCount
  });
});

// Get all active rooms
app.get("/rooms", (req, res) => {
  const rooms: { [roomId: string]: string[] } = {};
  
  connectedUsers.forEach((user) => {
    if (!rooms[user.room]) {
      rooms[user.room] = [];
    }
    rooms[user.room].push(user.id);
  });

  res.json({
    totalRooms: Object.keys(rooms).length,
    totalUsers: connectedUsers.size,
    rooms
  });
});

// Server status
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: {
      total: io.engine.clientsCount,
      rooms: io.sockets.adapter.rooms.size
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`✨ Features: Video/Audio Call • Real-time Chat • File Sharing • Emoji Support`);
});