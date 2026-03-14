import "dotenv/config";
import { generatePost, savePendingPost } from "./agent.mjs";

// Post generation times: 7AM, 11AM, 2PM, 5PM (generates 1hr before slot)
const GENERATION_HOURS = [7, 11, 14, 17];

function getNextGenerationTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (let i = 0; i < GENERATION_HOURS.length; i++) {
    const hour = GENERATION_HOURS[i];
    if (
      currentHour < hour ||
      (currentHour === hour && currentMinute < 1)
    ) {
      const next = new Date();
      next.setHours(hour, 0, 0, 0);
      return { next, slotIndex: i };
    }
  }

  // Next day first slot
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(GENERATION_HOURS[0], 0, 0, 0);
  return { next, slotIndex: 0 };
}

async function runGeneration(slotIndex) {
  console.log(`\n🤖 [${new Date().toLocaleTimeString()}] Generating post for slot ${slotIndex + 1}/4...`);
  try {
    const post = await generatePost(slotIndex);
    await savePendingPost(post);
    console.log(`✅ Post generated: "${post.text.substring(0, 80)}..."`);
    console.log(`📋 Open http://localhost:3000 to review and approve`);
  } catch (err) {
    console.error(`❌ Failed to generate post:`, err.message);
  }
}

async function scheduleLoop() {
  console.log("🚀 Tenovio LinkedIn Agent Scheduler started");
  console.log("📅 Generating posts at: 7AM, 11AM, 2PM, 5PM daily");
  console.log("🌐 Approval dashboard: http://localhost:3000\n");

  // Check if we should run immediately (within 5 min of a slot)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  for (let i = 0; i < GENERATION_HOURS.length; i++) {
    if (currentHour === GENERATION_HOURS[i] && currentMin < 5) {
      await runGeneration(i);
    }
  }

  // Main loop
  while (true) {
    const { next, slotIndex } = getNextGenerationTime();
    const msUntilNext = next - new Date();
    const minutesUntil = Math.round(msUntilNext / 60000);

    console.log(`⏰ Next post generation in ${minutesUntil} minutes (${next.toLocaleTimeString()})`);

    await new Promise((resolve) => setTimeout(resolve, msUntilNext));
    await runGeneration(slotIndex);
  }
}

scheduleLoop().catch(console.error);
