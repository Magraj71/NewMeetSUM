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

// ✅ FIXED: params is NOT a Promise
export async function generateMetadata(
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  return {
    title: `Meeting Room ${roomId} | Video Conference`,
    description: `Join meeting room ${roomId} for video calls and collaboration.`,
  };
}
