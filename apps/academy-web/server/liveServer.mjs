// ───────────────────────────────────────────────────────────────────────────
// Florence Academy — live class server (Phase B+).
//
// A tiny Socket.IO server that keeps cohort "rooms" in sync so an instructor
// teaching live can drive every student's slide deck at once. State is in
// memory only (no DB, no persistence) — a session lasts as long as the class.
//
// Run locally:  node server/liveServer.mjs   (LIVE_PORT overrides the port)
// Health check: GET http://localhost:5179/health
//
// Protocol (see src/lib/liveProtocol.ts for the typed client mirror):
//   client → server
//     join  { room, role, name }            → ack { ok, snapshot }
//     nav   { index }                        (instructor only)
//     lock  { locked }                       (instructor only)
//     poll:open  { question }                (instructor only)  [Phase C]
//     poll:answer { choice }                 (student)          [Phase C]
//     poll:reveal {}                         (instructor only)  [Phase C]
//     poll:close  {}                         (instructor only)  [Phase C]
//   server → client (room broadcast)
//     snapshot  RoomSnapshot                 (on every change)
// ───────────────────────────────────────────────────────────────────────────

import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  choicesOf,
  isPollCorrect,
  recordPollOutcome,
  summarizePollStats,
} from "./liveScoring.mjs";

// Cloud Run injects PORT; LIVE_PORT is the local/compose override; 5179 is the dev default.
const PORT = Number(process.env.PORT ?? process.env.LIVE_PORT ?? 5179);

// ── Poll persistence (optional, env-gated) ──────────────────────────────────
// When configured, graded poll outcomes persist to the Data API as
// kind:"live_poll" assessment results so classroom checks-for-understanding
// feed readiness + the instructor copilot instead of vanishing at class end.
//   DATA_API_URL             e.g. http://localhost:8088 (also enables student
//                            token verification at join)
//   LIVE_API_CLIENT_ID/      an M2M client with performance:write (posting is
//   LIVE_API_CLIENT_SECRET   disabled without it; verification still works)
// All unset (the default) → the server behaves exactly as before: in-memory
// only, nothing leaves the process.
const DATA_API_URL = (process.env.DATA_API_URL ?? "").replace(/\/$/, "");
const LIVE_API_CLIENT_ID = process.env.LIVE_API_CLIENT_ID ?? "";
const LIVE_API_CLIENT_SECRET = process.env.LIVE_API_CLIENT_SECRET ?? "";
const persistEnabled = Boolean(DATA_API_URL && LIVE_API_CLIENT_ID && LIVE_API_CLIENT_SECRET);

/** Resolve a student's candidate id from their academy session token - the
 *  client never self-asserts an identity. Returns null on any failure. */
