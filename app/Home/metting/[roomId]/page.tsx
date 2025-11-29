import MeetingClient from "@/components/MeetingClient";

interface PageProps {
  params: {
    roomId: string;
  };
}

export default function MeetingPage({ params }: PageProps) {
  const { roomId } = params;

  return (
    <main>
      <MeetingClient roomId={roomId} />
    </main>
  );
}

// FIX: Make generateMetadata async and await params
export async function generateMetadata({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  
  return {
    title: `Meeting Room ${roomId} | Video Conference`,
    description: `Join meeting room ${roomId} for video calls and collaboration.`,
  };
}