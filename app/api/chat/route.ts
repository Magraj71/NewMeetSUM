import { NextRequest, NextResponse } from 'next/server';

// Store chat messages (in production, use database)
const chatMessages = new Map<string, any[]>();

export async function POST(req: NextRequest) {
  try {
    // FIX: Safe JSON parsing with validation
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json', status: 'error' },
        { status: 400 }
      );
    }

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
      console.error('Chat POST JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', status: 'error' },
        { status: 400 }
      );
    }

    const { roomId, message, text: textField, type = 'text', fileName, fileData, senderId } = body;

    console.log('Received chat message:', { roomId, message, text: textField, type, senderId });

    // Use 'message' or 'text' field (support both for compatibility)
    const messageContent = message || textField;

    // FIX: Better validation with specific error messages
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required', status: 'error' },
        { status: 400 }
      );
    }

    if (!messageContent && type !== 'file') {
      return NextResponse.json(
        { error: 'Message content is required for text messages', status: 'error' },
        { status: 400 }
      );
    }

    if (!senderId) {
      return NextResponse.json(
        { error: 'Sender ID is required', status: 'error' },
        { status: 400 }
      );
    }

    // Validate message length
    if (messageContent && messageContent.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1000 characters allowed.', status: 'error' },
        { status: 400 }
      );
    }

    // Initialize room messages if not exists
    if (!chatMessages.has(roomId)) {
      chatMessages.set(roomId, []);
    }

    const newMessage = {
      id: `${roomId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: senderId,
      text: messageContent || (type === 'file' ? `File: ${fileName}` : ''),
      type,
      fileName,
      fileData,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      roomId: roomId
    };

    // Add message to room
    const roomMessages = chatMessages.get(roomId)!;
    roomMessages.push(newMessage);

    // Keep only last 100 messages per room to prevent memory issues
    if (roomMessages.length > 100) {
      chatMessages.set(roomId, roomMessages.slice(-100));
    }

    console.log(`Message stored in room ${roomId} from user ${senderId}, total messages: ${roomMessages.length}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully',
      messageId: newMessage.id,
      status: 'success'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const roomId = url.searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required', status: 'error' },
        { status: 400 }
      );
    }

    const messages = chatMessages.get(roomId) || [];
    
    // Return messages from the last 24 hours only (increased from 1 hour)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentMessages = messages
      .filter(msg => msg.timestamp > oneDayAgo)
      .sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order

    console.log(`Returning ${recentMessages.length} messages for room ${roomId}`);

    return NextResponse.json({
      messages: recentMessages,
      count: recentMessages.length,
      status: 'success'
    });

  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE endpoint to clear chat for a room
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const roomId = url.searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required', status: 'error' },
        { status: 400 }
      );
    }

    if (chatMessages.has(roomId)) {
      chatMessages.delete(roomId);
      console.log(`Cleared all messages for room ${roomId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Chat cleared for room ${roomId}`,
      status: 'success'
    });

  } catch (error) {
    console.error('Chat DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}