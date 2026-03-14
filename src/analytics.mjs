import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANALYTICS_DIR = path.join(__dirname, "../data/analytics");

// ─── Fetch post stats from LinkedIn ────────────────────────────────────────

export async function fetchPostStats(postUrn) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;

  // Fetch likes/reactions
  const statsRes = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  // Fetch impressions/views via share statistics
  const shareId = postUrn.split(":").pop();
  const viewsRes = await fetch(
    `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodeURIComponent(postUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  let likes = 0, comments = 0, shares = 0, impressions = 0, clicks = 0;

  if (statsRes.ok) {
    const stats = await statsRes.json();
    likes = stats.likesSummary?.totalLikes || 0;
    comments = stats.commentsSummary?.totalFirstLevelComments || 0;
    shares = stats.sharesSummary?.totalShares || 0;
  }

  if (viewsRes.ok) {
    const viewData = await viewsRes.json();
    const element = viewData.elements?.[0]?.totalShareStatistics;
    if (element) {
      impressions = element.impressionCount || 0;
      clicks = element.clickCount || 0;
    }
  }

  return { likes, comments, shares, impressions, clicks };
}

// ─── Fetch follower count ───────────────────────────────────────────────────

export async function fetchFollowerCount() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;

  const res = await fetch("https://api.linkedin.com/v2/networkSizes/urn:li:person:~?edgeType=CompanyFollowedByMember", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.firstDegreeSize || null;
}

// ─── Save analytics record ─────────────────────────────────────────────────

export async function savePostAnalytics(postId, postUrn, postText, postedAt) {
  await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  const record = {
    postId,
    postUrn,
    postText: postText.substring(0, 200),
    postedAt,
    snapshots: [],
    lastChecked: null,
  };
  await fs.writeFile(
    path.join(ANALYTICS_DIR, `${postId}.json`),
    JSON.stringify(record, null, 2)
  );
}

export async function updatePostAnalytics(postId) {
  const filePath = path.join(ANALYTICS_DIR, `${postId}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const record = JSON.parse(content);

    if (!record.postUrn) return;

    const stats = await fetchPostStats(record.postUrn);
    record.snapshots.push({ ...stats, recordedAt: new Date().toISOString() });
    record.lastChecked = new Date().toISOString();

    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    return record;
  } catch (err) {
    console.error(`Failed to update analytics for ${postId}:`, err.message);
  }
}

export async function getAllAnalytics() {
  await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  const files = await fs.readdir(ANALYTICS_DIR);
  const records = [];
  for (const file of files.filter(f => f.endsWith(".json"))) {
    const content = await fs.readFile(path.join(ANALYTICS_DIR, file), "utf-8");
    records.push(JSON.parse(content));
  }
  return records.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
}

export async function getWeeklySnapshot() {
  const allPosts = await getAllAnalytics();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weekPosts = allPosts.filter(p => new Date(p.postedAt) > oneWeekAgo);

  const totals = weekPosts.reduce((acc, post) => {
    const latest = post.snapshots[post.snapshots.length - 1] || {};
    acc.impressions += latest.impressions || 0;
    acc.likes += latest.likes || 0;
    acc.comments += latest.comments || 0;
    acc.shares += latest.shares || 0;
    acc.clicks += latest.clicks || 0;
    return acc;
  }, { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 });

  const engagementRate = totals.impressions > 0
    ? (((totals.likes + totals.comments + totals.shares) / totals.impressions) * 100).toFixed(2)
    : "0.00";

  // Best performing post
  const bestPost = weekPosts.reduce((best, post) => {
    const latest = post.snapshots[post.snapshots.length - 1] || {};
    const score = (latest.likes || 0) + (latest.comments || 0) * 2 + (latest.shares || 0) * 3;
    const bestLatest = best?.snapshots?.[best.snapshots.length - 1] || {};
    const bestScore = (bestLatest.likes || 0) + (bestLatest.comments || 0) * 2 + (bestLatest.shares || 0) * 3;
    return score > bestScore ? post : best;
  }, null);

  return {
    weekPosts,
    totals,
    engagementRate,
    bestPost,
    postsCount: weekPosts.length,
    followerCount: await fetchFollowerCount(),
  };
}
