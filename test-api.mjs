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

console.log("TOKEN length:", token?.length ?? "MISSING");
console.log("URN:", urn ?? "MISSING");

if (!token || !urn) { console.error("Missing credentials"); process.exit(1); }

// Test with a short timeout
try {
  const res = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: "Bearer " + token },
    timeout: 10000
  });
  console.log("Auth OK:", JSON.stringify(res.data));
} catch(e) {
  if (e.response) {
    console.error("API error", e.response.status, JSON.stringify(e.response.data));
  } else {
    console.error("Network error:", e.message);
  }
}

process.exit(0);
