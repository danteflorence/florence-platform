// ───────────────────────────────────────────────────────────────────────────
// Florence Academy - live class protocol (typed client mirror).
//
// The authoritative definitions live in server/liveServer.mjs (plain JS). This
// file is the TypeScript shape the browser client codes against so the two
// stay in lock-step. If you change an event on the server, change it here too.
//
//   client → server
//     join         { room, role, name }      → ack { ok, snapshot } | { ok:false, error }
//     nav          { index }                  (instructor only)
//     lock         { locked }                 (instructor only)
//     poll:open    PollOpenPayload            (instructor only)
//     poll:answer  { choice } | { choices }   (student)
//     poll:reveal  -                          (instructor only)
//     poll:close   -                          (instructor only)
//   server → client (room broadcast)
//     snapshot     RoomSnapshot               (on every change)
// ───────────────────────────────────────────────────────────────────────────

import type { CjmmStep } from "../types/question";

export type LiveRole = "instructor" | "student";

export interface Presence {
  instructors: number;
  students: number;
  total: number;
}

/** Aggregate, student-safe view of the active poll (no per-respondent data). */
export interface PollView {
  id: string;
  slideIndex: number;
  prompt: string;
  options: string[];
  /** Correct option indexes - withheld (null) until the instructor reveals. */
  correct: number[] | null;
  revealed: boolean;
  open: boolean;
  /** Votes per option, parallel to `options`. */
  counts: number[];
  total: number;
  /**
   * NGN Clinical Judgment step this question exercises. Sent always (even before
   * reveal) - it primes the kind of thinking required without giving the answer.
   */
  cjmm?: CjmmStep;
  /**
   * Worked rationale, shown to the whole room on reveal - every question gets a
   * rationale, right or wrong. Withheld until reveal (it can name the answer).
   */
  rationale?: string;
  /** Short lesson reference, surfaced with the rationale on reveal. */
  reference?: string;
}

/**
 * One student's live status on the active poll. Instructor-only - sent over a
 * separate `roster` channel that students never receive, so the class never
 * sees who answered what (no herding, and classmate answers stay private).
 */
export interface StudentStatus {
  /** The name the student joined with (may be blank → UI falls back to a seat). */
  name: string;
  /** Whether this student has registered any answer to the active poll. */
  answered: boolean;
  /** Single-choice pick (index) or null; mirrors `choices` for convenience. */
  choice: number | null;
  /** All picked option indexes (for multi-select polls). */
  choices: number[];
  /** Whether the pick is correct, or null if they haven't answered yet. */
  correct: boolean | null;
}

/** Instructor-only live roster for the active poll. */
export interface RosterView {
  /** Active poll id, or null when no poll is live. */
  pollId: string | null;
  /** Whether the poll has been revealed to the room. */
  revealed: boolean;
  /** One row per connected student, in join order. */
  students: StudentStatus[];
  /** How many students have answered. */
  answered: number;
  /** How many students are connected. */
  total: number;
}

/** Public, serialisable view of a room, broadcast on every change. */
export interface RoomSnapshot {
  room: string;
  index: number;
  locked: boolean;
  presence: Presence;
  poll: PollView | null;
}

/** A single live Q&A question (broadcast to the whole room). */
export interface QaItem {
  id: string;
  name: string;
  text: string;
  at: number;
  answered: boolean;
}
export interface QaView {
  items: QaItem[];
}

// ── client → server payloads ───────────────────────────────────────────────
export interface JoinPayload {
  room: string;
  role: LiveRole;
  name: string;
}

export interface NavPayload {
  index: number;
}

export interface LockPayload {
  locked: boolean;
}

export interface PollOpenPayload {
  prompt: string;
  options: string[];
  /** Correct option indexes (kept server-side until reveal). */
  correct?: number[];
  /** Slide the poll is anchored to (defaults to the room's current slide). */
  slideIndex?: number;
  /** Allow selecting more than one option. */
  multi?: boolean;
  /** NGN Clinical Judgment step the item exercises (surfaced to the room). */
  cjmm?: CjmmStep;
  /** Worked rationale, shown to the whole room on reveal. */
  rationale?: string;
  /** Short lesson reference, shown with the rationale on reveal. */
  reference?: string;
}

export type PollAnswerPayload = { choice: number } | { choices: number[] };

export type JoinAck =
  | { ok: true; snapshot: RoomSnapshot }
  | { ok: false; error: string };

// ── typed socket.io event maps ──────────────────────────────────────────────
export interface ServerToClientEvents {
  snapshot: (s: RoomSnapshot) => void;
  /** Instructor-only live roster (emitted to the staff sub-room only). */
  roster: (r: RosterView) => void;
  /** Live Q&A list, broadcast to the whole room on every change. */
  qa: (v: QaView) => void;
}

export interface ClientToServerEvents {
  join: (p: JoinPayload, ack: (r: JoinAck) => void) => void;
  nav: (p: NavPayload) => void;
  lock: (p: LockPayload) => void;
  "poll:open": (p: PollOpenPayload) => void;
  "poll:answer": (p: PollAnswerPayload) => void;
  "poll:reveal": () => void;
  "poll:close": () => void;
  "qa:ask": (p: { text: string }) => void;
  "qa:answer": (p: { id: string }) => void;
}

/**
 * Resolve the live server's URL. Prefers a build-time override
 * (`VITE_LIVE_URL`); otherwise targets port 5179 on the same host the app is
 * served from - so a classroom instructor can share `http://<their-ip>:5174`
 * and every student's client finds the live server at `<their-ip>:5179`.
 */
export function liveServerUrl(): string {
  const override = (import.meta.env.VITE_LIVE_URL as string | undefined)?.trim();
  if (override) return override;
  if (typeof window === "undefined") return "http://localhost:5179";
  const { protocol, hostname } = window.location;
  const scheme = protocol === "https:" ? "https:" : "http:";
  return `${scheme}//${hostname}:5179`;
}

/** A short, unambiguous room code (no easily-confused glyphs like 0/O, 1/I). */
export function randomRoomCode(len = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
