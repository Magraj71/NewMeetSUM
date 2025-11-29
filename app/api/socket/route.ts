import { NextRequest } from 'next/server';
import { Server } from 'socket.io';

// Global variable to store the Socket.io server instance
const ioHandler = async (req: NextRequest) => {
  // This is needed for Socket.io to work with Next.js API routes
  // The actual Socket.io server is initialized separately
  return new Response('Socket.IO route', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export { ioHandler as GET, ioHandler as POST };