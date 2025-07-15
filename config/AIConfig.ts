import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMiNI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 65536,
  responseModalities: [],
  responseMimeType: "text/plain",
};

export const chatSession = model.startChat({
  generationConfig,
  history: [
    {
      role: "user",
      parts: [
        {
          text: 'Summarize this text: "The Clockmaker’s Cat"\n\nIn a crooked little town where the chimneys leaned like sleepy old men and the lampposts hummed lullabies at dusk, there lived an eccentric clockmaker named Eliot Wren. He wore mismatched socks, spoke to his tools like old friends, and had a cat named Thimble who always wore a monocle. Nobody knew where Thimble got it, but nobody dared ask.\n\nEliot’s clocks were special. They didn’t just tell time—they told stories. Wind one up, and you might see a pirate duel in the minute hand, or a dragon curling around the numbers, yawning smoke.\n\nOne morning, Eliot found a peculiar gear on his doorstep—shimmering silver, engraved with tiny constellations. Thimble sniffed it once and sneezed out a spark.\n\nCurious, Eliot used it to craft a new clock. As soon as he placed the final screw, the entire shop froze.\n\nTime stopped.\n\nOutside, leaves hung motionless in the air. Rain paused mid-fall. The lampposts forgot their lullabies.\n\nOnly Eliot and Thimble could move.\n\nAnd then, from the center of the clock, a voice whispered:\n"Find the other pieces before midnight, or time will never move again."\n\nWith Thimble perched on his shoulder like a very dignified pirate parrot, Eliot set off—through wormholes in cuckoo clocks, past kingdoms hidden behind hourglasses, dodging shadow-creatures made of missed seconds.\n\nEvery piece they found told a new story, unlocked a new truth—about time, about choices, and about a clockmaker who once broke time for love.\n\nAnd at the very last second—tick—Eliot placed the final piece into the clock.\n\nTick.\nTick.\nTime began again.\n\nThimble, of course, just adjusted his monocle and yawned.',
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: 'Here\'s a thinking process to arrive at the summary:\n\n1.  **Identify the core subject:** The story is about a clockmaker named Eliot Wren and his cat, Thimble.\n2.  **Identify the central conflict/problem:** Time stops because Eliot uses a mysterious gear in a new clock. A voice tells him he must find other pieces before midnight to restart time.\n3.  **Identify the protagonists:** Eliot Wren, the eccentric clockmaker, and his monocle-wearing cat, Thimble.\n4.  **Identify the setting:** A whimsical, crooked little town.\n5.  **Identify the key plot points:**\n    *   Eliot is an unusual clockmaker whose clocks tell stories.\n    *   He finds a strange, shimmering gear.\n    *   He uses the gear to build a clock.\n    *   Using the gear causes time to stop for everyone except Eliot and Thimble.\n    *   A voice from the clock gives them a quest: find missing pieces before midnight to restart time.\n    *   Eliot and Thimble go on an adventure through fantastical places related to time (wormholes in clocks, kingdoms behind hourglasses).\n    *   They encounter obstacles (shadow creatures).\n    *   They find the pieces, learning about time, choices, and another clockmaker\'s past actions.\n    *   They succeed just before the deadline.\n    *   Time restarts.\n    *   Thimble remains unfazed.\n6.  **Draft an initial summary, including key points:**\n    Eliot Wren, an eccentric clockmaker in a quirky town, has a cat named Thimble who wears a monocle. Eliot\'s clocks tell stories. He finds a mysterious gear and uses it to build a new clock. This causes time to stop for everyone except him and Thimble. A voice from the clock tells them to find missing pieces before midnight, or time will remain frozen. Eliot and Thimble travel through time-related magical places, facing dangers, to find the pieces. They learn about time and a past event involving another clockmaker. They succeed just in time, restarting time. Thimble is nonchalant.\n7.  **Refine the summary for conciseness and flow:**\n    *   Combine introductory elements: "Eliot Wren is an eccentric clockmaker in a whimsical town, known for his story-telling clocks and his monocle-wearing cat, Thimble."\n    *   Streamline the inciting incident: "When Eliot uses a mysterious, shimmering gear he finds to build a new clock, time suddenly stops for everyone but him and his cat."\n    *   Clarify the quest: "A voice from the clock instructs them to find other missing pieces before midnight to restore time."\n    *   Describe the adventure briefly: "Eliot and Thimble embark on a fantastical journey through time-related realms, collecting the pieces and learning about the nature of time and a past incident."\n    *   State the resolution: "They successfully assemble the clock just before the deadline, restarting time."\n    *   Add Thimble\'s characteristic reaction: "Thimble, characteristically unfazed, simply adjusts his monocle."\n8.  **Final Polish:** Read through the refined summary. Ensure it captures the essence of the story (characters, plot, whimsical tone) accurately and concisely.\n\n    *Self-Correction:* Is the "past clockmaker" detail crucial for a *short* summary? Maybe simplify that part to just "learning about time and choices." Let\'s try that. "They embark on a fantastical journey through time-related realms, collecting the pieces and learning about time and choices along the way." Yes, that\'s more concise while still hinting at the deeper themes.\n\n9.  **Final Summary:** Eliot Wren, an eccentric clockmaker in a whimsical town, creates clocks that tell stories. He has a monocle-wearing cat named Thimble. When Eliot uses a mysterious gear he finds to build a new clock, time suddenly stops for everyone but him and Thimble. A voice from the clock instructs them to find other missing pieces before midnight to restore time. They embark on a fantastical journey through time-related realms, collecting the pieces and learning about time and choices. They succeed just in time, restarting the flow of time. Thimble remains characteristically unfazed.',
        },
        {
          text: "In a quirky town, eccentric clockmaker Eliot Wren, known for his story-telling clocks and his monocle-wearing cat Thimble, finds a mysterious shimmering gear. When he uses it to build a new clock, time freezes for everyone except Eliot and Thimble.\n\nA voice from the clock tasks them with finding other missing pieces before midnight to restart time. They journey through fantastical time-related places, collecting the pieces and learning about time and choices. They succeed at the last second, restoring time's flow, with Thimble remaining characteristically unfazed.",
        },
      ],
    },
  ],
});
