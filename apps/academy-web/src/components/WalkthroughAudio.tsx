// Adaptive walkthrough audio. A learner who got it RIGHT hears the quick rationale;
// a learner who got it WRONG hears the coaching for THEIR chosen distractor, plus the
// full walkthrough. Each player renders only if its clip exists (progressive enhancement).

import AudioPlayer from "./AudioPlayer";
import { useAudioClip } from "./RationaleAudio";
import { rationaleKey, walkthroughKey, coachingKey } from "../lib/audioManifest";

export default function WalkthroughAudio({
  questionId,
  chosenOptionIndex,
  chosenIsWrong,
}: {
  questionId: string;
  chosenOptionIndex?: number;
  chosenIsWrong?: boolean;
}) {
  const quick = useAudioClip(rationaleKey(questionId));
  const full = useAudioClip(walkthroughKey(questionId));
  const coaching = useAudioClip(
    chosenIsWrong && chosenOptionIndex != null ? coachingKey(questionId, chosenOptionIndex) : "",
  );

  if (!quick && !full && !coaching) return null;
  return (
    <div className="mt-2 space-y-2">
      {chosenIsWrong && coaching && (
        <AudioPlayer src={coaching.url} durationSec={coaching.durationSec} label="Coaching on your answer" />
      )}
      {full && <AudioPlayer src={full.url} durationSec={full.durationSec} label="Play the full walkthrough" />}
      {quick && <AudioPlayer src={quick.url} durationSec={quick.durationSec} label="Quick rationale" />}
    </div>
  );
}
