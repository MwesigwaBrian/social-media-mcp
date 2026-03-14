import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TENOVIO_CONTEXT = `
Tenovio is a cloud-based property management platform built by Tenovio Technologies Inc.
It helps property managers manage tenants, maintenance requests, vendors, and documents in one system.
In simple terms: Tenovio connects tenants, property managers, and service vendors so maintenance issues, 
communication, and documents can be managed in one place.

Brand voice: Professional, innovative, helpful, modern. Target audience: Property managers, real estate 
professionals, landlords, and proptech enthusiasts on LinkedIn.
`;

const POST_THEMES = [
  "Feature spotlight - highlight a specific Tenovio feature",
  "Pain point solution - address a common property management challenge Tenovio solves",
  "Industry insight - share a trend or stat about proptech or property management",
  "Customer success angle - tell a story about how Tenovio transforms workflows",
  "Tips & value - actionable advice for property managers",
  "Company culture / behind the scenes at Tenovio Technologies",
];

export async function generatePost(slotIndex) {
  const theme = POST_THEMES[slotIndex % POST_THEMES.length];
  const timeSlots = ["Morning (8AM)", "Midday (12PM)", "Afternoon (3PM)", "Evening (6PM)"];
  const timeSlot = timeSlots[slotIndex % timeSlots.length];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a LinkedIn content strategist for Tenovio Technologies.

${TENOVIO_CONTEXT}

Write a compelling LinkedIn post for the ${timeSlot} slot.
Theme: ${theme}

Requirements:
- 150-250 words
- Engaging hook in the first line
- Use line breaks for readability
- Include 3-5 relevant hashtags at the end
- No emojis overload — max 2-3 tasteful ones
- Professional but conversational tone
- End with a clear CTA (call to action)

Return ONLY the post text, nothing else.`,
      },
    ],
  });

  const postText = response.content[0].text.trim();

  // Generate visual prompt
  const visualPrompt = await generateVisualDescription(postText, theme);

  return {
    id: `post_${Date.now()}_${slotIndex}`,
    text: postText,
    theme,
    timeSlot,
    visualPrompt,
    visualSvg: generateSVGVisual(theme, slotIndex),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

async function generateVisualDescription(postText, theme) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Based on this LinkedIn post about Tenovio property management software, write a 1-sentence visual description for a professional graphic designer:

Post: ${postText.substring(0, 200)}...
Theme: ${theme}

Write ONLY the visual description, 1 sentence.`,
      },
    ],
  });
  return response.content[0].text.trim();
}

