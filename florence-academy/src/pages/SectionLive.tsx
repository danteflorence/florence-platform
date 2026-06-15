import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import LivePoll from "../components/deck/LivePoll";
import LiveRoster from "../components/deck/LiveRoster";
import SlideDeck from "../components/deck/SlideDeck";
import InstructorVideo from "../components/live/InstructorVideo";
import QnaPanel from "../components/live/QnaPanel";
import { useLiveAv } from "../lib/useLiveAv";
import { buildDeck, pollFromPracticeItem } from "../lib/deck";
import { useLesson } from "../lib/useLesson";
import type { Lesson } from "../data/lessonTypes";
import type { LiveRole } from "../lib/liveProtocol";
import { useLiveSession, type LiveSession } from "../lib/useLiveSession";

/**
 * Any section in live, synced mode. The instructor drives the deck and the
 * room's lock; students follow in lock-step or roam freely with a one-tap jump
 * back. SlideDeck is fully controlled — the server owns the index.
 */
function LiveRoom({
  lesson,
  room,
  role,
  name,
}: {
  lesson: Lesson;
  room: string;
  role: LiveRole;
  name: string;
}) {
  const deck = useMemo(() => buildDeck(lesson), [lesson]);
  const session = useLiveSession({ room, role, name });
  const isInstructor = role === "instructor";
  // Live A/V (Agora): instructor broadcasts camera+mic, students subscribe. The
  // SERVER decides host vs audience from the Core role, so a ?role= URL can't
  // grant publish. No-op (av.enabled=false) until Agora keys are configured.
  const av = useLiveAv({ channel: room, active: true });

  const [localIndex, setLocalIndex] = useState(0);
  useEffect(() => {
    if (isInstructor || session.locked) setLocalIndex(session.serverIndex);
  }, [isInstructor, session.locked, session.serverIndex]);

  const followingInstructor = !isInstructor && session.locked;
  const effectiveIndex = followingInstructor
    ? session.serverIndex
    : isInstructor
      ? session.serverIndex
      : localIndex;
  const onIndexChange = isInstructor
    ? session.nav
    : followingInstructor
      ? undefined
      : setLocalIndex;
  const roamedAway =
    !isInstructor && !session.locked && localIndex !== session.serverIndex;

  const currentSlide = deck.slides[effectiveIndex]?.slide;
  const pushableItem =
    isInstructor && !session.poll && currentSlide?.kind === "practice"
      ? currentSlide.item
      : null;

  return (
    <>
      <SlideDeck
        deck={deck}
        index={effectiveIndex}
        onIndexChange={onIndexChange}
        locked={followingInstructor}
        exitTo="/academy/live"
        statusBadge={
          <LiveStatusBadge
            session={session}
            isInstructor={isInstructor}
            roamedAway={roamedAway}
            onJumpToInstructor={() => setLocalIndex(session.serverIndex)}
          />
        }
      />
      <LivePoll
        poll={session.poll}
        isInstructor={isInstructor}
        studentsPresent={session.presence.students}
        onLaunch={
          pushableItem
            ? () => session.openPoll(pollFromPracticeItem(pushableItem, effectiveIndex))
            : undefined
        }
        onAnswer={session.answerPoll}
        onReveal={session.revealPoll}
        onClose={session.closePoll}
      />
      {isInstructor && <LiveRoster roster={session.roster} />}
      {av.enabled && (
        <InstructorVideo
          track={av.videoTrack}
          isHost={av.isHost}
          status={av.status}
          camOn={av.camOn}
          micOn={av.micOn}
          onToggleCam={av.toggleCam}
          onToggleMic={av.toggleMic}
          recordingEnabled={av.recordingEnabled}
          recording={av.recording}
          onToggleRecording={av.toggleRecording}
          videoRequested={av.videoRequested}
          onToggleVideo={av.toggleVideo}
        />
      )}
      <QnaPanel
        qa={session.qa}
        isInstructor={isInstructor}
        onAsk={session.askQuestion}
        onAnswer={session.answerQuestion}
      />
    </>
  );
}

export default function SectionLive() {
  const [params] = useSearchParams();
  const { sectionSlug } = useParams<{ sectionSlug: string }>();
  const room = (params.get("room") ?? "").trim().toUpperCase();
  const role: LiveRole =
    params.get("role") === "instructor" ? "instructor" : "student";
  const name = params.get("name") ?? "";
  const state = useLesson(sectionSlug);

  if (!room) return <Navigate to="/academy/live" replace />;
  if (state.status === "not-found") return <Navigate to="/academy/live" replace />;
  if (state.status === "loading")
    return (
      <div className="grid min-h-screen place-items-center bg-florence-ink">
        <p className="animate-pulse text-sm font-medium text-white/70">Connecting…</p>
      </div>
    );
  return <LiveRoom lesson={state.lesson} room={room} role={role} name={name} />;
}

const STATUS_DOT: Record<LiveSession["status"], string> = {
  connecting: "bg-amber-400 animate-pulse",
  connected: "bg-vital-ok",
  reconnecting: "bg-amber-400 animate-pulse",
  error: "bg-vital-danger",
};

const STATUS_LABEL: Record<LiveSession["status"], string> = {
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting…",
  error: "Offline",
};

function LiveStatusBadge({
  session,
  isInstructor,
  roamedAway,
  onJumpToInstructor,
}: {
  session: LiveSession;
  isInstructor: boolean;
  roamedAway: boolean;
  onJumpToInstructor: () => void;
}) {
  const { status, room, presence, locked, error } = session;

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className="font-medium text-white/90">{STATUS_LABEL[status]}</span>
      </span>

      <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono font-semibold tracking-widest text-white sm:inline-flex">
        {room}
      </span>

      <span
        className="hidden items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white/80 md:inline-flex"
        title={`${presence.instructors} instructor(s), ${presence.students} student(s)`}
      >
        <span aria-hidden>👥</span>
        <span className="tabular-nums">{presence.total}</span>
      </span>

      {isInstructor ? (
        <button
          type="button"
          onClick={() => session.setLock(!locked)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors ${
            locked
              ? "bg-florence-teal text-white hover:bg-florence-teal-dark"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          }`}
          title={locked ? "Students are following you — click to free the room" : "Students roam freely — click to lock everyone to your slide"}
        >
          <span aria-hidden>{locked ? "🔒" : "🔓"}</span>
          {locked ? "Locked" : "Free roam"}
        </button>
      ) : roamedAway ? (
        <button
          type="button"
          onClick={onJumpToInstructor}
          className="inline-flex items-center gap-1.5 rounded-full bg-florence-teal px-2.5 py-1 font-medium text-white transition-colors hover:bg-florence-teal-dark"
          title="Jump to the slide the instructor is on"
        >
          <span aria-hidden>↪</span>
          Instructor on {session.serverIndex + 1}
        </button>
      ) : (
        <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/80 lg:inline-flex">
          <span aria-hidden>{locked ? "🔒" : "🔓"}</span>
          {locked ? "Following" : "Free roam"}
        </span>
      )}

      {status === "error" && error && (
        <span className="hidden max-w-[16rem] truncate text-xs text-vital-danger lg:inline" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
