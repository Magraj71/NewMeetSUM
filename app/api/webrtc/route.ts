import { NextRequest, NextResponse } from "next/server";

// ✅ In-memory store (dev only – production use Redis)
const webrtcData = new Map<
  string,
  {
    offers: any[];
    answers: any[];
    candidates: any[];
  }
>();

// ✅ Cleanup helper
function cleanupRoom(roomId: string) {
  const room = webrtcData.get(roomId);
  if (!room) return;

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

  room.offers = room.offers.filter(o => o.timestamp > tenMinutesAgo);
  room.answers = room.answers.filter(a => a.timestamp > tenMinutesAgo);
  room.candidates = room.candidates.filter(c => c.timestamp > tenMinutesAgo);

  if (
    room.offers.length === 0 &&
    room.answers.length === 0 &&
    room.candidates.length === 0
  ) {
    webrtcData.delete(roomId);
  }
}

/* ===========================
   POST – Store WebRTC data
=========================== */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, type, data, userId } = body;

    if (!roomId || !type || !userId) {
      return NextResponse.json(
        { error: "roomId, type and userId required" },
        { status: 400 }
      );
    }

    if (!webrtcData.has(roomId)) {
      webrtcData.set(roomId, {
        offers: [],
        answers: [],
        candidates: [],
      });
    }

    const room = webrtcData.get(roomId)!;

    const payload = {
      ...data,
      userId,
      timestamp: Date.now(),
    };

    switch (type) {
      case "offer":
        room.offers.push(payload);
        break;

      case "answer":
        room.answers.push(payload);
        break;

      case "candidate":
        room.candidates.push(payload);
        break;

      case "clear":
        room.offers = room.offers.filter(o => o.userId !== userId);
        room.answers = room.answers.filter(a => a.userId !== userId);
        room.candidates = room.candidates.filter(c => c.userId !== userId);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid type" },
          { status: 400 }
        );
    }

    // ✅ Cleanup inside request
    cleanupRoom(roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST WebRTC error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

/* ===========================
   GET – Fetch WebRTC data
=========================== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");

    if (!roomId || !type || !userId) {
      return NextResponse.json(
        { error: "roomId, type and userId required" },
        { status: 400 }
      );
    }

    if (!webrtcData.has(roomId)) {
      return NextResponse.json({ [type]: [] });
    }

    const room = webrtcData.get(roomId)!;

    cleanupRoom(roomId);

    switch (type) {
      case "offers":
        return NextResponse.json({
          offers: room.offers.filter(o => o.userId !== userId),
        });

      case "answers":
        return NextResponse.json({
          answers: room.answers.filter(a => a.userId !== userId),
        });

      case "candidates":
        return NextResponse.json({
          candidates: room.candidates.filter(c => c.userId !== userId),
        });

      default:
        return NextResponse.json(
          { error: "Invalid type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GET WebRTC error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
