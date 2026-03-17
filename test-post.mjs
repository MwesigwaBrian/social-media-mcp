import "dotenv/config";
import { generatePost, savePendingPost } from "./src/agent.mjs";
import { emailPostForApproval } from "./src/emailPost.mjs";
import crypto from "crypto";

console.log("🔑 Checking env...");
console.log("ANTHROPIC_API_KEY:", process.env.ANTHROPIC_API_KEY ? "✅ loaded" : "❌ missing");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✅ loaded" : "❌ missing");
console.log("REPORT_EMAIL:", process.env.REPORT_EMAIL || "❌ missing");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\n❌ ANTHROPIC_API_KEY is missing from .env — cannot continue");
  process.exit(1);
}

console.log("\n🤖 Generating post...");
const post = await generatePost(0);
post.token = crypto.randomBytes(16).toString("hex");
await savePendingPost(post);
console.log("✅ Post generated:", post.text.substring(0, 80) + "...");

console.log("\n📧 Sending email...");
await emailPostForApproval(post);
console.log("✅ Done! Check mweesiigwabrian@gmail.com");
process.exit(0);
