// ───────────────────────────────────────────────────────────────────────────
// Florence Academy — useLiveSession
//
// Connects to the live class server (Socket.IO), joins a cohort room, and
// exposes the latest authoritative snapshot plus role-gated actions. The
// server is the single source of truth: every action emits an event and the
// resulting `snapshot` broadcast flows back through here, so the UI never has
// to optimistically guess room state.
// ───────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  liveServerUrl,
  type ClientToServerEvents,
  type LiveRole,
  type PollOpenPayload,
  type PollView,
  type Presence,
  type QaItem,
  type RoomSnapshot,
  type RosterView,
  type ServerToClientEvents,
} from "./liveProtocol";

type LiveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type LiveStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface LiveSession {
  status: LiveStatus;
  error: string | null;
  role: LiveRole;
  room: string;
  /** Latest authoritative snapshot (null until the first join ack). */
  snapshot: RoomSnapshot | null;
  serverIndex: number;
  locked: boolean;
  presence: Presence;
  poll: PollView | null;
  /** Instructor-only live roster (null for students / until the first roster). */
  roster: RosterView | null;
  /** Live Q&A questions — the whole room sees the list + answered state. */
  qa: QaItem[];
  // ── actions (no-ops until connected; server enforces role) ──
  nav: (index: number) => void;
  setLock: (locked: boolean) => void;
  openPoll: (payload: PollOpenPayload) => void;
  answerPoll: (choice: number | number[]) => void;
  revealPoll: () => void;
  closePoll: () => void;
  askQuestion: (text: string) => void;
  answerQuestion: (id: string) => void;
}

const EMPTY_PRESENCE: Presence = { instructors: 0, students: 0, total: 0 };

export function useLiveSession(opts: {
  room: string;
  role: LiveRole;
  name?: string;
}): LiveSession {
  const { room, role, name = "" } = opts;

  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [roster, setRoster] = useState<RosterView | null>(null);
  const [qa, setQa] = useState<QaItem[]>([]);
  const socketRef = useRef<LiveSocket | null>(null);

  useEffect(() => {
    if (!room) return;

    setStatus("connecting");
    setError(null);
    setRoster(null);
    setQa([]);
    // Tracks whether this socket ever fully joined — lets us tell a first-time
    // failure ("Offline") apart from a mid-class blip ("Reconnecting…").
    let everJoined = false;
    const socket: LiveSocket = io(liveServerUrl(), {
      // Prefer raw WebSocket, but fall back to HTTP long-polling on networks
      // that block it (some school / hospital wifi) so the class still connects.
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    const join = () => {
      socket.emit("join", { room, role, name }, (ack) => {
        if (ack?.ok) {
          everJoined = true;
          setSnapshot(ack.snapshot);
          setStatus("connected");
          setError(null);
        } else {
          setError(ack?.error ?? "Could not join the room.");
          setStatus("error");
        }
      });
    };

    // (Re)join on every (re)connect so a dropped client recovers its seat.
    socket.on("connect", join);
    socket.on("snapshot", (s) => setSnapshot(s));
    socket.on("roster", (r) => setRoster(r));
    socket.on("qa", (v) => setQa(v.items));
    // A transient drop: keep the last snapshot on screen but flag the gap so the
    // badge stops claiming "Live". socket.io retries automatically; if the server
    // deliberately closed us out it won't, so reconnect by hand.
    socket.on("disconnect", (reason) => {
      setStatus(everJoined ? "reconnecting" : "connecting");
      if (reason === "io server disconnect") socket.connect();
    });
    // Before the first join this is a hard "can't reach the server" error; once
    // we've joined, a failed attempt is just one retry in an ongoing reconnect.
    socket.on("connect_error", (e) => {
      if (everJoined) {
        setStatus("reconnecting");
      } else {
        setError(e?.message ?? "Could not reach the live server.");
        setStatus("error");
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, [room, role, name]);

  const nav = useCallback((index: number) => {
    socketRef.current?.emit("nav", { index });
  }, []);

  const setLock = useCallback((locked: boolean) => {
    socketRef.current?.emit("lock", { locked });
  }, []);

  const openPoll = useCallback((payload: PollOpenPayload) => {
    socketRef.current?.emit("poll:open", payload);
  }, []);

  const answerPoll = useCallback((choice: number | number[]) => {
    socketRef.current?.emit(
      "poll:answer",
      Array.isArray(choice) ? { choices: choice } : { choice },
    );
  }, []);

  const revealPoll = useCallback(() => {
    socketRef.current?.emit("poll:reveal");
  }, []);

  const closePoll = useCallback(() => {
    socketRef.current?.emit("poll:close");
  }, []);

  const askQuestion = useCallback((text: string) => {
    const t = text.trim();
    if (t) socketRef.current?.emit("qa:ask", { text: t });
  }, []);

  const answerQuestion = useCallback((id: string) => {
    socketRef.current?.emit("qa:answer", { id });
  }, []);

  return useMemo<LiveSession>(
    () => ({
      status,
      error,
      role,
      room,
      snapshot,
      serverIndex: snapshot?.index ?? 0,
      locked: snapshot?.locked ?? true,
      presence: snapshot?.presence ?? EMPTY_PRESENCE,
      poll: snapshot?.poll ?? null,
      roster,
      qa,
      nav,
      setLock,
      openPoll,
      answerPoll,
      revealPoll,
      closePoll,
      askQuestion,
      answerQuestion,
    }),
    [
      status,
      error,
      role,
      room,
      snapshot,
      roster,
      qa,
      nav,
      setLock,
      openPoll,
      answerPoll,
      revealPoll,
      closePoll,
      askQuestion,
      answerQuestion,
    ],
  );
}
