import "dotenv/config";
import { generatePost, savePendingPost, getPendingPosts, updatePostStatus, deletePost } from "./src/agent.mjs";
import { approveAndPost } from "./src/linkedin.mjs";
import { updatePostAnalytics, getAllAnalytics } from "./src/analytics.mjs";
import { sendWeeklyReport } from "./src/emailReport.mjs";
import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ─── HTTP Server (Approval Dashboard) ──────────────────────────────────────

function getHTML(posts) {
  const pending = posts.filter(p => p.status === "pending");
  const posted = posts.filter(p => p.status === "posted");

  const cards = pending.map(post => `
    <div class="card" id="card-${post.id}">
      <div class="card-header">
        <div class="meta-row">
          <span class="badge theme">${post.theme.split(" - ")[0]}</span>
          <span class="badge slot">${post.timeSlot}</span>
          <span class="timestamp">${new Date(post.createdAt).toLocaleString()}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="post-preview">
          <div class="visual-panel">
            <div class="svg-container">${post.visualSvg}</div>
            <p class="visual-desc">${post.visualPrompt}</p>
          </div>
          <div class="text-panel">
            <h3>Post Copy</h3>
            <div class="post-text" id="text-${post.id}" contenteditable="true">${post.text.replace(/\n/g, "<br>")}</div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-approve" onclick="approvePost('${post.id}')">✓ Approve & Post</button>
        <button class="btn btn-edit" onclick="saveEdit('${post.id}')">✎ Save Edit</button>
        <button class="btn btn-reject" onclick="rejectPost('${post.id}')">✗ Reject</button>
      </div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tenovio — LinkedIn Approval</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--navy:#0F2B5B;--blue:#1E4A9E;--cyan:#00C2FF;--bg:#F0F4FA;--surface:#fff;--text:#0D1B35;--muted:#6B7FA3;--border:#DDE5F0;--green:#00A878;--red:#E53E3E}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
    .header{background:var(--navy);padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:70px;position:sticky;top:0;z-index:100}
    .logo{display:flex;align-items:center;gap:12px}
    .logo-mark{width:38px;height:38px;background:var(--cyan);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--navy)}
    .logo-text{font-family:'Playfair Display',serif;font-size:20px;color:#fff}
    .logo-sub{font-size:11px;color:var(--cyan);letter-spacing:2px;text-transform:uppercase}
    .stats-pill{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:6px 16px;font-size:13px;color:#fff}
    .stats-pill span{color:var(--cyan);font-weight:600}
    .refresh-btn{background:var(--cyan);color:var(--navy);border:none;border-radius:8px;padding:8px 16px;font-weight:600;font-size:13px;cursor:pointer}
    .main{max-width:1100px;margin:0 auto;padding:40px 24px}
    .section-title{font-family:'Playfair Display',serif;font-size:26px;color:var(--navy);margin-bottom:8px}
    .section-sub{color:var(--muted);font-size:14px;margin-bottom:32px}
    .card{background:var(--surface);border-radius:16px;box-shadow:0 4px 24px rgba(15,43,91,.10);margin-bottom:32px;overflow:hidden;border:1px solid var(--border)}
    .card-header{padding:20px 28px 16px;border-bottom:1px solid var(--border);background:linear-gradient(to right,#F8FAFF,#fff)}
    .meta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .badge{border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600}
    .badge.theme{background:#EEF3FF;color:var(--blue)}
    .badge.slot{background:#E6FAF5;color:var(--green)}
    .timestamp{margin-left:auto;font-size:12px;color:var(--muted)}
    .card-body{padding:28px}
    .post-preview{display:grid;grid-template-columns:1fr 1fr;gap:28px}
    .visual-panel h3,.text-panel h3{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:12px}
    .svg-container{width:100%;border-radius:10px;overflow:hidden;border:1px solid var(--border)}
    .svg-container svg{width:100%;height:auto;display:block}
    .visual-desc{margin-top:10px;font-size:12px;color:var(--muted);font-style:italic;line-height:1.5}
    .post-text{background:#F8FAFF;border:1px solid var(--border);border-radius:10px;padding:16px;font-size:14px;line-height:1.7;min-height:200px;outline:none}
    .post-text:focus{border-color:var(--cyan);background:#fff}
    .card-footer{padding:20px 28px;border-top:1px solid var(--border);display:flex;gap:12px;background:#FAFBFF}
    .btn{display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s}
    .btn-approve{background:var(--green);color:#fff}
    .btn-edit{background:#fff;color:var(--blue);border:1.5px solid var(--border)}
    .btn-reject{background:#fff;color:var(--red);border:1.5px solid var(--border);margin-left:auto}
    .empty-state{text-align:center;padding:80px 40px;color:var(--muted)}
    .empty-state h3{font-size:20px;color:var(--text);margin-bottom:8px}
    .toast{position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;color:#fff;z-index:999;transform:translateY(80px);transition:transform .3s;box-shadow:0 8px 24px rgba(0,0,0,.2)}
    .toast.show{transform:translateY(0)}
    .toast.success{background:var(--green)}
    .toast.error{background:var(--red)}
    @media(max-width:768px){.post-preview{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="toast" id="toast"></div>
<header class="header">
  <div class="logo">
    <div class="logo-mark">T</div>
    <div><div class="logo-text">Tenovio</div><div class="logo-sub">LinkedIn Agent</div></div>
  </div>
  <div style="display:flex;align-items:center;gap:16px">
    <div class="stats-pill"><span>${pending.length}</span> pending · <span>${posted.length}</span> posted</div>
    <button class="refresh-btn" onclick="location.reload()">↻ Refresh</button>
  </div>
</header>
<main class="main">
  <h1 class="section-title">Pending Approval</h1>
  <p class="section-sub">Review each post before it goes live on LinkedIn.</p>
  ${pending.length === 0 ? '<div class="empty-state"><h3>All caught up!</h3><p>No posts pending. New posts generate at 7AM, 11AM, 2PM, 5PM.</p></div>' : ''}
  ${cards}
</main>
<script>
  function showToast(msg,type='success'){const t=document.getElementById('toast');t.textContent=(type==='success'?'✓ ':'✗ ')+msg;t.className='toast show '+type;setTimeout(()=>t.classList.remove('show'),3500)}
  async function approvePost(id){
    const el=document.getElementById('text-'+id);
    const r=await fetch('/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:id,text:el?.innerText})});
    const d=await r.json();
    d.success?showToast('Posted to LinkedIn!'):showToast(d.message,'error');
    if(d.success)document.getElementById('card-'+id)?.remove();
  }
  async function saveEdit(id){
    const el=document.getElementById('text-'+id);
    const r=await fetch('/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:id,text:el?.innerText})});
    const d=await r.json();showToast(d.success?'Saved!':'Failed',d.success?'success':'error');
  }
  async function rejectPost(id){
    if(!confirm('Reject this post?'))return;
    const r=await fetch('/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:id})});
    const d=await r.json();
    if(d.success){showToast('Rejected');document.getElementById('card-'+id)?.remove();}
  }
  setTimeout(()=>location.reload(),60000);
</script>
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const posts = await getPendingPosts();
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(getHTML(posts));
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", async () => {
        const { postId, text } = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        if (req.url === "/approve") {
          if (text) {
            const post = posts.find(p => p.id === postId);
            if (post) {
              post.text = text;
              await fs.writeFile(path.join(__dirname, `data/pending/${postId}.json`), JSON.stringify(post, null, 2));
            }
          }
          const result = await approveAndPost(postId, await getPendingPosts());
          res.end(JSON.stringify(result));
        } else if (req.url === "/reject") {
          await deletePost(postId);
          res.end(JSON.stringify({ success: true }));
        } else if (req.url === "/edit") {
          const post = posts.find(p => p.id === postId);
          if (post) {
            post.text = text;
            await fs.writeFile(path.join(__dirname, `data/pending/${postId}.json`), JSON.stringify(post, null, 2));
            res.end(JSON.stringify({ success: true }));
          } else {
            res.end(JSON.stringify({ success: false }));
          }
        } else {
          res.writeHead(404); res.end();
        }
      });
      return;
    }
    res.writeHead(404); res.end("Not found");
  } catch (err) {
    console.error("Server error:", err);
    res.writeHead(500); res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Tenovio LinkedIn Agent started`);
  console.log(`🌐 Approval dashboard: http://localhost:${PORT}`);
  console.log(`📅 Generating posts at: 7AM, 11AM, 2PM, 5PM daily\n`);
});

