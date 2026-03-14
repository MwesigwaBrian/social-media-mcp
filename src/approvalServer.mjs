import "dotenv/config";
import http from "http";
import { getPendingPosts, updatePostStatus, deletePost } from "./agent.mjs";
import { approveAndPost } from "./linkedin.mjs";

const PORT = 3000;

function getHTML(posts) {
  const pendingPosts = posts.filter((p) => p.status === "pending");
  const postedPosts = posts.filter((p) => p.status === "posted");

  const postCards = pendingPosts
    .map(
      (post) => `
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
            <div class="svg-container">
              ${post.visualSvg}
            </div>
            <p class="visual-desc">${post.visualPrompt}</p>
          </div>
          <div class="text-panel">
            <h3>Post Copy</h3>
            <div class="post-text" id="text-${post.id}" contenteditable="true">${post.text.replace(/\n/g, "<br>")}</div>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <button class="btn btn-approve" onclick="approvePost('${post.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Approve & Post
        </button>
        <button class="btn btn-edit" onclick="saveEdit('${post.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Save Edit
        </button>
        <button class="btn btn-reject" onclick="rejectPost('${post.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Reject
        </button>
      </div>
    </div>
  `
    )
    .join("");

  const emptyState =
    pendingPosts.length === 0
      ? `<div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <h3>All caught up!</h3>
      <p>No posts pending approval. The scheduler generates new posts at 7AM, 11AM, 2PM, and 5PM.</p>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tenovio — LinkedIn Post Approval</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy: #0F2B5B;
      --blue: #1E4A9E;
      --cyan: #00C2FF;
      --bg: #F0F4FA;
      --surface: #FFFFFF;
      --text: #0D1B35;
      --muted: #6B7FA3;
      --border: #DDE5F0;
      --green: #00A878;
      --red: #E53E3E;
      --amber: #D97706;
      --radius: 16px;
      --shadow: 0 4px 24px rgba(15,43,91,0.10);
    }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    /* Header */
    .header {
      background: var(--navy);
      padding: 0 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 20px rgba(0,0,0,0.2);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-mark {
      width: 38px; height: 38px;
      background: var(--cyan);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif;
      font-size: 20px; font-weight: 700;
      color: var(--navy);
    }

    .logo-text {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      color: white;
      letter-spacing: 1px;
    }

    .logo-sub {
      font-size: 11px;
      color: var(--cyan);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 1px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stats-pill {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 13px;
      color: white;
    }

    .stats-pill span { color: var(--cyan); font-weight: 600; }

    .refresh-btn {
      background: var(--cyan);
      color: var(--navy);
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .refresh-btn:hover { opacity: 0.85; }

    /* Main */
    .main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      color: var(--navy);
      margin-bottom: 8px;
    }

    .section-sub {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 32px;
    }

    /* Cards */
    .card {
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      margin-bottom: 32px;
      overflow: hidden;
      border: 1px solid var(--border);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(15,43,91,0.14); }

    .card-header {
      padding: 20px 28px 16px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(to right, #F8FAFF, #FFFFFF);
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .badge {
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .badge.theme { background: #EEF3FF; color: var(--blue); }
    .badge.slot { background: #E6FAF5; color: var(--green); }

    .timestamp {
      margin-left: auto;
      font-size: 12px;
      color: var(--muted);
    }

    .card-body { padding: 28px; }

    .post-preview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }

    .visual-panel h3, .text-panel h3 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--muted);
      margin-bottom: 12px;
    }

    .svg-container {
      width: 100%;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .svg-container svg { width: 100%; height: auto; display: block; }

    .visual-desc {
      margin-top: 10px;
      font-size: 12px;
      color: var(--muted);
      font-style: italic;
      line-height: 1.5;
    }

    .post-text {
      background: #F8FAFF;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      line-height: 1.7;
      color: var(--text);
      min-height: 200px;
      outline: none;
      transition: border-color 0.2s;
    }
    .post-text:focus { border-color: var(--cyan); background: white; }

    .card-footer {
      padding: 20px 28px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
      background: #FAFBFF;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-approve { background: var(--green); color: white; }
    .btn-approve:hover { background: #008F65; transform: translateY(-1px); }
    .btn-edit { background: white; color: var(--blue); border: 1.5px solid var(--border); }
    .btn-edit:hover { border-color: var(--blue); background: #EEF3FF; }
    .btn-reject { background: white; color: var(--red); border: 1.5px solid var(--border); margin-left: auto; }
    .btn-reject:hover { background: #FFF5F5; border-color: var(--red); }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 80px 40px;
      color: var(--muted);
    }
    .empty-icon { color: var(--green); margin-bottom: 16px; }
    .empty-state h3 { font-size: 20px; color: var(--text); margin-bottom: 8px; }
    .empty-state p { font-size: 14px; line-height: 1.6; max-width: 400px; margin: 0 auto; }

    /* Posted section */
    .posted-section { margin-top: 48px; }
    .posted-count {
      font-size: 13px;
      color: var(--muted);
      background: white;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 14px;
      display: inline-block;
      margin-bottom: 16px;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      z-index: 999;
      transform: translateY(80px);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .toast.show { transform: translateY(0); }
    .toast.success { background: var(--green); }
    .toast.error { background: var(--red); }

    /* Loading overlay */
    .loading-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15,43,91,0.4);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    .loading-overlay.show { display: flex; }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: var(--cyan);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .post-preview { grid-template-columns: 1fr; }
      .header { padding: 0 16px; }
      .main { padding: 24px 16px; }
    }
  </style>
</head>
<body>

<div class="loading-overlay" id="loading">
  <div class="spinner"></div>
</div>

<div class="toast" id="toast"></div>

<header class="header">
  <div class="logo">
    <div class="logo-mark">T</div>
    <div>
      <div class="logo-text">Tenovio</div>
      <div class="logo-sub">LinkedIn Agent</div>
    </div>
  </div>
  <div class="header-right">
    <div class="stats-pill">
      <span>${pendingPosts.length}</span> pending · <span>${postedPosts.length}</span> posted today
    </div>
    <button class="refresh-btn" onclick="location.reload()">↻ Refresh</button>
  </div>
</header>

<main class="main">
  <h1 class="section-title">Pending Approval</h1>
  <p class="section-sub">Review each post before it goes live on LinkedIn. You can edit the copy directly in the text box.</p>

  ${emptyState}
  ${postCards}

  ${
    postedPosts.length > 0
      ? `<div class="posted-section">
    <h2 class="section-title" style="font-size:20px;">Posted</h2>
    <div class="posted-count">${postedPosts.length} post${postedPosts.length !== 1 ? "s" : ""} published</div>
    ${postedPosts
      .map(
        (p) => `
      <div class="card" style="opacity:0.6;">
        <div class="card-header">
          <div class="meta-row">
            <span class="badge theme">${p.theme.split(" - ")[0]}</span>
            <span class="badge" style="background:#E6FAF5;color:#00A878;">✓ Posted</span>
            <span class="timestamp">${new Date(p.updatedAt || p.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div class="card-body">
          <p style="font-size:14px;line-height:1.7;color:#6B7FA3;">${p.text.replace(/\n/g, "<br>").substring(0, 300)}...</p>
        </div>
      </div>`
      )
      .join("")}
  </div>`
      : ""
  }
</main>

<script>
  function showLoading() { document.getElementById('loading').classList.add('show'); }
  function hideLoading() { document.getElementById('loading').classList.remove('show'); }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = type === 'success' ? '✓ ' + message : '✗ ' + message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  async function approvePost(postId) {
    const textEl = document.getElementById('text-' + postId);
    const text = textEl ? textEl.innerText : null;
    showLoading();
    try {
      const res = await fetch('/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, text })
      });
      const data = await res.json();
      hideLoading();
      if (data.success) {
        showToast('Posted to LinkedIn!');
        document.getElementById('card-' + postId)?.remove();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) {
      hideLoading();
      showToast('Network error', 'error');
    }
  }

  async function saveEdit(postId) {
    const textEl = document.getElementById('text-' + postId);
    if (!textEl) return;
    const text = textEl.innerText;
    const res = await fetch('/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, text })
    });
    const data = await res.json();
    showToast(data.success ? 'Edits saved!' : 'Save failed', data.success ? 'success' : 'error');
  }

  async function rejectPost(postId) {
    if (!confirm('Reject and delete this post?')) return;
    const res = await fetch('/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Post rejected');
      document.getElementById('card-' + postId)?.remove();
    }
  }

  // Auto-refresh every 60 seconds
  setTimeout(() => location.reload(), 60000);
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const posts = await getPendingPosts();

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getHTML(posts));
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      const { postId, text } = JSON.parse(body);
      res.writeHead(200, { "Content-Type": "application/json" });

      if (req.url === "/approve") {
        // Update text if edited
        if (text) {
          const post = posts.find((p) => p.id === postId);
          if (post) {
            post.text = text;
            const fs = await import("fs/promises");
            const path = await import("path");
            const { fileURLToPath } = await import("url");
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            await fs.writeFile(
              path.join(__dirname, `../data/pending/${postId}.json`),
              JSON.stringify(post, null, 2)
            );
          }
        }
        const result = await approveAndPost(postId, await getPendingPosts());
        res.end(JSON.stringify(result));
      } else if (req.url === "/reject") {
        await deletePost(postId);
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === "/edit") {
        const post = posts.find((p) => p.id === postId);
        if (post) {
          post.text = text;
          const fs = await import("fs/promises");
          const path = await import("path");
          const { fileURLToPath } = await import("url");
          const __dirname = path.dirname(fileURLToPath(import.meta.url));
          await fs.writeFile(
            path.join(__dirname, `../data/pending/${postId}.json`),
            JSON.stringify(post, null, 2)
          );
          res.end(JSON.stringify({ success: true }));
        } else {
          res.end(JSON.stringify({ success: false }));
        }
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n🌐 Approval dashboard running at http://localhost:${PORT}`);
});
