// Drop-in narrated-rationale player. Looks up the generated clip for a question
// by id; renders the player when one exists, nothing when it doesn't — so it's
// safe to mount everywhere a rationale shows, with or without audio generated.

import { useEffect, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import { audioFor, rationaleKey, type AudioEntry } from "../lib/audioManifest";

/** Resolve a single clip by content key (null while loading or if absent). */
export function useAudioClip(key: string): AudioEntry | null {
  const [entry, setEntry] = useState<AudioEntry | null>(null);
  useEffect(() => {
    let live = true;
    audioFor(key).then((e) => {
      if (live) setEntry(e);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return entry;
}

export default function RationaleAudio({ questionId, label = "Listen to the rationale" }: { questionId: string; label?: string }) {
  const clip = useAudioClip(rationaleKey(questionId));
  if (!clip) return null;
  return <AudioPlayer src={clip.url} durationSec={clip.durationSec} label={label} />;
}