function generateSVGVisual(theme, slotIndex) {
  const palettes = [
    { bg: "#0F2B5B", accent: "#00C2FF", text: "#FFFFFF", secondary: "#1E4A9E" },
    { bg: "#0A1628", accent: "#4FFFB0", text: "#FFFFFF", secondary: "#163A6B" },
    { bg: "#1A0A3B", accent: "#FF6B6B", text: "#FFFFFF", secondary: "#2D1065" },
    { bg: "#0D1F1A", accent: "#FFD700", text: "#FFFFFF", secondary: "#1A3D30" },
  ];

  const themeIcons = [
    // Feature spotlight - building with wifi
    `<rect x="180" y="140" width="140" height="120" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>
     <rect x="200" y="160" width="20" height="20" rx="3" fill="currentColor" opacity="0.7"/>
     <rect x="240" y="160" width="20" height="20" rx="3" fill="currentColor" opacity="0.7"/>
     <rect x="280" y="160" width="20" height="20" rx="3" fill="currentColor" opacity="0.7"/>
     <rect x="220" y="220" width="60" height="40" rx="4" fill="currentColor" opacity="0.5"/>
     <path d="M250 90 Q290 70 330 90" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
     <path d="M250 105 Q280 90 310 105" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
     <circle cx="250" cy="118" r="5" fill="currentColor"/>`,

    // Pain point - checkmark shield
    `<path d="M250 120 L250 240 Q250 260 230 270 L210 260 Q180 245 180 220 L180 140 Q180 130 190 130 Z" fill="none" stroke="currentColor" stroke-width="3"/>
     <path d="M250 120 L250 240 Q250 260 270 270 L290 260 Q320 245 320 220 L320 140 Q320 130 310 130 Z" fill="none" stroke="currentColor" stroke-width="3"/>
     <path d="M215 195 L238 218 L285 171" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,

    // Industry insight - chart bars
    `<line x1="170" y1="270" x2="340" y2="270" stroke="currentColor" stroke-width="2.5"/>
     <rect x="185" y="220" width="30" height="50" rx="4" fill="currentColor" opacity="0.4"/>
     <rect x="225" y="190" width="30" height="80" rx="4" fill="currentColor" opacity="0.6"/>
     <rect x="265" y="160" width="30" height="110" rx="4" fill="currentColor" opacity="0.8"/>
     <rect x="305" y="175" width="30" height="95" rx="4" fill="currentColor" opacity="0.7"/>
     <polyline points="200,218 240,188 280,158 320,173" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,

    // Customer success - people connected
    `<circle cx="250" cy="155" r="28" fill="none" stroke="currentColor" stroke-width="3"/>
     <circle cx="175" cy="225" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <circle cx="325" cy="225" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/>
     <line x1="222" y1="170" x2="197" y2="203" stroke="currentColor" stroke-width="2" opacity="0.6"/>
     <line x1="278" y1="170" x2="303" y2="203" stroke="currentColor" stroke-width="2" opacity="0.6"/>
     <line x1="197" y1="225" x2="303" y2="225" stroke="currentColor" stroke-width="2" opacity="0.4" stroke-dasharray="6,4"/>`,
  ];

  const p = palettes[slotIndex % palettes.length];
  const icon = themeIcons[slotIndex % themeIcons.length];

  return `<svg width="1200" height="628" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg" font-family="Georgia, serif">
  <defs>
    <linearGradient id="bg${slotIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${p.bg}"/>
      <stop offset="100%" style="stop-color:${p.secondary}"/>
    </linearGradient>
    <linearGradient id="accent${slotIndex}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${p.accent};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${p.accent};stop-opacity:0.6"/>
    </linearGradient>
    <filter id="glow${slotIndex}">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="clip${slotIndex}">
      <rect width="1200" height="628" rx="0"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="628" fill="url(#bg${slotIndex})"/>

  <!-- Decorative circles -->
  <circle cx="980" cy="80" r="180" fill="${p.accent}" opacity="0.05"/>
  <circle cx="1050" cy="500" r="120" fill="${p.accent}" opacity="0.07"/>
  <circle cx="100" cy="550" r="200" fill="${p.secondary}" opacity="0.3"/>

  <!-- Grid dots pattern -->
  ${Array.from({length: 8}, (_, i) => Array.from({length: 5}, (_, j) =>
    `<circle cx="${750 + i*60}" cy="${80 + j*60}" r="2" fill="${p.accent}" opacity="0.15"/>`
  ).join('')).join('')}

  <!-- Left accent bar -->
  <rect x="0" y="0" width="6" height="628" fill="url(#accent${slotIndex})"/>

  <!-- Top accent line -->
  <rect x="6" y="0" width="500" height="3" fill="${p.accent}" opacity="0.6"/>

  <!-- Icon area (right side) -->
  <g transform="translate(680, 94)" color="${p.accent}" filter="url(#glow${slotIndex})" opacity="0.85">
    <svg width="500" height="440" viewBox="150 100 250 220">
      ${icon}
    </svg>
  </g>

  <!-- Decorative ring around icon -->
  <circle cx="870" cy="314" r="170" fill="none" stroke="${p.accent}" stroke-width="1" opacity="0.15" stroke-dasharray="8,6"/>
  <circle cx="870" cy="314" r="195" fill="none" stroke="${p.accent}" stroke-width="0.5" opacity="0.08"/>

  <!-- Main content area -->
  <!-- Tenovio logo mark -->
  <rect x="60" y="60" width="44" height="44" rx="10" fill="${p.accent}" opacity="0.9"/>
  <text x="82" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="${p.bg}">T</text>

  <!-- Company name -->
  <text x="116" y="88" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="${p.text}" letter-spacing="3" opacity="0.9">TENOVIO</text>
  <text x="116" y="104" font-family="Arial, sans-serif" font-size="10" fill="${p.accent}" letter-spacing="2" opacity="0.8">TECHNOLOGIES INC.</text>

  <!-- Divider -->
  <rect x="60" y="130" width="280" height="1" fill="${p.accent}" opacity="0.3"/>

  <!-- Tagline -->
  <text x="60" y="175" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="${p.text}" opacity="0.95">Property</text>
  <text x="60" y="225" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="${p.text}" opacity="0.95">Management,</text>
  <text x="60" y="275" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="${p.accent}">Reimagined.</text>

  <!-- Description -->
  <text x="60" y="330" font-family="Arial, sans-serif" font-size="15" fill="${p.text}" opacity="0.7">Tenants · Maintenance · Vendors · Documents</text>
  <text x="60" y="352" font-family="Arial, sans-serif" font-size="15" fill="${p.text}" opacity="0.7">— all in one powerful platform.</text>

  <!-- Bottom accent -->
  <rect x="60" y="400" width="60" height="3" rx="2" fill="${p.accent}"/>

  <!-- Website -->
  <text x="60" y="445" font-family="Arial, sans-serif" font-size="14" fill="${p.accent}" opacity="0.9" letter-spacing="1">www.tenovio.com</text>

  <!-- Bottom bar -->
  <rect x="0" y="598" width="1200" height="30" fill="${p.accent}" opacity="0.08"/>
  <text x="600" y="618" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="${p.text}" opacity="0.4" letter-spacing="2">TENOVIO TECHNOLOGIES INC. — CLOUD PROPERTY MANAGEMENT</text>
</svg>`;
}

export async function savePendingPost(post) {
  const dataDir = path.join(__dirname, "../data/pending");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, `${post.id}.json`),
    JSON.stringify(post, null, 2)
  );
}

export async function getPendingPosts() {
  const dataDir = path.join(__dirname, "../data/pending");
  await fs.mkdir(dataDir, { recursive: true });
  const files = await fs.readdir(dataDir);
  const posts = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const content = await fs.readFile(path.join(dataDir, file), "utf-8");
    posts.push(JSON.parse(content));
  }
  return posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function updatePostStatus(postId, status) {
  const dataDir = path.join(__dirname, "../data/pending");
  const filePath = path.join(dataDir, `${postId}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  const post = JSON.parse(content);
  post.status = status;
  post.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(post, null, 2));
  return post;
}

export async function deletePost(postId) {
  const dataDir = path.join(__dirname, "../data/pending");
  await fs.unlink(path.join(dataDir, `${postId}.json`));
}
