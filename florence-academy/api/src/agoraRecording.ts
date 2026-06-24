// Agora Cloud Recording (composite/"mix" mode) → records the live class to YOUR
// cloud bucket as one mp4 for on-demand replay. Server-side REST flow:
// acquire → start → stop. Auth is Basic (Customer ID:Secret, separate from the
// App ID/Certificate). The recorder joins the channel as a subscriber, so it
// needs its own RTC token (reused from agora.ts).
//
// Provisioned by YOU: enable Cloud Recording on the Agora project, create a
// RESTful Customer ID/Secret, and a storage bucket (S3/GCS/Azure/OSS) + keys.
// Until all are set, recordingConfigured() is false and the Record button is
// hidden - the class still streams + replays nothing.

import { agoraAppId, buildRtcToken } from "./agora.ts";

const API_BASE = "https://api.agora.io/v1/apps";
const CUSTOMER_ID = process.env["AGORA_CUSTOMER_ID"] ?? "";
const CUSTOMER_SECRET = process.env["AGORA_CUSTOMER_SECRET"] ?? "";
// A fixed numeric uid for the recorder bot (must not collide with participants).
const RECORDER_UID = 424242;

function storageConfig() {
  return {
    vendor: Number(process.env["AGORA_REC_VENDOR"] ?? 1), // 1 = AWS S3 (see Agora docs for others)
    region: Number(process.env["AGORA_REC_REGION"] ?? 0),
    bucket: process.env["AGORA_REC_BUCKET"] ?? "",
    accessKey: process.env["AGORA_REC_ACCESS_KEY"] ?? "",
    secretKey: process.env["AGORA_REC_SECRET_KEY"] ?? "",
    fileNamePrefix: (process.env["AGORA_REC_PREFIX"] ?? "florence-academy").split("/").filter(Boolean),
  };
}

export function recordingConfigured(): boolean {
  const s = storageConfig();
  return Boolean(agoraAppId() && CUSTOMER_ID && CUSTOMER_SECRET && s.bucket && s.accessKey && s.secretKey);
}

/** Public/CDN base URL to play recordings from (front your bucket with a CDN).
 *  Empty → the SPA shows the file key but can't play until you set this. */
export function recordingPublicBase(): string {
  return (process.env["AGORA_REC_PUBLIC_BASE"] ?? "").replace(/\/$/, "");
}

export interface RecordingHandle {
  resourceId: string;
  sid: string;
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString("base64");
}

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${API_BASE}/${agoraAppId()}/cloud_recording${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: authHeader() },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`agora cloud_recording ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

/** acquire → start (composite mp4 to your bucket). Returns the recording handle. */
export async function startRecording(channel: string): Promise<RecordingHandle> {
  const uid = String(RECORDER_UID);
  const acquired = await postJson(`/acquire`, { cname: channel, uid, clientRequest: {} });
  const resourceId = acquired.resourceId as string;
  const token = buildRtcToken(channel, false, RECORDER_UID).token;
  const started = await postJson(`/resourceid/${resourceId}/mode/mix/start`, {
    cname: channel,
    uid,
    clientRequest: {
      token,
      storageConfig: storageConfig(),
      recordingConfig: {
        channelType: 1, // 1 = live broadcasting (host/audience)
        streamTypes: 2, // audio + video
        maxIdleTime: 120,
        subscribeUidGroup: 0,
        transcodingConfig: {
          width: 1280,
          height: 720,
          fps: 15,
          bitrate: 1000, // ~1 Mbps → lighter storage + mobile-friendly replay (tunable)
          mixedVideoLayout: 1, // best-fit layout
          backgroundColor: "#000000",
        },
      },
    },
  });
  return { resourceId, sid: started.sid as string };
}

/** stop → returns the recorded file name(s) in your bucket. */
export async function stopRecording(channel: string, h: RecordingHandle): Promise<{ files: string[] }> {
  const res = await postJson(`/resourceid/${h.resourceId}/sid/${h.sid}/mode/mix/stop`, {
    cname: channel,
    uid: String(RECORDER_UID),
    clientRequest: {},
  });
  const list = res?.serverResponse?.fileList ?? [];
  const files = (Array.isArray(list) ? list : [])
    .map((f: any) => (typeof f === "string" ? f : f?.fileName))
    .filter(Boolean);
  return { files };
}
