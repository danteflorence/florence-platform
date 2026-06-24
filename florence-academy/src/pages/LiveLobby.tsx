import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LiveRole } from "../lib/liveProtocol";
import { randomRoomCode } from "../lib/liveProtocol";
import { fetchReplays, fmtDuration, replayUrl, type Replay } from "../lib/replays";

/**
 * Live-session lobby. Pick a role and a room code, then hand off to the synced
 * deck. Instructors get a freshly generated code to read aloud; students type
 * the one their instructor shares. No accounts, no PII beyond an optional
 * display name kept only in this session's URL.
 */
export default function LiveLobby() {
  const navigate = useNavigate();
  const [role, setRole] = useState<LiveRole>("instructor");
  const [room, setRoom] = useState(() => randomRoomCode());
  const [name, setName] = useState("");

  const code = room.trim().toUpperCase().slice(0, 12);
  const canEnter = code.length >= 3;

  const enter = () => {
    if (!canEnter) return;
    const q = new URLSearchParams({ room: code, role });
    if (name.trim()) q.set("name", name.trim().slice(0, 40));
    navigate(`/academy/section-7-cardiac/live?${q.toString()}`);
  };

  const pickRole = (next: LiveRole) => {
    setRole(next);
    // Give instructors a code to share; clear it for students to type in.
    if (next === "instructor" && !room.trim()) setRoom(randomRoomCode());
    if (next === "student") setRoom("");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="fl-eyebrow mb-2">Live class</p>
      <h1 className="font-serif text-3xl font-semibold text-florence-ink sm:text-4xl">
        Teach - or join - a synced room.
      </h1>
      <p className="mt-3 max-w-2xl text-florence-slate">
        One instructor drives the deck; every student’s screen follows in real
        time. Open it on the projector, share the room code, and start.
      </p>

      {/* Role */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <RoleCard
          active={role === "instructor"}
          onClick={() => pickRole("instructor")}
          icon="🎙️"
          title="I’m teaching"
          blurb="Drive the slides and polls. Lock the room so everyone follows, or free it for self-paced review."
        />
        <RoleCard
          active={role === "student"}
          onClick={() => pickRole("student")}
          icon="🎧"
          title="I’m a student"
          blurb="Follow along on your own laptop. Answer live polls and keep pace with the instructor."
        />
      </div>

      {/* Room + name */}
      <div className="mt-6 fl-card p-5">
        <label className="block">
          <span className="fl-eyebrow">Room code</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && enter()}
              placeholder={role === "instructor" ? "e.g. K7QP" : "Enter the code your instructor shared"}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
              className="w-full rounded-xl border border-florence-line bg-white px-4 py-3 font-mono text-lg font-semibold tracking-[0.2em] text-florence-ink outline-none focus:border-florence-teal focus:ring-2 focus:ring-florence-teal/30"
            />
            {role === "instructor" && (
              <button
                type="button"
                onClick={() => setRoom(randomRoomCode())}
                className="shrink-0 rounded-xl border border-florence-line bg-florence-mist px-3 py-3 text-sm font-medium text-florence-slate transition-colors hover:bg-florence-line/60"
                title="Generate a new code"
              >
                ↻ New
              </button>
            )}
          </div>
        </label>

        <label className="mt-4 block">
          <span className="fl-eyebrow">Display name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enter()}
            placeholder="Shown to no one else for now - just a label"
            maxLength={40}
            className="mt-2 w-full rounded-xl border border-florence-line bg-white px-4 py-3 text-florence-ink outline-none focus:border-florence-teal focus:ring-2 focus:ring-florence-teal/30"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={enter}
            disabled={!canEnter}
            className="inline-flex items-center gap-2 rounded-xl bg-florence-indigo px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {role === "instructor" ? "Start the room" : "Join the room"}
            <span aria-hidden>→</span>
          </button>
          <Link
            to="/academy/section-7-cardiac"
            className="text-sm font-medium text-florence-slate hover:text-florence-ink"
          >
            Back to the section
          </Link>
        </div>

        {role === "instructor" && canEnter && (
          <p className="mt-4 rounded-lg bg-florence-teal-soft/60 px-3 py-2 text-sm text-florence-teal-dark">
            Share this with your cohort: <strong>room {code}</strong>. They open
            this page, choose “I’m a student,” and enter the code.
          </p>
        )}
      </div>

      <RecentRecordings />
    </div>
  );
}

/** Replay library - past classes recorded to the cloud, playable on any device. */
function RecentRecordings() {
  const [items, setItems] = useState<Replay[]>([]);
  const [base, setBase] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchReplays().then((r) => {
      setItems(r.recordings);
      setBase(r.base);
      setLoaded(true);
    });
  }, []);

  if (!loaded || items.length === 0) return null; // hide until there's something to show

  return (
    <div className="mt-10">
      <p className="fl-eyebrow mb-2">Class replays</p>
      <h2 className="font-serif text-2xl font-semibold text-florence-ink">Catch up on a past class</h2>
      <p className="mt-2 text-sm text-florence-slate">
        Recorded sessions, playable on any device - handy across time zones and slow connections.
      </p>
      {active && (
        <video src={active} controls autoPlay playsInline className="mt-4 aspect-video w-full rounded-xl bg-black" />
      )}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((r) => {
          const url = replayUrl(base, r.files[0] ?? "");
          return (
            <li key={r.id} className="fl-card flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-florence-ink">Room {r.channel}</div>
                <div className="text-xs text-florence-slate">
                  {new Date(r.endedAt).toLocaleString()} · {fmtDuration(r.durationSec)}
                </div>
              </div>
              {url ? (
                <button
                  type="button"
                  onClick={() => setActive(url)}
                  className="shrink-0 rounded-lg bg-florence-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-florence-indigo-dark"
                >
                  ▶ Play
                </button>
              ) : (
                <span className="shrink-0 text-xs text-florence-slate">processing…</span>
              )}
            </li>
          );
        })}
      </ul>
      {!base && (
        <p className="mt-2 text-xs text-florence-slate">
          Set a CDN/public base (<code className="font-mono">AGORA_REC_PUBLIC_BASE</code>) to enable playback.
        </p>
      )}
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  blurb,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all ${
        active
          ? "border-florence-teal bg-florence-teal-soft/40 shadow-card ring-1 ring-florence-teal/40"
          : "border-florence-line bg-white hover:border-florence-teal/50 hover:bg-florence-mist"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl shadow-sm" aria-hidden>
          {icon}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold text-florence-ink">
            {title}
          </span>
          {active && (
            <span className="rounded-full bg-florence-teal px-2 py-0.5 text-[11px] font-bold text-white">
              ✓
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-florence-slate">{blurb}</p>
    </button>
  );
}
