#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { postToLinkedIn, schedulePost, getScheduledPosts, cancelScheduledPost } from "./social.js";
import { loadSchedules } from "./store.js";

const server = new Server(
  { name: "social-media-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "post_to_linkedin", description: "Post to LinkedIn immediately.", inputSchema: { type: "object", properties: { content: { type: "string" }, visibility: { type: "string", enum: ["PUBLIC","CONNECTIONS"] } }, required: ["content"] } },
    { name: "schedule_post", description: "Schedule a post.", inputSchema: { type: "object", properties: { platform: { type: "string", enum: ["linkedin"] }, content: { type: "string" }, scheduled_time: { type: "string" }, visibility: { type: "string", enum: ["PUBLIC","CONNECTIONS"] } }, required: ["platform","content","scheduled_time"] } },
    { name: "list_scheduled_posts", description: "List scheduled posts.", inputSchema: { type: "object", properties: { platform: { type: "string", enum: ["linkedin","all"] } }, required: [] } },
    { name: "cancel_scheduled_post", description: "Cancel a scheduled post.", inputSchema: { type: "object", properties: { post_id: { type: "string" } }, required: ["post_id"] } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "post_to_linkedin": {
        const r = await postToLinkedIn(args.content, args.visibility ?? "PUBLIC");
        return { content: [{ type: "text", text: "Posted! ID: " + r.id + " URL: " + r.url }] };
      }
      case "schedule_post": {
        const t = new Date(args.scheduled_time);
        if (isNaN(t.getTime())) throw new Error("Invalid scheduled_time");
        if (t <= new Date()) throw new Error("scheduled_time must be in the future");
        const j = await schedulePost({ platform: args.platform, content: args.content, scheduledAt: t, visibility: args.visibility ?? "PUBLIC" });
        return { content: [{ type: "text", text: "Scheduled! ID: " + j.id + " at " + t.toISOString() }] };
      }
      case "list_scheduled_posts": {
        const posts = await getScheduledPosts(args.platform ?? "all");
        if (!posts.length) return { content: [{ type: "text", text: "No scheduled posts." }] };
        return { content: [{ type: "text", text: posts.map((p,i) => (i+1)+". ["+p.id+"] "+p.platform+" @ "+p.scheduledAt).join("\n") }] };
      }
      case "cancel_scheduled_post": {
        const ok = await cancelScheduledPost(args.post_id);
        return { content: [{ type: "text", text: ok ? "Cancelled: "+args.post_id : "Not found: "+args.post_id }] };
      }
      default: throw new Error("Unknown tool: " + name);
    }
  } catch(e) { return { content: [{ type: "text", text: "Error: "+e.message }], isError: true }; }
});

async function main() {
  await loadSchedules();
  await server.connect(new StdioServerTransport());
  console.error("MCP Server running");
}
main().catch(e => { console.error(e); process.exit(1); });
