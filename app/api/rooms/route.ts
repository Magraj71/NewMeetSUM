import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with Redis in production)
const roomData = new Map<string, string>(); // userId -> roomId

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const roomId = url.searchParams.get('roomId');

    if (roomId) {
      // Get specific room info
      const roomUsers = Array.from(roomData.entries())
        .filter(([_, room]) => room === roomId)
        .map(([userId]) => userId);

      return NextResponse.json({
        roomId,
        users: roomUsers,
        userCount: roomUsers.length,
        status: 'success'
      });
    } else {
      // Get all rooms
      const rooms: { [key: string]: string[] } = {};
      
      roomData.forEach((room, userId) => {
        if (!rooms[room]) {
          rooms[room] = [];
        }
        rooms[room].push(userId);
      });

      return NextResponse.json({
        totalRooms: Object.keys(rooms).length,
        totalUsers: roomData.size,
        rooms,
        status: 'success'
      });
    }
  } catch (error) {
    console.error('Rooms API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // FIX: Check if request body exists and is valid JSON
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json', status: 'error' },
        { status: 400 }
      );
    }

    // FIX: Safely parse request body
    let body;
    try {
      const text = await req.text();
      
      // Check if body is empty
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'Request body cannot be empty', status: 'error' },
          { status: 400 }
        );
      }
      
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', status: 'error' },
        { status: 400 }
      );
    }

    const { userId, roomId, action } = body;

    // FIX: Validate required fields
    if (!userId || !roomId || !action) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: userId, roomId, and action are required',
          status: 'error' 
        },
        { status: 400 }
      );
    }

    if (action === 'join') {
      roomData.set(userId, roomId);
      console.log(`User ${userId} joined room ${roomId}`);
      
      return NextResponse.json({ 
        success: true, 
        message: `User ${userId} joined room ${roomId}`,
        status: 'success'
      });
    } else if (action === 'leave') {
      roomData.delete(userId);
      console.log(`User ${userId} left room`);
      
      return NextResponse.json({ 
        success: true, 
        message: `User ${userId} left room`,
        status: 'success'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "join" or "leave"', status: 'error' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Rooms POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}