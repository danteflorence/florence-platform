// Replay-library persistence for live-class recordings. Self-contained (doesn't
// touch the main candidate store): in-memory in dev, a `live_recordings` table in
// Postgres when DATABASE_URL is set. The mp4 itself lives in your storage bucket;
// this just indexes which recordings exist so the SPA can list + play them.

export interface RecordingRecord {
  id: string; // Agora sid
  channel: string; // cohort / room code
  files: string[]; // object keys in your bucket
  startedAt: string;
  endedAt: string;
  durationSec: number;
  by?: string; // instructor email
}

const mem: RecordingRecord[] = [];
let pool: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> } | null = null;
let ready: Promise<void> | null = null;

async function init(): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (!url) return; // in-memory mode
  const spec = "pg"; // non-literal specifier: keeps tsc from requiring @types/pg
  const pg: any = await import(spec);
  const Pool = pg.default?.Pool ?? pg.Pool;
  pool = new Pool({ connectionString: url });
  await pool!.query(
    `CREATE TABLE IF NOT EXISTS live_recordings (
       id text PRIMARY KEY, channel text, files jsonb NOT NULL DEFAULT '[]',
       started_at timestamptz, ended_at timestamptz, duration_sec integer, created_by text)`,
  );
}
function ensure(): Promise<void> {
  if (!ready) ready = init().catch(() => { pool = null; });
  return ready;
}

function rowToRec(r: any): RecordingRecord {
  return {
    id: r.id,
    channel: r.channel,
    files: Array.isArray(r.files) ? r.files : [],
    startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : r.started_at,
    endedAt: r.ended_at instanceof Date ? r.ended_at.toISOString() : r.ended_at,
    durationSec: r.duration_sec ?? 0,
    by: r.created_by ?? undefined,
  };
}

export async function saveRecording(r: RecordingRecord): Promise<void> {
  await ensure();
  if (pool) {
    await pool.query(
      `INSERT INTO live_recordings (id,channel,files,started_at,ended_at,duration_sec,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.channel, JSON.stringify(r.files), r.startedAt, r.endedAt, r.durationSec, r.by ?? null],
    );
  } else {
    mem.unshift(r);
    if (mem.length > 1000) mem.pop();
  }
}

export async function listRecordings(channel: string | undefined, limit = 100): Promise<RecordingRecord[]> {
  await ensure();
  if (pool) {
    const q = channel
      ? await pool.query("SELECT * FROM live_recordings WHERE channel=$1 ORDER BY ended_at DESC LIMIT $2", [channel, limit])
      : await pool.query("SELECT * FROM live_recordings ORDER BY ended_at DESC LIMIT $1", [limit]);
    return q.rows.map(rowToRec);
  }
  return (channel ? mem.filter((r) => r.channel === channel) : mem).slice(0, limit);
}
