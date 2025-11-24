// server/index.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("connected", socket.id);

  socket.on("join-room", (roomId, userName) => {
    socket.join(roomId);
    socket.data.userName = userName;
    // inform others
    socket.to(roomId).emit("user-joined", { socketId: socket.id, userName });
  });

  socket.on("signal", (payload) => {
    // payload: { to, from, description? , candidate? }
    io.to(payload.to).emit("signal", payload);
  });

  socket.on("disconnect", () => {
    // broadcast disconnect to rooms
    // you can track membership server-side for cleanup
    console.log("disconnect", socket.id);
    socket.broadcast.emit("user-left", socket.id);
  });
});

server.listen(3001, () => console.log("Signaling server on 3001"));