async function verifyCandidate(token) {
  if (!DATA_API_URL || !token) return null;
  try {
    const res = await fetch(`${DATA_API_URL}/v1/me`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const me = await res.json();
    return typeof me?.id === "string" && me.id ? me.id : null;
  } catch {
    return null;
  }
}

/** Mint a short-lived M2M token for posting results. */
async function mintApiToken() {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: LIVE_API_CLIENT_ID,
    client_secret: LIVE_API_CLIENT_SECRET,
    scope: "performance:write",
  });
  const res = await fetch(`${DATA_API_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`oauth/token ${res.status}`);
  const j = await res.json();
  if (!j?.access_token) throw new Error("oauth/token: no access_token");
  return j.access_token;
}

/** POST one kind:"live_poll" assessment result per candidate who answered a
 *  graded poll this class. Fire-and-forget from room GC; failures only log -
 *  a flaky API must never take the live class server down with it. */
async function flushPollStats(room) {
  if (!persistEnabled || !room.pollStats || room.pollStats.size === 0) return;
  const rows = summarizePollStats(room.pollStats);
  if (rows.length === 0) return;
  try {
    const token = await mintApiToken();
    let sent = 0;
    for (const row of rows) {
      const res = await fetch(`${DATA_API_URL}/v1/assessment-results`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          // One result per candidate per class run, even if GC double-fires.
          "idempotency-key": `live:${room.code}:${room.startedAt}:${row.candidate_id}`,
        },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) sent += 1;
      else console.error(`[florence-live] poll persist ${row.candidate_id}: ${res.status}`);
    }
    console.log(`[florence-live] room ${room.code}: persisted poll results for ${sent}/${rows.length} students`);
  } catch (e) {
    console.error(`[florence-live] poll persist failed for room ${room.code}: ${e.message}`);
  }
}

// A live poll reveals its answer automatically after this long, no matter what
// the instructor does — so the class always sees the answer + rationale in a
// predictable beat. The instructor can still reveal sooner. Defaults to 60s;
// POLL_AUTO_REVEAL_MS overrides it (used by the integration smoke test).
const POLL_AUTO_REVEAL_MS = process.env.POLL_AUTO_REVEAL_MS
  ? Number(process.env.POLL_AUTO_REVEAL_MS)
  : 60_000;

// When the last member leaves, keep the room (and its live poll) alive briefly
// so a reconnecting instructor or student rejoins the *same* class instead of a
// blank one. Cancelled the instant anyone rejoins. ROOM_GRACE_MS overrides it.
const ROOM_GRACE_MS = process.env.ROOM_GRACE_MS
  ? Number(process.env.ROOM_GRACE_MS)
  : 30_000;

// High-frequency updates (every student's answer, every disconnect) are
// coalesced into one emit per this window instead of one broadcast PER event —
// turns the poll-answer/leave fan-out from O(N²) into O(N). 120ms reads as live.
const FLUSH_MS = process.env.FLUSH_MS ? Number(process.env.FLUSH_MS) : 120;

// Per-instance capacity guards. Past these, joins/connections are refused with a
// clear error instead of degrading the whole instance. Scale OUT past them by
// running more instances with room-affinity routing (see SCALING.md).
const MAX_ROOMS = Number(process.env.MAX_ROOMS ?? 1000);
const MAX_ROOM_MEMBERS = Number(process.env.MAX_ROOM_MEMBERS ?? 1000);
const MAX_SOCKETS = Number(process.env.MAX_SOCKETS ?? 20000);

/** @type {Map<string, Room>} room code → state */
const rooms = new Map();

/**
 * @typedef {Object} Member
 * @property {"instructor"|"student"} role
 * @property {string} name
 *
 * @typedef {Object} Room
 * @property {string} code
 * @property {number} index           current slide the instructor is on
 * @property {boolean} locked         students follow when true
 * @property {Poll|null} poll         active live poll (Phase C)
 * @property {ReturnType<typeof setTimeout>|null} pollTimer  60s auto-reveal handle
 * @property {ReturnType<typeof setTimeout>|null} gcTimer    empty-room cleanup handle
 * @property {Map<string, Member>} members  socket.id → member
 */

function getRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    room = {
      code,
      index: 0,
      locked: true,
      poll: null,
      pollTimer: null,
      gcTimer: null,
      flushTimer: null,
      flushScope: null,
      qa: [], // live Q&A: [{ id, name, text, at, answered }]
      members: new Map(),
      // Poll persistence: per-candidate graded outcomes for this class run
      // (candidateId → {taken, correct, byCjmm}), flushed to the Data API at GC.
      pollStats: new Map(),
      startedAt: Date.now(),
    };
    rooms.set(code, room);
  } else if (room.gcTimer) {
    // Someone rejoined inside the grace window — cancel the pending cleanup so
    // the class (and any live poll) is preserved exactly as they left it.
    clearTimeout(room.gcTimer);
    room.gcTimer = null;
  }
  return room;
}

function presence(room) {
  let instructors = 0;
  let students = 0;
  for (const m of room.members.values()) {
    if (m.role === "instructor") instructors += 1;
    else students += 1;
  }
  return { instructors, students, total: room.members.size };
}

/** Public, serialisable view of a room sent to every client on each change. */
function snapshot(room) {
  return {
    room: room.code,
    index: room.index,
    locked: room.locked,
    presence: presence(room),
    poll: pollView(room.poll),
  };
}

/** Strip per-respondent detail; students see only aggregate counts. */
function pollView(poll) {
  if (!poll) return null;
  return {
    id: poll.id,
    slideIndex: poll.slideIndex,
    prompt: poll.prompt,
    options: poll.options,
    correct: poll.revealed ? poll.correct : null,
    revealed: poll.revealed,
    open: poll.open,
    counts: poll.options.map((_, i) => poll.answers.get(i)?.size ?? 0),
    total: countAnswers(poll),
    // CJMM step primes thinking without naming the answer → always sent.
    cjmm: poll.cjmm,
    // Rationale + reference can name the answer → withheld until reveal.
    rationale: poll.revealed ? poll.rationale : undefined,
    reference: poll.revealed ? poll.reference : undefined,
  };
}

function countAnswers(poll) {
  let n = 0;
  for (const set of poll.answers.values()) n += set.size;
  return n;
}

/**
 * Instructor-only live roster: every connected student and what they picked on
 * the active poll, in join order. Sent only to the room's `:staff` sub-room, so
 * students never see classmate answers (privacy + no herding). The instructor
 * may see correctness before the public reveal — it helps them read the room.
 */
function rosterView(room) {
  const poll = room.poll;
  // socketId → picked option indexes
  const picks = new Map();
  if (poll) {
    for (const [idx, set] of poll.answers.entries()) {
      for (const sid of set) {
        if (!picks.has(sid)) picks.set(sid, []);
        picks.get(sid).push(idx);
      }
    }
  }
  const correctSet = new Set(poll ? poll.correct : []);
  const students = [];
  let answered = 0;
  for (const [sid, m] of room.members.entries()) {
    if (m.role !== "student") continue;
    const chosen = picks.get(sid) ?? [];
    const has = chosen.length > 0;
    if (has) answered += 1;
    let correct = null;
    if (poll && has) {
      if (poll.multi) {
        const right = chosen.filter((c) => correctSet.has(c)).length;
        correct = right === correctSet.size && right === chosen.length;
      } else {
        correct = correctSet.has(chosen[0]);
      }
    }
    students.push({
      name: m.name,
      answered: has,
      choice: has ? chosen[0] : null,
      choices: chosen,
      correct,
    });
  }
  return {
    pollId: poll ? poll.id : null,
    revealed: poll ? poll.revealed : false,
    students,
    answered,
    total: students.length,
  };
}

function broadcast(room) {
  // An immediate full broadcast supersedes any coalesced flush in flight.
  if (room.flushTimer) {
    clearTimeout(room.flushTimer);
    room.flushTimer = null;
    room.flushScope = null;
  }
  io.to(room.code).emit("snapshot", snapshot(room));
  // Roster rides along on every change, but only to instructors (the staff room).
  io.to(`${room.code}:staff`).emit("roster", rosterView(room));
}

// Coalesced update. `scope: "staff"` (a student answered → only the instructor
// needs the live tally; classmates must NOT see counts pre-reveal anyway).
// `scope: "all"` (presence changed → everyone's headcount updates). The most
// inclusive scope requested within the window wins.
function flush(room) {
  const scope = room.flushScope;
  room.flushTimer = null;
  room.flushScope = null;
  if (scope === "all") io.to(room.code).emit("snapshot", snapshot(room));
  else io.to(`${room.code}:staff`).emit("snapshot", snapshot(room));
  io.to(`${room.code}:staff`).emit("roster", rosterView(room));
}
function scheduleFlush(room, scope) {
  if (scope === "all") room.flushScope = "all";
  else if (!room.flushScope) room.flushScope = "staff";
  if (!room.flushTimer) room.flushTimer = setTimeout(() => flush(room), FLUSH_MS);
}

/** Cancel a room's pending auto-reveal timer, if any. */
function clearPollTimer(room) {
  if (room.pollTimer) {
    clearTimeout(room.pollTimer);
    room.pollTimer = null;
  }
}

/**
 * Schedule an emptied room for cleanup after ROOM_GRACE_MS. If anyone rejoins in
 * that window, getRoom() cancels it — so a brief disconnect never wipes a class
 * mid-session. A no-op if a cleanup is already pending.
 */
function scheduleRoomGc(room) {
  if (room.gcTimer) return;
  room.gcTimer = setTimeout(() => {
    clearPollTimer(room);
    if (room.flushTimer) clearTimeout(room.flushTimer);
    // Class is over: persist this run's graded poll outcomes (no-op unless
    // DATA_API_URL + LIVE_API_CLIENT_* are configured).
    void flushPollStats(room);
    rooms.delete(room.code);
  }, ROOM_GRACE_MS);
}

/** Reveal the room's poll to everyone (manual button or the 60s timer). */
function revealPoll(room) {
  clearPollTimer(room);
  if (!room.poll) return;
  room.poll.revealed = true;
  room.poll.open = false;
  recordPollForPersistence(room);
  broadcast(room);
}

/** At reveal (answers are frozen), accumulate one graded outcome per verified
 *  student into the room's pollStats. Ungraded polls and anonymous students
 *  are skipped; a poll records at most once (reveal can fire via timer AND
 *  button). Never touches what students see. */
function recordPollForPersistence(room) {
  const poll = room.poll;
  if (!poll || poll.recorded || !Array.isArray(poll.correct) || poll.correct.length === 0) return;
  poll.recorded = true;
  for (const [socketId, member] of room.members.entries()) {
    if (member.role !== "student" || !member.candidateId) continue;
    const choices = choicesOf(poll.answers, socketId);
    if (choices.length === 0) continue; // never answered → no signal
    recordPollOutcome(
      room.pollStats,
      member.candidateId,
      isPollCorrect(poll.correct, choices, poll.multi),
      poll.cjmm,
    );
  }
}

const httpServer = createServer((req, res) => {
  // Lightweight health endpoint so tooling can confirm the port is live.
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    });
    res.end(
      JSON.stringify({ ok: true, service: "florence-academy-live", rooms: rooms.size }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  // Local dev: reflect the requesting origin (Vite preview/dev ports).
  cors: { origin: true, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  // Hard ceiling on concurrent sockets for this instance.
  if (io.engine.clientsCount > MAX_SOCKETS) {
    socket.emit("fatal", { error: "Server is at capacity." });
    socket.disconnect(true);
    return;
  }

  /** @type {{code:string, role:"instructor"|"student", name:string}|null} */
  let joined = null;

  const instructorOnly = () =>
    joined && joined.role === "instructor" ? rooms.get(joined.code) : null;

  socket.on("join", (payload, ack) => {
    const code = String(payload?.room ?? "").trim().toUpperCase().slice(0, 12);
    const role = payload?.role === "instructor" ? "instructor" : "student";
    const name = String(payload?.name ?? "").slice(0, 40);
    if (!code) {
      ack?.({ ok: false, error: "A room code is required." });
      return;
    }
    // Capacity: refuse a brand-new room past the room cap, or a full class.
    if (!rooms.has(code) && rooms.size >= MAX_ROOMS) {
      ack?.({ ok: false, error: "Server is at room capacity." });
      return;
    }
    const room = getRoom(code);
    if (!room.members.has(socket.id) && room.members.size >= MAX_ROOM_MEMBERS) {
      ack?.({ ok: false, error: "This class is full." });
      return;
    }
    joined = { code, role, name };
    room.members.set(socket.id, { role, name });
    // Signed-in students: resolve their candidate id from the session token
    // they handed us (verified against the Data API - never self-asserted).
    // Async on purpose: the join ack never waits on an HTTP round-trip, and
    // the id is only needed later, at poll reveal.
    if (role === "student" && typeof payload?.token === "string" && payload.token) {
      void verifyCandidate(payload.token).then((candidateId) => {
        if (!candidateId) return;
        const m = rooms.get(code)?.members.get(socket.id);
        if (m) m.candidateId = candidateId;
      });
    }
    socket.join(code);
    // Instructors also join the staff sub-room that carries the live roster.
    if (role === "instructor") socket.join(`${code}:staff`);
    ack?.({ ok: true, snapshot: snapshot(room) });
    broadcast(room);
    // Hand the joiner the current Q&A so late arrivals see what's been asked.
    socket.emit("qa", { items: room.qa });
  });

  socket.on("nav", (payload) => {
    const room = instructorOnly();
    if (!room) return;
    const idx = Number(payload?.index);
    if (!Number.isFinite(idx) || idx < 0) return;
    room.index = Math.floor(idx);
    broadcast(room);
  });

  socket.on("lock", (payload) => {
    const room = instructorOnly();
    if (!room) return;
    room.locked = !!payload?.locked;
    broadcast(room);
  });

  // ── Live poll (Phase C) ───────────────────────────────────────────────
  socket.on("poll:open", (payload) => {
    const room = instructorOnly();
    if (!room) return;
    const options = Array.isArray(payload?.options) ? payload.options : [];
    if (options.length < 2) return;
    room.poll = {
      id: `poll-${Date.now()}`,
      slideIndex: Number.isFinite(payload?.slideIndex)
        ? Math.floor(payload.slideIndex)
        : room.index,
      prompt: String(payload?.prompt ?? "").slice(0, 600),
      options: options.map((o) => String(o).slice(0, 400)),
      correct: Array.isArray(payload?.correct)
        ? payload.correct.map((n) => Math.floor(Number(n))).filter((n) => n >= 0)
        : [],
      multi: !!payload?.multi,
      // Teaching payload: surfaced on reveal (rationale/reference) or always (cjmm).
      cjmm: payload?.cjmm ? String(payload.cjmm).slice(0, 40) : undefined,
      rationale: payload?.rationale
        ? String(payload.rationale).slice(0, 2000)
        : undefined,
      reference: payload?.reference
        ? String(payload.reference).slice(0, 300)
        : undefined,
      answers: new Map(), // choiceIndex → Set<socketId>
      revealed: false,
      open: true,
    };
    // Arm the 60s auto-reveal: the room sees the answer on a predictable beat
    // even if the instructor never clicks Reveal. Replaces any prior timer.
    clearPollTimer(room);
    room.pollTimer = setTimeout(() => revealPoll(room), POLL_AUTO_REVEAL_MS);
    broadcast(room);
  });

  socket.on("poll:answer", (payload) => {
    if (!joined) return;
    const room = rooms.get(joined.code);
    if (!room?.poll?.open) return;
    const poll = room.poll;
    const choices = Array.isArray(payload?.choices)
      ? payload.choices
      : [payload?.choice];
    // One vote per student: clear this socket's previous picks first.
    for (const set of poll.answers.values()) set.delete(socket.id);
    for (const c of choices) {
      const idx = Math.floor(Number(c));
      if (idx < 0 || idx >= poll.options.length) continue;
      if (!poll.answers.has(idx)) poll.answers.set(idx, new Set());
      poll.answers.get(idx).add(socket.id);
      if (!poll.multi) break; // single-choice: take the first valid pick
    }
    // Staff-only + coalesced: the instructor's tally updates ~8×/sec no matter
    // how many answer at once; students get nothing (they can't see counts yet).
    scheduleFlush(room, "staff");
  });

  socket.on("poll:reveal", () => {
    const room = instructorOnly();
    if (!room?.poll) return;
    revealPoll(room);
  });

  socket.on("poll:close", () => {
    const room = instructorOnly();
    if (!room) return;
    clearPollTimer(room);
    room.poll = null;
    broadcast(room);
  });

  // ── Live Q&A ────────────────────────────────────────────────────────────
  socket.on("qa:ask", (payload) => {
    if (!joined) return;
    const room = rooms.get(joined.code);
    if (!room) return;
    const text = String(payload?.text ?? "").trim().slice(0, 500);
    if (!text) return;
    if (room.qa.length >= 500) room.qa.shift(); // cap in-memory backlog
    room.qa.push({
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      name: joined.name || (joined.role === "instructor" ? "Instructor" : "Student"),
      text,
      at: Date.now(),
      answered: false,
    });
    io.to(room.code).emit("qa", { items: room.qa });
  });

  socket.on("qa:answer", (payload) => {
    const room = instructorOnly();
    if (!room) return;
    const item = room.qa.find((q) => q.id === String(payload?.id ?? ""));
    if (item) {
      item.answered = true;
      io.to(room.code).emit("qa", { items: room.qa });
    }
  });

  socket.on("disconnect", () => {
    if (!joined) return;
    const room = rooms.get(joined.code);
    if (!room) return;
    room.members.delete(socket.id);
    if (room.poll) {
      for (const set of room.poll.answers.values()) set.delete(socket.id);
    }
    if (room.members.size === 0) {
      // Keep the room briefly so a reconnecting client rejoins the same class;
      // scheduleRoomGc() deletes it (and clears timers) if no one comes back.
      scheduleRoomGc(room);
    } else {
      // Coalesced full update so a mass leave (class ends) stays O(N), not O(N²).
      scheduleFlush(room, "all");
    }
  });
});

// Horizontal scaling: when REDIS_URL is set, attach the Socket.IO Redis adapter
// so emits fan out across instances. `redis` + `@socket.io/redis-adapter` are
// optional deps, imported lazily so the single-process default needs nothing.
//
// IMPORTANT: room STATE (index, poll, answers) lives in this process's memory,
// so a multi-instance deployment must route all sockets for a given room to the
// SAME instance (room-affinity at the load balancer). The adapter then carries
// cross-instance delivery. See SCALING.md.
async function attachRedisAdapter() {
  if (!process.env.REDIS_URL) return "single-process";
  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { createClient } = await import("redis");
    const pub = createClient({ url: process.env.REDIS_URL });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    io.adapter(createAdapter(pub, sub));
    return "redis";
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `[florence-live] REDIS_URL set but adapter unavailable: ${e.message} — run \`npm i @socket.io/redis-adapter redis\``,
    );
    return "single-process (redis unavailable)";
  }
}

const scaleMode = await attachRedisAdapter();
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[florence-live] listening on http://localhost:${PORT} (${scaleMode})`);
});
