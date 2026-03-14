import "dotenv/config";
import { getWeeklySnapshot } from "./analytics.mjs";

// ─── Send email via SMTP (using Nodemailer-style fetch or SMTP) ─────────────
// We use Resend API (free tier: 3000 emails/mo) — no SMTP config needed

export async function sendWeeklyReport() {
  const snap = await getWeeklySnapshot();
  const html = buildEmailHTML(snap);
  const subject = `📊 Tenovio LinkedIn Weekly Report — ${getWeekDateRange()}`;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const REPORT_EMAIL = process.env.REPORT_EMAIL;

  if (!RESEND_API_KEY || !REPORT_EMAIL) {
    console.error("❌ Missing RESEND_API_KEY or REPORT_EMAIL in .env");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tenovio Agent <onboarding@resend.dev>",
      to: [REPORT_EMAIL],
      subject,
      html,
    }),
  });

  if (res.ok) {
    console.log(`✅ Weekly report sent to ${REPORT_EMAIL}`);
  } else {
    const err = await res.text();
    console.error(`❌ Failed to send report:`, err);
  }
}

function getWeekDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function buildEmailHTML(snap) {
  const { totals, engagementRate, bestPost, postsCount, followerCount, weekPosts } = snap;

  const postRows = weekPosts.map(post => {
    const latest = post.snapshots[post.snapshots.length - 1] || {};
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #EEF3FF;font-size:13px;color:#0D1B35;max-width:300px;">
          ${post.postText.substring(0, 100)}...
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #EEF3FF;text-align:center;font-size:13px;font-weight:600;color:#0F2B5B;">${latest.impressions || 0}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #EEF3FF;text-align:center;font-size:13px;font-weight:600;color:#0F2B5B;">${latest.likes || 0}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #EEF3FF;text-align:center;font-size:13px;font-weight:600;color:#0F2B5B;">${latest.comments || 0}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #EEF3FF;text-align:center;font-size:13px;font-weight:600;color:#0F2B5B;">${latest.shares || 0}</td>
      </tr>`;
  }).join("");

  const bestPostSnap = bestPost?.snapshots?.[bestPost.snapshots.length - 1] || {};

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,43,91,0.10);">

    <!-- Header -->
    <div style="background:#0F2B5B;padding:40px 48px;">
      <div style="display:inline-block;background:#00C2FF;border-radius:8px;width:44px;height:44px;line-height:44px;text-align:center;font-size:22px;font-weight:700;color:#0F2B5B;margin-bottom:16px;">T</div>
      <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Weekly LinkedIn Report</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#00C2FF;letter-spacing:1px;text-transform:uppercase;">${getWeekDateRange()}</p>
    </div>

    <!-- Summary stats -->
    <div style="padding:40px 48px 24px;">
      <h2 style="margin:0 0 24px;font-size:16px;font-weight:600;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">This Week at a Glance</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">

        <div style="background:#F0F4FA;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#0F2B5B;">${postsCount}</div>
          <div style="font-size:12px;color:#6B7FA3;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Posts Published</div>
        </div>

        <div style="background:#F0F4FA;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#0F2B5B;">${totals.impressions.toLocaleString()}</div>
          <div style="font-size:12px;color:#6B7FA3;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Impressions</div>
        </div>

        <div style="background:#F0F4FA;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#00A878;">${engagementRate}%</div>
          <div style="font-size:12px;color:#6B7FA3;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Engagement Rate</div>
        </div>

        <div style="background:#F0F4FA;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#0F2B5B;">${totals.likes}</div>
          <div style="font-size:12px;color:#6B7FA3;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Likes</div>
        </div>

        <div style="background:#F0F4FA;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#0F2B5B;">${totals.comments}</div>
          <div style="font-size:12px;color:#6B7FA3;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Comments</div>
        </div>

        <div style="background:#F0F4FA;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#0F2B5B;">${totals.shares}</div>
          <div style="font-size:12px;color:#6B7FA3;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Shares</div>
        </div>

      </div>

      ${followerCount ? `
      <div style="margin-top:16px;background:#EEF3FF;border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:14px;color:#1E4A9E;font-weight:600;">LinkedIn Followers</span>
        <span style="font-size:24px;font-weight:700;color:#0F2B5B;">${followerCount.toLocaleString()}</span>
      </div>` : ""}
    </div>

    <!-- Best post -->
    ${bestPost ? `
    <div style="padding:0 48px 32px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">⭐ Top Post This Week</h2>
      <div style="background:#0F2B5B;border-radius:12px;padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;color:#ffffff;line-height:1.7;">${bestPost.postText}...</p>
        <div style="display:flex;gap:24px;">
          <span style="font-size:13px;color:#00C2FF;">👁 ${bestPostSnap.impressions || 0} views</span>
          <span style="font-size:13px;color:#00C2FF;">❤️ ${bestPostSnap.likes || 0} likes</span>
          <span style="font-size:13px;color:#00C2FF;">💬 ${bestPostSnap.comments || 0} comments</span>
          <span style="font-size:13px;color:#00C2FF;">🔁 ${bestPostSnap.shares || 0} shares</span>
        </div>
      </div>
    </div>` : ""}

    <!-- Posts table -->
    ${weekPosts.length > 0 ? `
    <div style="padding:0 48px 40px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">All Posts This Week</h2>
      <table style="width:100%;border-collapse:collapse;font-family:'Helvetica Neue',Arial,sans-serif;">
        <thead>
          <tr style="background:#F0F4FA;">
            <th style="padding:12px 16px;text-align:left;font-size:12px;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">Post</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">Views</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">Likes</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">Comments</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;color:#6B7FA3;text-transform:uppercase;letter-spacing:1px;">Shares</th>
          </tr>
        </thead>
        <tbody>${postRows}</tbody>
      </table>
    </div>` : ""}

    <!-- Footer -->
    <div style="background:#F0F4FA;padding:24px 48px;text-align:center;border-top:1px solid #DDE5F0;">
      <p style="margin:0;font-size:12px;color:#6B7FA3;">Tenovio Technologies Inc. · LinkedIn Marketing Agent</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6B7FA3;">This report is auto-generated every Monday morning.</p>
    </div>

  </div>
</body>
</html>`;
}
