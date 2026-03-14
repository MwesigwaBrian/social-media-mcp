import { readFileSync } from "fs";
import { resolve } from "path";
import axios from "axios";

// Parse UTF-16LE .env
const envRaw = readFileSync(resolve(".env")).toString("utf16le").replace(/^\uFEFF/, "");
const vars = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([\w]+)=(.+)$/);
  if (m) vars[m[1]] = m[2].trim();
}

const token = vars.LINKEDIN_ACCESS_TOKEN;
const urn = vars.LINKEDIN_PERSON_URN;

if (!token) { console.error("MISSING: LINKEDIN_ACCESS_TOKEN"); process.exit(1); }
if (!urn)   { console.error("MISSING: LINKEDIN_PERSON_URN"); process.exit(1); }

console.log("Token length:", token.length);
console.log("URN:", urn);

const content = `🚀 Introducing Tenovio — Property Management, Reimagined.

Managing properties shouldn't mean juggling spreadsheets, scattered emails, and disconnected tools.

That's why we built Tenovio — a single, centralised dashboard that gives property management companies full control over:

🏠 Tenants — onboarding, communication & lease tracking
🔧 Maintenance — requests, assignments & follow-ups, all in one place
🤝 Vendors — manage your trusted partners without the endless back-and-forth

Everything. One platform. Zero chaos.

━━━━━━━━━━━━━━━━━━━━━

💡 We're inviting our Founding Partners.

These aren't just our first users — they're co-builders. Your feedback will directly shape Tenovio's roadmap, features, and the future of the platform.

As a Founding Partner, you'll get:

✅ Exclusive early access before public launch
✅ Founding pricing — locked in forever
✅ A direct line to our product team
✅ Your voice in every major product decision

This is a rare chance to shape a platform built specifically for you.

━━━━━━━━━━━━━━━━━━━━━

If you run a property management company and you're tired of the chaos — this is your moment.

👉 Drop "FOUNDING" in the comments or DM me directly — I'll reach out personally.

Let's build the future of property management together. 🏗️

#Tenovio #PropertyManagement #PropTech #SaaS #FoundingPartners #PropertyTech #RealEstateTech #StartupLaunch #MultiTenant #PropertyManagerLife`;

console.log("Posting to LinkedIn...");

try {
  const res = await axios.post(
    "https://api.linkedin.com/v2/ugcPosts",
    {
      author: urn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE"
        }
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
    },
    {
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      timeout: 15000
    }
  );
  const id = res.headers["x-restli-id"] ?? "unknown";
  console.log("✅ Posted successfully!");
  console.log("Post ID:", id);
  console.log("URL: https://www.linkedin.com/feed/update/" + id);
} catch (e) {
  if (e.response) {
    console.error("❌ API Error", e.response.status);
    console.error(JSON.stringify(e.response.data, null, 2));
  } else {
    console.error("❌ Network error:", e.message);
  }
}

process.exit(0);
