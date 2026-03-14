import "dotenv/config";
import { updatePostStatus, deletePost } from "./agent.mjs";

export async function postToLinkedIn(post) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error("LINKEDIN_ACCESS_TOKEN not set in .env");

  // Get your LinkedIn person URN
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!profileRes.ok) {
    throw new Error(`LinkedIn auth failed: ${profileRes.status} - check your token`);
  }

  const profile = await profileRes.json();
  const authorUrn = `urn:li:person:${profile.sub}`;

  // Post to LinkedIn
  const postBody = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: post.text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`LinkedIn post failed: ${postRes.status} - ${err}`);
  }

  const result = await postRes.json();
  console.log(`✅ Posted to LinkedIn: ${result.id}`);
  return result;
}

export async function approveAndPost(postId, posts) {
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error("Post not found");

  try {
    await postToLinkedIn(post);
    await updatePostStatus(postId, "posted");
    return { success: true, message: "Posted to LinkedIn successfully!" };
  } catch (err) {
    await updatePostStatus(postId, "failed");
    return { success: false, message: err.message };
  }
}
