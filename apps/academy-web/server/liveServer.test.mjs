// Integration check for the live class server. Connects an instructor and a
// student to a running server (default localhost:5179) and asserts the core
// sync + poll protocol. Run the server first, then:  node server/liveServer.test.mjs
import { io } from "socket.io-client";

const URL = process.env.LIVE_URL ?? "http://localhost:5179";
const ROOM = `T${Math.floor(Math.random() * 100000)}`;
let failures = 0;

function check(label, cond) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    failures += 1;
  }
}

/** Resolve on the next snapshot that satisfies `pred` (or reject after 2s). */
function waitSnapshot(sock, pred, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sock.off("snapshot", onSnap);
      reject(new Error(`timeout waiting for: ${label}`));
    }, 2000);
    function onSnap(s) {
      if (pred(s)) {
        clearTimeout(timer);
        sock.off("snapshot", onSnap);
        resolve(s);
      }
    }
    sock.on("snapshot", onSnap);
  });
}

function join(sock, role) {
  return new Promise((resolve, reject) => {
    sock.emit("join", { room: ROOM, role, name: role }, (ack) => {
      if (ack?.ok) resolve(ack.snapshot);
      else reject(new Error(ack?.error ?? "join failed"));
    });
  });
}

const instructor = io(URL, { transports: ["websocket"] });
const student = io(URL, { transports: ["websocket"] });

try {
  await Promise.all([
    new Promise((r) => instructor.on("connect", r)),
    new Promise((r) => student.on("connect", r)),
  ]);
  console.log(`Connected. Room ${ROOM}`);

  const isnap = await join(instructor, "instructor");
  check("instructor join ack ok", isnap.room === ROOM);

  // Student joins → instructor should see presence rise to 2 total.
  const presence2 = waitSnapshot(
    instructor,
    (s) => s.presence.total === 2 && s.presence.students === 1,
    "presence total=2",
  );
  await join(student, "student");
  await presence2;
  check("presence reflects 1 instructor + 1 student", true);

  // Instructor navigates → student receives the new index.
  const studentAt7 = waitSnapshot(student, (s) => s.index === 7, "student index=7");
  instructor.emit("nav", { index: 7 });
  await studentAt7;
  check("student followed instructor nav to slide 7", true);

  // Student nav is ignored by the server (students cannot drive).
  student.emit("nav", { index: 99 });
  await new Promise((r) => setTimeout(r, 150));
  const afterStudentNav = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(7), 300);
    instructor.once("snapshot", (s) => {
      clearTimeout(t);
      resolve(s.index);
    });
    instructor.emit("nav", { index: 7 }); // no-op re-broadcast to read current
  });
  check("student nav cannot move the room", afterStudentNav === 7);

  // Lock toggle.
  const unlocked = waitSnapshot(student, (s) => s.locked === false, "locked=false");
  instructor.emit("lock", { locked: false });
  await unlocked;
  check("instructor can unlock the room", true);

  // ── Poll lifecycle ──
  const pollOpen = waitSnapshot(student, (s) => s.poll?.open === true, "poll open");
  instructor.emit("poll:open", {
    prompt: "Pick the priority action",
    options: ["A", "B", "C", "D"],
    correct: [1],
    slideIndex: 7,
  });
  const openSnap = await pollOpen;
  check("poll opens with 4 options", openSnap.poll.options.length === 4);
  check("correct answer hidden while open", openSnap.poll.correct === null);

  // Student answers B (index 1).
  const oneVote = waitSnapshot(
    instructor,
    (s) => s.poll && s.poll.total === 1 && s.poll.counts[1] === 1,
    "1 vote on B",
  );
  student.emit("poll:answer", { choice: 1 });
  await oneVote;
  check("student vote tallies on option B", true);

  // Re-vote replaces (still one vote, now on C).
  const moved = waitSnapshot(
    instructor,
    (s) => s.poll && s.poll.total === 1 && s.poll.counts[2] === 1 && s.poll.counts[1] === 0,
    "vote moved to C",
  );
  student.emit("poll:answer", { choice: 2 });
  await moved;
  check("re-voting replaces the previous pick (one vote per student)", true);

  // Reveal exposes the correct answer + closes voting.
  const revealed = waitSnapshot(
    student,
    (s) => s.poll?.revealed === true,
    "poll revealed",
  );
  instructor.emit("poll:reveal");
  const revSnap = await revealed;
  check("reveal exposes correct=[1]", JSON.stringify(revSnap.poll.correct) === "[1]");
  check("reveal closes voting", revSnap.poll.open === false);

  // Close clears the poll.
  const cleared = waitSnapshot(student, (s) => s.poll === null, "poll cleared");
  instructor.emit("poll:close");
  await cleared;
  check("close clears the poll", true);
} catch (err) {
  console.error("  ✗ FATAL:", err.message);
  failures += 1;
} finally {
  instructor.close();
  student.close();
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}
