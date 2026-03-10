import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "scheduled.json");
let store = {};
export function getStore() { return store; }
export async function loadSchedules() {
  try {
    if (existsSync(STORE_PATH)) { store = JSON.parse(await readFile(STORE_PATH, "utf-8")); }
    else { store = {}; }
  } catch(e) { store = {}; }
  const { restoreScheduledJobs } = await import("./social.js");
  await restoreScheduledJobs();
}
export async function saveSchedules() {
  try {
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch(e) { console.error("Save failed:", e.message); }
}
