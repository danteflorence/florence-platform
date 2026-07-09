// React hook around the Agora live-A/V transport. Checks whether live A/V is
// configured on the server, fetches a Core-role-gated RTC token, joins the
// channel (host if the token grants it, else audience), and exposes the host
// video track + instructor mic/cam controls. A no-op (enabled:false) when the
// server has no Agora keys, so the live page degrades to slides-only cleanly.

import { useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "./academyAuth";
import { joinClassroom, type AvHandle, type ClassroomVideo } from "./liveAv";

export type AvStatus = "idle" | "connecting" | "live" | "error";

export interface LiveAvState {
  enabled: boolean;
  status: AvStatus;
  isHost: boolean;
  videoTrack: ClassroomVideo | null;
  error: string | null;
  camOn: boolean;
  micOn: boolean;
  toggleCam: () => void;
  toggleMic: () => void;
  /** Cloud recording is provisioned on the server. */
  recordingEnabled: boolean;
  /** A recording is currently running for this channel (host + audience see it). */
  recording: boolean;
  /** Instructor: start/stop the cloud recording. */
  toggleRecording: () => void;
  /** Audience data-saver: whether the instructor video is currently received. */
  videoRequested: boolean;
  toggleVideo: () => void;
}

export function useLiveAv(opts: { channel: string; active: boolean }): LiveAvState {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<AvStatus>("idle");
  const [isHost, setIsHost] = useState(false);
  const [videoTrack, setVideoTrack] = useState<ClassroomVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [wantVideo, setWantVideo] = useState(false); // audience data-saver default: audio only
  const handleRef = useRef<AvHandle | null>(null);

  // Is live A/V wired on this instance?
  useEffect(() => {
    const base = apiBaseUrl();
    if (!base) return;
    let alive = true;
    fetch(`${base}/v1/live/config`, { credentials: "include" })
      .then((r) => r.json())
      .then((c) => alive && setEnabled(Boolean(c?.configured)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !opts.active || !opts.channel) return;
    let cancelled = false;
    setStatus("connecting");
    setError(null);
    setWantVideo(false); // each session starts in data-saver (audio-only) mode
    void (async () => {
      const base = apiBaseUrl();
      const res = await fetch(`${base}/v1/live/token`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: opts.channel }),
      });
      if (!res.ok) throw new Error("could not get a live token (are you signed in?)");
      const g = (await res.json()) as { appId: string; channel: string; token: string; uid: number; role: "host" | "audience" };
      const host = g.role === "host";
      const handle = await joinClassroom({
        appId: g.appId,
        channel: g.channel,
        token: g.token,
        uid: g.uid,
        host,
        wantVideo: false, // audience joins audio-only; opts in to video on demand
        onHostVideo: (t) => {
          if (!cancelled) setVideoTrack(t);
        },
      });
      if (cancelled) {
        await handle.leave();
        return;
      }
      handleRef.current = handle;
      setIsHost(host);
      setStatus("live");
    })().catch((e) => {
      if (!cancelled) {
        setError(String(e?.message ?? e));
        setStatus("error");
      }
    });
    return () => {
      cancelled = true;
      const h = handleRef.current;
      handleRef.current = null;
      if (h) void h.leave();
      setVideoTrack(null);
      setStatus("idle");
    };
  }, [enabled, opts.active, opts.channel]);

  // Poll recording status while live so host AND audience see the REC state.
  useEffect(() => {
    if (status !== "live" || !opts.channel) return;
    const base = apiBaseUrl();
    if (!base) return;
    let alive = true;
    const poll = () =>
      fetch(`${base}/v1/live/recording/status`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: opts.channel }),
      })
        .then((r) => r.json())
        .then((s) => {
          if (alive) {
            setRecordingEnabled(Boolean(s?.configured));
            setRecording(Boolean(s?.recording));
          }
        })
        .catch(() => {});
    void poll();
    const t = setInterval(poll, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [status, opts.channel]);

  const toggleCam = () => {
    const h = handleRef.current;
    if (h?.localVideo) {
      const next = !camOn;
      void h.localVideo.setEnabled(next);
      setCamOn(next);
    }
  };
  const toggleMic = () => {
    const h = handleRef.current;
    if (h?.localAudio) {
      const next = !micOn;
      void h.localAudio.setEnabled(next);
      setMicOn(next);
    }
  };

  const toggleRecording = () => {
    const base = apiBaseUrl();
    if (!base) return;
    const action = recording ? "stop" : "start";
    setRecording(!recording); // optimistic; the poll reconciles
    fetch(`${base}/v1/live/recording/${action}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: opts.channel }),
    })
      .then((r) => r.json())
      .then((s) => setRecording(Boolean(s?.recording)))
      .catch(() => {});
  };

  // Audience-only: subscribe/unsubscribe to the instructor video (data-saver).
  const toggleVideo = () => {
    const h = handleRef.current;
    if (!h) return;
    const next = !wantVideo;
    setWantVideo(next);
    void h.setWantVideo(next);
  };

  return {
    enabled,
    status,
    isHost,
    videoTrack,
    error,
    camOn,
    micOn,
    toggleCam,
    toggleMic,
    recordingEnabled,
    recording,
    toggleRecording,
    videoRequested: wantVideo,
    toggleVideo,
  };
}
