import axios from "axios";
import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { saveSchedules, getStore } from "./store.js";
dotenv.config();
const activeJobs = new Map();

export async function postToLinkedIn(content, visibility="PUBLIC") {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const urn = process.env.LINKEDIN_PERSON_URN;
  if (!token) throw new Error("LINKEDIN_ACCESS_TOKEN not set in .env");
  if (!urn) throw new Error("LINKEDIN_PERSON_URN not set in .env");
  const res = await axios.post("https://api.linkedin.com/v2/ugcPosts", {
    author: urn, lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: content }, shareMediaCategory: "NONE" } },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility }
  }, { headers: { Authorization: "Bearer "+token, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" } });
  const id = res.headers["x-restli-id"] ?? uuidv4();
  return { id, url: "https://www.linkedin.com/feed/update/"+id };
}

export async function schedulePost({ platform, content, scheduledAt, visibility }) {
  const id = uuidv4();
  const expr = `${scheduledAt.getUTCMinutes()} ${scheduledAt.getUTCHours()} ${scheduledAt.getUTCDate()} ${scheduledAt.getUTCMonth()+1} *`;
  const job = cron.schedule(expr, async () => {
    try {
      if (platform === "linkedin") await postToLinkedIn(content, visibility);
      activeJobs.delete(id); delete getStore()[id]; await saveSchedules();
    } catch(e) { console.error("Job failed:", e.message); }
  }, { scheduled: true, timezone: "UTC" });
  const meta = { id, platform, content, scheduledAt: scheduledAt.toISOString(), visibility, cronExpression: expr };
  activeJobs.set(id, { job, meta }); getStore()[id] = meta; await saveSchedules();
  return meta;
}

export async function getScheduledPosts(platform="all") {
  const all = [...activeJobs.values()].map(e => e.meta);
  return platform === "all" ? all : all.filter(p => p.platform === platform);
}

export async function cancelScheduledPost(id) {
  const e = activeJobs.get(id); if (!e) return false;
  e.job.stop(); activeJobs.delete(id); delete getStore()[id]; await saveSchedules(); return true;
}

export async function restoreScheduledJobs() {
  const store = getStore(); const now = new Date();
  for (const [id, meta] of Object.entries(store)) {
    const t = new Date(meta.scheduledAt); if (t <= now) { delete store[id]; continue; }
    const job = cron.schedule(meta.cronExpression, async () => {
      try { if (meta.platform==="linkedin") await postToLinkedIn(meta.content, meta.visibility);
        activeJobs.delete(id); delete store[id]; await saveSchedules();
      } catch(e) { console.error("Restored job failed:", e.message); }
    }, { scheduled: true, timezone: "UTC" });
    activeJobs.set(id, { job, meta });
  }
  await saveSchedules();
}
