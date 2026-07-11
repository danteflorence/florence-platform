// ───────────────────────────────────────────────────────────────────────────
// Monitor sound - the bedside soundscape. Two layers, both gated on the sim
// running and the learner being unmuted:
//   1. a soft HR-synced pulse blip (the "the monitor is alive" ambience)
//   2. a two-tone CRITICAL alarm when a vital leaves the survivable band -
//      nurses are trained to react to that sound, and hearing it (then having
//      to keep thinking) is part of the practice.
//
// The threshold logic is pure and unit-tested; the hook wraps Web Audio.
// Everything is synthesized (oscillators) - no audio assets, no bandwidth.
// AudioContext is created lazily on first use, which in the player happens
// after the "Start the shift" tap, satisfying autoplay policies.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { VitalsState } from "../../data/vpatient/types";

/** CRITICAL bands - tighter than the per-tile warning pulse in VitalsDisplay.
 *  Crossing any of these fires the audible alarm. */
export function criticalVitals(v: VitalsState): string[] {
  const out: string[] = [];
  if (v.spo2 < 88) out.push("spo2");
  if (v.sbp < 85 || v.sbp > 200) out.push("sbp");
  if (v.hr < 40 || v.hr > 140) out.push("hr");
  if (v.rr < 8 || v.rr > 32) out.push("rr");
  return out;
}

export function alarmLevel(v: VitalsState): "none" | "critical" {
  return criticalVitals(v).length > 0 ? "critical" : "none";
}

/** One short synthesized blip. freq/gain/durations tuned to be present but
 *  not fatiguing on a phone speaker. */
function blip(ctx: AudioContext, freq: number, gainPeak: number, durMs: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durMs / 1000 + 0.02);
}

/**
 * Drive the monitor soundscape from live vitals. Pulse cadence follows HR;
 * the alarm layer switches on while any vital is critical. Muted or stopped,
 * all timers are torn down and the context suspended.
 */
export function useMonitorAudio({
  vitals,
  running,
  muted,
}: {
  vitals: VitalsState;
  running: boolean;
  muted: boolean;
}): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const hrRef = useRef(vitals.hr);
  const criticalRef = useRef(false);
  hrRef.current = vitals.hr;
  criticalRef.current = alarmLevel(vitals) === "critical";

  useEffect(() => {
    if (!running || muted) {
      void ctxRef.current?.suspend().catch(() => undefined);
      return;
    }
    type AudioCtor = new () => AudioContext;
    const Ctor =
      (window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }).AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    void ctx.resume().catch(() => undefined);

    // HR-synced pulse: self-rescheduling timeout so cadence tracks the live HR.
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    const schedulePulse = () => {
      const bpm = Math.min(220, Math.max(20, hrRef.current));
      pulseTimer = setTimeout(() => {
        // Softer, higher blip when stable; slightly sharper under alarm.
        blip(ctx, criticalRef.current ? 990 : 880, 0.035, 60);
        schedulePulse();
      }, 60000 / bpm);
    };
    schedulePulse();

    // Critical alarm: classic two-tone repeating pattern while critical.
    const alarmTimer = setInterval(() => {
      if (!criticalRef.current) return;
      blip(ctx, 660, 0.07, 160);
      setTimeout(() => blip(ctx, 520, 0.07, 200), 220);
    }, 1600);

    return () => {
      if (pulseTimer) clearTimeout(pulseTimer);
      clearInterval(alarmTimer);
    };
  }, [running, muted]);

  // Full teardown on unmount.
  useEffect(
    () => () => {
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    },
    [],
  );
}
