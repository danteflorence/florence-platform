// Live-server load test. Spawns the real liveServer, then simulates full
// cohorts (1 instructor + N students) through the hot path: join → instructor
// opens a poll → every student answers at once → reveal. Reports fan-out and
// tally latency + server memory at each N, to find the single-process ceiling.
//
// Run (from api's sibling — the academy root):
//   node server/loadTest.mjs            # N = 50,100,200
//   node server/loadTest.mjs 100,300,500
//
// Not a vitest test (server/** is excluded); run it directly with node.

import { io } from "socket.io-client";
import { spawn, execSync } from "node:child_process";

const PORT = Number(process.env.LOAD_PORT ?? 5200);
const URL = `http://localhost:${PORT}`;
const NS = (process.argv[2] ?? "50,100,200").split(",").map((n) => Number(n.trim()));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => {
  if (!arr.length) return -1;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
async function waitUntil(pred, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pred()) return true;
    await wait(20);
  }
  return false;
}
function serverRssMB(pid) {
  try {
    const kb = Number(execSync(`ps -o rss= -p ${pid}`).toString().trim());
    return Math.round(kb / 1024);
  } catch {
    return -1;
  }
}
function newSocket() {
  return io(URL, { transports: ["websocket"], reconnection: false, forceNew: true });
}
function join(sock, room, role, name) {
  return new Promise((resolve, reject) => {
    const t = Date.now();
    const done = () =>
      sock.emit("join", { room, role, name }, (ack) =>
        ack?.ok ? resolve(Date.now() - t) : reject(new Error(ack?.error ?? "join failed")),
      );
    if (sock.connected) done();
    else sock.on("connect", done);
    sock.on("connect_error", reject);
  });
}

async function runN(N, pid) {
  const room = `LOAD${N}`;
  const joinLatencies = [];
  const pollRecv = [];
  const revealRecv = [];
  let pollT0 = 0;
  let revealT0 = 0;

  const instructor = newSocket();
  await join(instructor, room, "instructor", "Instructor");
  let answeredAt = 0;
  instructor.on("roster", (r) => {
    if (r?.answered >= N && !answeredAt) answeredAt = Date.now();
  });

  const students = await Promise.all(
    Array.from({ length: N }, async (_v, i) => {
      const s = newSocket();
      let seenPoll = null;
      s.on("snapshot", (snap) => {
        const p = snap?.poll;
        if (!p) return;
        if (p.id !== seenPoll && !p.revealed) {
          seenPoll = p.id;
          if (pollT0) pollRecv.push(Date.now() - pollT0);
        }
        if (p.revealed && revealT0) revealRecv.push(Date.now() - revealT0);
      });
      joinLatencies.push(await join(s, room, "student", `S${i}`));
      return s;
    }),
  );

  // 1) Poll broadcast fan-out
  pollT0 = Date.now();
  instructor.emit("poll:open", {
    prompt: "Load test question?",
    options: ["A", "B", "C", "D"],
    correct: [0],
    multi: false,
  });
  await waitUntil(() => pollRecv.length >= N, 8000);
  await wait(300);

  // 2) Everyone answers at once → instructor's live tally reaches N
  const answerT0 = Date.now();
  for (const s of students) s.emit("poll:answer", { choice: 1 });
  await waitUntil(() => answeredAt > 0, 10000);
  const tallyMs = answeredAt ? answeredAt - answerT0 : -1;

  // 3) Reveal fan-out
  revealT0 = Date.now();
  instructor.emit("poll:reveal");
  await waitUntil(() => revealRecv.length >= N, 8000);
  await wait(300);

  const rss = serverRssMB(pid);
  instructor.close();
  for (const s of students) s.close();
  await wait(400);

  return {
    N,
    joinP95: pct(joinLatencies, 95),
    pollP50: pct(pollRecv, 50),
    pollP95: pct(pollRecv, 95),
    pollGot: pollRecv.length,
    tallyMs,
    revealP95: pct(revealRecv, 95),
    revealGot: revealRecv.length,
    rss,
  };
}

const server = spawn("node", ["server/liveServer.mjs"], {
  env: { ...process.env, LIVE_PORT: String(PORT) },
  stdio: "ignore",
});
process.on("exit", () => server.kill());

// wait for health
let up = false;
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(`${URL}/health`);
    if (r.ok) {
      up = true;
      break;
    }
  } catch {
    /* not up yet */
  }
  await wait(100);
}
if (!up) {
  console.error("server did not start");
  server.kill();
  process.exit(1);
}

console.log(`\nLive-server load test — N = ${NS.join(", ")}  (pid ${server.pid})\n`);
console.log(
  ["N", "join p95", "poll p50", "poll p95", "got/N", "tally", "reveal p95", "got/N", "rssMB"]
    .map((h) => String(h).padStart(9))
    .join(""),
);
for (const N of NS) {
  try {
    const r = await runN(N, server.pid);
    console.log(
      [
        N,
        `${r.joinP95}ms`,
        `${r.pollP50}ms`,
        `${r.pollP95}ms`,
        `${r.pollGot}/${N}`,
        `${r.tallyMs}ms`,
        `${r.revealP95}ms`,
        `${r.revealGot}/${N}`,
        r.rss,
      ]
        .map((c) => String(c).padStart(9))
        .join(""),
    );
  } catch (e) {
    console.log(`${String(N).padStart(9)}   FAILED: ${e.message}`);
  }
}
console.log("\n(poll p50/p95 = time for the class to SEE the question; tally = time for");
console.log(" the instructor to see all N answers; got/N < N means dropped fan-out.)\n");
server.kill();
process.exit(0);
