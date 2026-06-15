// ElevenLabs client — text-to-speech, pronunciation dictionaries, and the
// Conversational-AI signed URL for the live voice tutor. Zero runtime deps
// (global fetch + node:crypto), matching the rest of this API.
//
// MOCK BY DEFAULT: with no ELEVENLABS_API_KEY, ttsToMp3() returns a tiny valid
// silent MP3 so the whole pipeline (extract → generate → manifest → player)
// runs end-to-end without spending a single grant credit. Set the key to go
// live. This is the same "mock-by-default, live behind env" idiom as Agora.

const API = "https://api.elevenlabs.io";
const API_KEY = process.env["ELEVENLABS_API_KEY"] ?? "";
// Prebuilt default voice "Rachel"; override per-brand with ELEVENLABS_VOICE_ID.
const VOICE_ID = process.env["ELEVENLABS_VOICE_ID"] ?? "21m00Tcm4TlvDq8ikWAM";
// multilingual_v2 = high quality across the languages our global nurses speak.
const MODEL_ID = process.env["ELEVENLABS_MODEL_ID"] ?? "eleven_multilingual_v2";
const OUTPUT_FORMAT = process.env["ELEVENLABS_OUTPUT_FORMAT"] ?? "mp3_44100_128";
// Pronunciation dictionary locator (created by scripts/setup-pronunciation.ts).
const DICT_ID = process.env["ELEVENLABS_DICTIONARY_ID"] ?? "";
const DICT_VERSION_ID = process.env["ELEVENLABS_DICTIONARY_VERSION_ID"] ?? "";
// Conversational-AI agent for the voice tutor (created by scripts/setup-tutor.ts).
const AGENT_ID = process.env["ELEVENLABS_AGENT_ID"] ?? "";

export interface VoiceConfig {
  voiceId: string;
  modelId: string;
  outputFormat: string;
  dictionaryId: string;
}

export function elevenlabsConfigured(): boolean {
  return API_KEY.length > 0;
}

export function tutorConfigured(): boolean {
  return API_KEY.length > 0 && AGENT_ID.length > 0;
}

export function voiceConfig(): VoiceConfig {
  return { voiceId: VOICE_ID, modelId: MODEL_ID, outputFormat: OUTPUT_FORMAT, dictionaryId: DICT_ID };
}

export function agentId(): string {
  return AGENT_ID;
}

/** kbps encoded in the output format (e.g. mp3_44100_128 → 128). Used for CBR
 *  duration math: seconds ≈ bytes*8 / (kbps*1000). */
export function outputBitrateKbps(format = OUTPUT_FORMAT): number {
  const m = /_(\d+)$/.exec(format);
  return m ? Number(m[1]) : 128;
}

const headers = (extra: Record<string, string> = {}) => ({ "xi-api-key": API_KEY, ...extra });

/** One valid silent MPEG-1 Layer-3 frame (44.1 kHz, 128 kbps): 4-byte header +
 *  413 zero bytes = 417 bytes ≈ 26 ms. We repeat a few for a tiny placeholder. */
function silentMp3(frames = 10): Buffer {
  const header = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  const frame = Buffer.concat([header, Buffer.alloc(413)]);
  return Buffer.concat(Array.from({ length: frames }, () => frame));
}

export interface TtsOptions {
  voiceId?: string;
  modelId?: string;
  /** Override / disable the pronunciation dictionary for this call. */
  dictionaryId?: string;
  dictionaryVersionId?: string;
}

/** Synthesize text → MP3 bytes. Mock returns a tiny silent MP3. Retries transient
 *  failures (429/5xx) with backoff so a long batch survives rate limits. */
export async function ttsToMp3(text: string, opts: TtsOptions = {}): Promise<Buffer> {
  if (!elevenlabsConfigured()) return silentMp3();

  const voiceId = opts.voiceId ?? VOICE_ID;
  const dictId = opts.dictionaryId ?? DICT_ID;
  const dictVer = opts.dictionaryVersionId ?? DICT_VERSION_ID;
  const body: Record<string, unknown> = {
    text,
    model_id: opts.modelId ?? MODEL_ID,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  };
  if (dictId) {
    body["pronunciation_dictionary_locators"] = [
      { pronunciation_dictionary_id: dictId, ...(dictVer ? { version_id: dictVer } : {}) },
    ];
  }

  const url = `${API}/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(OUTPUT_FORMAT)}`;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: headers({ "content-type": "application/json", accept: "audio/mpeg" }),
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    lastErr = `${res.status} ${await res.text().catch(() => "")}`.slice(0, 300);
    if (res.status !== 429 && res.status < 500) break; // non-transient → stop
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`ElevenLabs TTS failed: ${lastErr}`);
}

// --- Pronunciation dictionary (medical terms) -------------------------------

export interface PronRule {
  string_to_replace: string;
  type: "phoneme" | "alias";
  /** for type:'phoneme' */
  phoneme?: string;
  alphabet?: "ipa" | "cmu";
  /** for type:'alias' */
  alias?: string;
}

/** Create a pronunciation dictionary from rules; returns its locator. */
export async function createPronunciationDictionary(
  name: string,
  rules: PronRule[],
): Promise<{ id: string; versionId: string }> {
  if (!elevenlabsConfigured()) throw new Error("ELEVENLABS_API_KEY not set");
  const res = await fetch(`${API}/v1/pronunciation-dictionaries/add-from-rules`, {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify({ name, rules }),
  });
  if (!res.ok) throw new Error(`create dictionary failed: ${res.status} ${await res.text().catch(() => "")}`);
  const j = (await res.json()) as { id?: string; pronunciation_dictionary_id?: string; version_id?: string };
  return { id: String(j.id ?? j.pronunciation_dictionary_id ?? ""), versionId: String(j.version_id ?? "") };
}

// --- Conversational AI (voice tutor) ----------------------------------------

/** Mint a short-lived signed URL for a learner to open a tutor conversation.
 *  Required for non-public agents; consumes grant minutes, so callers gate it. */
export async function tutorSignedUrl(): Promise<string> {
  if (!tutorConfigured()) throw new Error("voice tutor not configured (ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID)");
  const res = await fetch(`${API}/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(AGENT_ID)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`signed-url failed: ${res.status} ${await res.text().catch(() => "")}`);
  const j = (await res.json()) as { signed_url?: string };
  if (!j.signed_url) throw new Error("signed-url response missing signed_url");
  return j.signed_url;
}

/** Create (or print) the NCLEX tutor agent. Returns the agent_id. */
export async function createTutorAgent(cfg: {
  name: string;
  prompt: string;
  firstMessage: string;
  voiceId?: string;
}): Promise<string> {
  if (!elevenlabsConfigured()) throw new Error("ELEVENLABS_API_KEY not set");
  const res = await fetch(`${API}/v1/convai/agents/create`, {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify({
      name: cfg.name,
      conversation_config: {
        agent: {
          prompt: { prompt: cfg.prompt },
          first_message: cfg.firstMessage,
          language: "en",
        },
        tts: { voice_id: cfg.voiceId ?? VOICE_ID, model_id: "eleven_turbo_v2_5" },
      },
    }),
  });
  if (!res.ok) throw new Error(`create agent failed: ${res.status} ${await res.text().catch(() => "")}`);
  const j = (await res.json()) as { agent_id?: string };
  return String(j.agent_id ?? "");
}
