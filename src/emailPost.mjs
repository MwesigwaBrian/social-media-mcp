import "dotenv/config";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_EMAIL   = process.env.REPORT_EMAIL || "mweesiigwabrian@gmail.com";
const APP_URL        = process.env.APP_URL || "https://social-media-mcp.onrender.com";

export async function emailPostForApproval(post) {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not set — cannot send email");
    return;
  }

  // Encode the full post text + token into the URL so Render doesn't need the file
  const payload = Buffer.from(JSON.stringify({
    id:    post.id,
    text:  post.text,
    token: post.token
  })).toString("base64url");

  const approveUrl = `${APP_URL}/approve-email?payload=${payload}`;
  const rejectUrl  = `${APP_URL}/reject-email?payload=${payload}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,43,91,0.10);">

  <!-- Header -->
  <div style="background:#0F2B5B;padding:28px 36px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#00C2FF;border-radius:8px;display:inline-block;line-height:36px;text-align:center;font-size:18px;font-weight:700;color:#0F2B5B;font-family:Georgia,serif;">T</div>
      &nbsp;&nbsp;
      <div style="display:inline-block;vertical-align:top;margin-top:2px;">
        <div style="font-family:Georgia,serif;font-size:18px;color:#ffffff;font-weight:700;">Tenovio</div>
        <div style="font-size:10px;color:#00C2FF;letter-spacing:2px;text-transform:uppercase;">LinkedIn Agent</div>
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#A8C8D4;">New post ready for your approval</p>
  </div>

  <!-- Meta -->
  <div style="padding:20px 36px 0;">
    <span style="background:#EEF3FF;color:#1E4A9E;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;">${post.theme ? post.theme.split(" - ")[0] : "Post"}</span>
    &nbsp;
    <span style="background:#E6FAF5;color:#00A878;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;">${post.timeSlot || ""}</span>
    <span style="float:right;font-size:11px;color:#6B7FA3;">${new Date(post.createdAt).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}</span>
  </div>

  <!-- Post text -->
  <div style="padding:20px 36px;">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6B7FA3;margin:0 0 10px;">Post Copy</p>
    <div style="background:#F8FAFF;border:1px solid #DDE5F0;border-radius:10px;padding:18px;font-size:14px;line-height:1.8;color:#0D1B35;white-space:pre-wrap;">${post.text}</div>
  </div>

  <!-- Action buttons -->
  <div style="padding:8px 36px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:8px;">
          <a href="${approveUrl}"
             style="display:block;background:#00A878;color:#ffffff;text-decoration:none;text-align:center;padding:16px;border-radius:10px;font-size:15px;font-weight:700;">
            ✓ Approve &amp; Post to LinkedIn
          </a>
        </td>
        <td style="width:140px;">
          <a href="${rejectUrl}"
             style="display:block;background:#ffffff;color:#E53E3E;text-decoration:none;text-align:center;padding:16px;border-radius:10px;font-size:15px;font-weight:600;border:1.5px solid #E53E3E;">
            ✗ Reject
          </a>
        </td>
      </tr>
    </table>
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
      subject: `📝 New LinkedIn Post Ready — ${post.theme ? post.theme.split(" - ")[0] : "Post"} (${post.timeSlot || ""})`,
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
