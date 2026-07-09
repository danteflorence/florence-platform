// Verifies the per-instance capacity guards (member + room caps). Spawns the
// live server with tiny caps and asserts joins past them are refused with a
// clear error. Run: `node server/scaleTest.mjs`.

import { io } from "socket.io-client";
import { spawn } from "node:child_process";

const PORT = Number(process.env.SCALE_PORT ?? 5201);
const URL = `http://localhost:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn("node", ["server/liveServer.mjs"], {
  env: { ...process.env, LIVE_PORT: String(PORT), MAX_ROOM_MEMBERS: "3", MAX_ROOMS: "2" },
  stdio: "ignore",
});
process.on("exit", () => server.kill());

let up = false;
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${URL}/health`)).ok) {
      up = true;
      break;
    }
  } catch {
    /* not up */
  }
  await wait(100);
}
if (!up) {
  console.error("server did not start");
  server.kill();
  process.exit(1);
}

function joinResult(room) {
  return new Promise((resolve) => {
    const s = io(URL, { transports: ["websocket"], reconnection: false, forceNew: true });
    s.on("connect", () =>
      s.emit("join", { room, role: "student", name: "x" }, (ack) => resolve(ack)),
    );
    s.on("connect_error", () => resolve({ ok: false, error: "connect_error" }));
  });
}

let passed = 0;
const ok = (l) => {
  passed++;
  console.log(`  ✓ ${l}`);
};

try {
  const a = await joinResult("ROOMA");
  const b = await joinResult("ROOMA");
  const c = await joinResult("ROOMA");
  if (!(a.ok && b.ok && c.ok)) throw new Error("first 3 joins should succeed");
  ok("members up to MAX_ROOM_MEMBERS join");

  const d = await joinResult("ROOMA");
  if (d.ok || !/full/i.test(d.error)) throw new Error("4th join should be rejected as full");
  ok("member past cap → rejected (class full)");

  const e = await joinResult("ROOMB"); // 2nd room (== MAX_ROOMS) allowed
  if (!e.ok) throw new Error("2nd room should be allowed");
  const f = await joinResult("ROOMC"); // 3rd new room → over MAX_ROOMS
  if (f.ok || !/capacity/i.test(f.error)) throw new Error("3rd room should be rejected");
  ok("new room past MAX_ROOMS → rejected (capacity)");

  console.log(`\nPASS — ${passed} checks`);
  server.kill();
  process.exit(0);
} catch (err) {
  console.error("\nFAIL:", err.message);
  server.kill();
  process.exit(1);
}
