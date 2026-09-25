// End-to-end check of the device ingest flow, doing exactly what the Android
// app does: announce → PUT mp4 with the returned headers → complete.
//
//   INGEST_TOKEN=... node scripts/test-ingest.mjs <baseUrl> <file.mp4>
//   e.g. node scripts/test-ingest.mjs http://localhost:3000 clip.mp4

import { readFile } from "node:fs/promises";

const [baseUrl, file] = process.argv.slice(2);
const token = process.env.INGEST_TOKEN;
if (!baseUrl || !file || !token) {
  console.error("usage: INGEST_TOKEN=... node scripts/test-ingest.mjs <baseUrl> <file.mp4>");
  process.exit(1);
}
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const announce = await fetch(`${baseUrl}/api/ingest/videos`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    deviceId: "test-script",
    deviceName: "Script de prueba",
    lat: -34.4559,
    lng: -58.9199,
    recordedAt: new Date().toISOString(),
    durationSec: 10,
  }),
});
console.log("announce", announce.status);
const ticket = await announce.json();
if (!announce.ok) throw new Error(JSON.stringify(ticket));
console.log("  id", ticket.id, "headers", Object.keys(ticket.headers).join(", "));

const body = await readFile(file);
const upload = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body });
console.log("PUT", upload.status, (await upload.text()).slice(0, 300));
if (!upload.ok) process.exit(1);

const complete = await fetch(`${baseUrl}/api/ingest/videos/${ticket.id}/complete`, {
  method: "POST",
  headers: auth,
});
console.log("complete", complete.status, await complete.text());
