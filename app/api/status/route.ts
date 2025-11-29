import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return NextResponse.json({
      status: "running",
      timestamp: new Date().toISOString(),
      platform: "Next.js API Routes",
      uptime: {
        seconds: Math.floor(uptime),
        humanReadable: formatUptime(uptime)
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      },
      features: [
        "Video Call", 
        "Audio Call", 
        "Text Chat", 
        "File Sharing", 
        "Emoji Support",
        "Audio Recording"
      ],
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { 
        status: "error",
        error: "Internal server error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}