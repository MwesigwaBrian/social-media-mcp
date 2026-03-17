import "dotenv/config";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_EMAIL  = process.env.REPORT_EMAIL || "mweesiigwabrian@gmail.com";
const APP_URL       = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "https://social-media-mcp.onrender.com";

export async function emailPostForApproval(post) {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set — cannot send email");
    return;
  }

  const approveUrl = `${APP_URL}/approve-email?id=${post.id}&token=${post.token}`;
  const rejectUrl  = `${APP_URL}/reject-email?id=${post.id}&token=${post.token}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,43,91,0.10);">

  <!-- Header -->
  <div style="background:#0F2B5B;padding:28px 36px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#00C2FF;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#0F2B5B;font-family:Georgia,serif;">T</div>
      <div>
        <div style="font-family:Georgia,serif;font-size:18px;color:#ffffff;font-weight:700;">Tenovio</div>
        <div style="font-size:10px;color:#00C2FF;letter-spacing:2px;text-transform:uppercase;">LinkedIn Agent</div>
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#A8C8D4;">New post ready for your approval</p>
  </div>

  <!-- Meta -->
  <div style="padding:20px 36px 0;display:flex;gap:8px;flex-wrap:wrap;">
    <span style="background:#EEF3FF;color:#1E4A9E;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;">${post.theme.split(" - ")[0]}</span>
    <span style="background:#E6FAF5;color:#00A878;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;">${post.timeSlot}</span>
    <span style="margin-left:auto;font-size:11px;color:#6B7FA3;">${new Date(post.createdAt).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}</span>
  </div>

  <!-- Post text -->
  <div style="padding:20px 36px;">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6B7FA3;margin:0 0 10px;">Post Copy</p>
    <div style="background:#F8FAFF;border:1px solid #DDE5F0;border-radius:10px;padding:18px;font-size:14px;line-height:1.8;color:#0D1B35;white-space:pre-wrap;">${post.text}</div>
  </div>

  <!-- Visual preview -->
  <div style="padding:0 36px 20px;">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6B7FA3;margin:0 0 10px;">Visual Design</p>
    <div style="border:1px solid #DDE5F0;border-radius:10px;overflow:hidden;">
      ${post.visualSvg}
    </div>
    <p style="font-size:11px;color:#6B7FA3;margin:8px 0 0;font-style:italic;">${post.visualPrompt}</p>
  </div>

  <!-- Action buttons -->
  <div style="padding:20px 36px 32px;display:flex;gap:12px;">
    <a href="${approveUrl}"
       style="flex:1;background:#00A878;color:#ffffff;text-decoration:none;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;display:block;">
      ✓ Approve &amp; Post to LinkedIn
    </a>
    <a href="${rejectUrl}"
       style="background:#fff;color:#E53E3E;text-decoration:none;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:600;border:1.5px solid #E53E3E;display:block;">
      ✗ Reject
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#F0F4FA;padding:16px 36px;text-align:center;border-top:1px solid #DDE5F0;">
    <p style="margin:0;font-size:11px;color:#6B7FA3;">Tenovio Technologies Inc. · LinkedIn Marketing Agent</p>
    <p style="margin:4px 0 0;font-size:11px;color:#6B7FA3;">
      Or <a href="${APP_URL}" style="color:#1E4A9E;">open the dashboard</a> to manage all posts.
    </p>
  </div>

</div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tenovio Agent <onboarding@resend.dev>",
      to: [REPORT_EMAIL],
      subject: `📝 New LinkedIn Post Ready — ${post.theme.split(" - ")[0]} (${post.timeSlot})`,
      html,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`📧 Post emailed to ${REPORT_EMAIL} (id: ${data.id})`);
    return data.id;
  } else {
    const err = await res.text();
    console.error(`❌ Email failed:`, err);
  }
}
