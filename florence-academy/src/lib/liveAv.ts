// ───────────────────────────────────────────────────────────────────────────
// Live A/V transport (Agora). The instructor joins as HOST (publishes camera +
// mic); students join as AUDIENCE (subscribe-only) — Agora's "live" host/audience
// model scales to large, globally-distributed cohorts cheaply. Slides, polls and
// Q&A stay on the existing Socket.IO live server; this module is ONLY the media.
//
// agora-rtc-sdk-ng is lazy-imported so it loads only on the live page.
// ───────────────────────────────────────────────────────────────────────────

import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";

/** A video track that can be rendered into a DOM element (local cam or remote host). */
export type ClassroomVideo = ICameraVideoTrack | IRemoteVideoTrack;

export interface AvHandle {
  client: IAgoraRTCClient;
  localVideo: ICameraVideoTrack | null;
  localAudio: IMicrophoneAudioTrack | null;
  /** Audience data-saver: subscribe/unsubscribe to the instructor's VIDEO on demand. */
  setWantVideo: (on: boolean) => Promise<void>;
  leave: () => Promise<void>;
}

export interface JoinOpts {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  host: boolean;
  /** Audience: subscribe to the instructor video at join (default false = data-saver). */
  wantVideo?: boolean;
  /** Called with the host's video track to render (or null when off/ended). */
  onHostVideo: (track: ClassroomVideo | null) => void;
}

export async function joinClassroom(opts: JoinOpts): Promise<AvHandle> {
  const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
  const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
  await client.setClientRole(opts.host ? "host" : "audience");

  let hostUser: IAgoraRTCRemoteUser | null = null;
  // Audience opt-in to the instructor's VIDEO (data-saver default = off). Audio is
  // always taken (cheap + essential); video only when the student asks for it.
  let wantVideo = opts.wantVideo ?? false;

  client.on("user-published", async (user, mediaType) => {
    hostUser = user;
    if (mediaType === "audio") {
      await client.subscribe(user, "audio");
      user.audioTrack?.play();
    } else if (mediaType === "video" && wantVideo) {
      await client.subscribe(user, "video");
      opts.onHostVideo(user.videoTrack ?? null);
    }
  });
  client.on("user-unpublished", (_user, mediaType) => {
    if (mediaType === "video") opts.onHostVideo(null);
  });

  // uid 0 → let Agora assign one (the token is minted for uid 0, a wildcard).
  await client.join(opts.appId, opts.channel, opts.token, opts.uid || null);

  let localVideo: ICameraVideoTrack | null = null;
  let localAudio: IMicrophoneAudioTrack | null = null;
  if (opts.host) {
    [localAudio, localVideo] = await AgoraRTC.createMicrophoneAndCameraTracks();
    await client.publish([localAudio, localVideo]);
    opts.onHostVideo(localVideo);
  }

  return {
    client,
    localVideo,
    localAudio,
    setWantVideo: async (on: boolean) => {
      wantVideo = on;
      if (opts.host || !hostUser) return; // the host always sees their own camera
      if (on && hostUser.hasVideo) {
        await client.subscribe(hostUser, "video");
        opts.onHostVideo(hostUser.videoTrack ?? null);
      } else if (!on) {
        try {
          await client.unsubscribe(hostUser, "video");
        } catch {
          /* ignore */
        }
        opts.onHostVideo(null);
      }
    },
    leave: async () => {
      try {
        localVideo?.stop();
        localVideo?.close();
        localAudio?.stop();
        localAudio?.close();
      } catch {
        /* ignore */
      }
      try {
        client.removeAllListeners();
        await client.leave();
      } catch {
        /* ignore */
      }
    },
  };
}
