import { redactError, redactForLog } from "./classification.ts";
import { nowIso } from "./util.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLogEntry {
  at: string;
  level: LogLevel;
  service: "florence-core";
  event: string;
  component?: string;
  requestId?: string;
  message?: string;
  metadata?: unknown;
  error?: ReturnType<typeof redactError>;
}

export type LogSink = (entry: StructuredLogEntry) => void;
export type StructuredLogLineSink = (line: string) => void;

export interface StructuredLogger {
  debug(event: string, metadata?: unknown): void;
  info(event: string, metadata?: unknown): void;
  warn(event: string, metadata?: unknown): void;
  error(event: string, errorOrMetadata?: unknown, metadata?: unknown): void;
  child(metadata: { component?: string; requestId?: string }): StructuredLogger;
}

export type Logger = StructuredLogger;

function defaultSink(entry: StructuredLogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(args: {
  component?: string;
  requestId?: string;
  sink?: LogSink;
  now?: () => string;
} = {}): Logger {
  const sink = args.sink ?? defaultSink;
  const now = args.now ?? nowIso;

  const emit = (level: LogLevel, event: string, metadata?: unknown, error?: unknown): void => {
    const redactedMetadata = metadata === undefined ? undefined : redactForLog(metadata);
    const entry: StructuredLogEntry = {
      at: now(),
      level,
      service: "florence-core",
      event: String(redactForLog(event)),
      ...(args.component ? { component: String(redactForLog(args.component)) } : {}),
      ...(args.requestId ? { requestId: String(redactForLog(args.requestId)) } : {}),
      ...(redactedMetadata !== undefined ? { metadata: redactedMetadata } : {}),
      ...(error !== undefined ? { error: redactError(error) } : {}),
    };
    sink(entry);
  };

  return {
    debug(event, metadata) { emit("debug", event, metadata); },
    info(event, metadata) { emit("info", event, metadata); },
    warn(event, metadata) { emit("warn", event, metadata); },
    error(event, errorOrMetadata, metadata) {
      if (metadata !== undefined || errorOrMetadata instanceof Error) {
        emit("error", event, metadata, errorOrMetadata);
      } else {
        emit("error", event, errorOrMetadata);
      }
    },
    child(metadata) {
      return createLogger({
        component: metadata.component ?? args.component,
        requestId: metadata.requestId ?? args.requestId,
        sink,
        now,
      });
    },
  };
}

export function createStructuredLogger(args: {
  component?: string;
  requestId?: string;
  sink?: StructuredLogLineSink;
  now?: () => string;
} = {}): StructuredLogger {
  const sink = args.sink ?? ((line) => {
    console.log(line);
  });
  return createLogger({
    component: args.component,
    requestId: args.requestId,
    now: args.now,
    sink: (entry) => sink(JSON.stringify(entry)),
  });
}

export const logger = createLogger();
