// Draggable picture-in-picture tile for the instructor's camera, floating over
// the slide reader. Renders the host video track (the instructor's own camera
// when they're the host, or the subscribed host track for students). The
// instructor gets inline mic/cam toggles.

import { useEffect, useRef, useState } from "react";
import type { ClassroomVideo } from "../../lib/liveAv";
import type { AvStatus } from "../../lib/useLiveAv";

export default function InstructorVideo({
  track,
  isHost,
  status,
  camOn,
  micOn,
  onToggleCam,
  onToggleMic,
  recordingEnabled,
  recording,
  onToggleRecording,
  videoRequested,
  onToggleVideo,
}: {
  track: ClassroomVideo | null;
  isHost: boolean;
  status: AvStatus;
  camOn: boolean;
  micOn: boolean;
  onToggleCam: () => void;
  onToggleMic: () => void;
  recordingEnabled: boolean;
  recording: boolean;
  onToggleRecording: () => void;
  videoRequested: boolean;
  onToggleVideo: () => void;
}) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 20, y: 84 }); // px from right / bottom
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (track && el) {
      track.play(el);
      return () => {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      };
    }
    return undefined;
  }, [track]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    // dragging right/up decreases the right/bottom offsets
    setPos({
      x: Math.max(8, drag.current.ox - (e.clientX - drag.current.sx)),
      y: Math.max(8, drag.current.oy - (e.clientY - drag.current.sy)),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      className="fixed z-50 w-44 overflow-hidden rounded-xl border border-white/20 bg-florence-ink shadow-2xl sm:w-56"
      style={{ right: pos.x, bottom: pos.y }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-move items-center justify-between bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "bg-vital-ok" : status === "connecting" ? "bg-amber-400 animate-pulse" : "bg-white/40"}`} />
          {isHost ? "You (instructor)" : "Instructor"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {recording && (
            <span className="inline-flex items-center gap-1 rounded bg-vital-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />REC
            </span>
          )}
          <span aria-hidden>⠿</span>
        </span>
      </div>
      {track ? (
        <div ref={videoRef} className="aspect-video w-full bg-black" />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-black px-3 text-center text-[11px] text-white/55">
          {isHost
            ? status === "connecting"
              ? "Connecting…"
              : status === "error"
                ? "A/V offline"
                : "Camera off"
            : !videoRequested
              ? "Instructor video off · audio only (saves data)"
              : status === "connecting"
                ? "Connecting…"
                : "Waiting for instructor's video…"}
        </div>
      )}
      {isHost ? (
        <div className="flex items-center justify-center gap-2 bg-white/5 px-2 py-1.5">
          <button
            type="button"
            onClick={onToggleCam}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${camOn ? "bg-white/10 text-white/80" : "bg-vital-danger/80 text-white"}`}
          >
            {camOn ? "Cam on" : "Cam off"}
          </button>
          <button
            type="button"
            onClick={onToggleMic}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${micOn ? "bg-white/10 text-white/80" : "bg-vital-danger/80 text-white"}`}
          >
            {micOn ? "Mic on" : "Mic off"}
          </button>
          {recordingEnabled && (
            <button
              type="button"
              onClick={onToggleRecording}
              title={recording ? "Stop recording" : "Record this class to the cloud"}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${recording ? "bg-vital-danger text-white" : "bg-white/10 text-white/80"}`}
            >
              {recording ? "■ Stop" : "● Rec"}
            </button>
          )}
        </div>
      ) : (
        // Audience data-saver: video is opt-in (bandwidth varies widely on mobile).
        <div className="bg-white/5 px-2 py-1.5">
          <button
            type="button"
            onClick={onToggleVideo}
            className={`w-full rounded-md px-2 py-1 text-[11px] font-medium ${videoRequested ? "bg-white/10 text-white/80" : "bg-florence-teal text-white"}`}
          >
            {videoRequested ? "Hide video · save data" : "▶ Show instructor video"}
          </button>
        </div>
      )}
    </div>
  );
}