// ─── Scheduler ──────────────────────────────────────────────────────────────

const GENERATION_HOURS = [7, 11, 14, 17];

async function runGeneration(slotIndex) {
  console.log(`\n🤖 [${new Date().toLocaleTimeString()}] Generating post for slot ${slotIndex + 1}/4...`);
  try {
    const post = await generatePost(slotIndex);
    await savePendingPost(post);
    console.log(`✅ Post queued for approval`);
  } catch (err) {
    console.error(`❌ Failed to generate post:`, err.message);
  }
}

async function scheduleLoop() {
  const now = new Date();
  for (let i = 0; i < GENERATION_HOURS.length; i++) {
    if (now.getHours() === GENERATION_HOURS[i] && now.getMinutes() < 5) {
      await runGeneration(i);
    }
  }

  while (true) {
    const now = new Date();
    let nextTime = null;
    let nextSlot = 0;

    for (let i = 0; i < GENERATION_HOURS.length; i++) {
      const hour = GENERATION_HOURS[i];
      if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < 1)) {
        nextTime = new Date(); nextTime.setHours(hour, 0, 0, 0);
        nextSlot = i; break;
      }
    }

    if (!nextTime) {
      nextTime = new Date(); nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(GENERATION_HOURS[0], 0, 0, 0); nextSlot = 0;
    }

    const ms = nextTime - new Date();
    console.log(`⏰ Next post in ${Math.round(ms / 60000)} minutes`);
    await new Promise(r => setTimeout(r, ms));
    await runGeneration(nextSlot);
  }
}

scheduleLoop().catch(console.error);

// ─── Analytics Poller (runs every 6 hours) ──────────────────────────────────

async function pollAnalytics() {
  console.log("📊 Polling LinkedIn analytics...");
  try {
    const records = await getAllAnalytics();
    for (const record of records) {
      await updatePostAnalytics(record.postId);
    }
    console.log(`✅ Updated analytics for ${records.length} posts`);
  } catch (err) {
    console.error("❌ Analytics poll failed:", err.message);
  }
}

// Poll every 6 hours
setInterval(pollAnalytics, 6 * 60 * 60 * 1000);

// ─── Weekly Email Report (every Monday at 8AM) ───────────────────────────────

async function checkWeeklyReport() {
  const now = new Date();
  if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() < 5) {
    console.log("📧 Sending weekly LinkedIn report...");
    await sendWeeklyReport();
  }
}

// Check every 5 minutes if it's time to send the weekly report
setInterval(checkWeeklyReport, 5 * 60 * 1000);
