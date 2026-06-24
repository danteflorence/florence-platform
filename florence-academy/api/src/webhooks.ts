// Outbound webhooks: each event is HMAC-SHA256 signed and replay-protected
// (timestamp in the signature). Delivers to registered subscriptions over HTTP
// POST with bounded retries + exponential backoff; exhausted deliveries land in
// a dead-letter list. The in-memory `sink` lets demos/tests inspect what was
// emitted regardless of delivery.

import { randomUUID } from "node:crypto";
import { signWebhook } from "./crypto.ts";

export interface WebhookEvent {
  id: string;
  type: string;
  created_at: string;
  data: unknown;
}

export interface DeliveredWebhook {
  event: WebhookEvent;
  /** `Florence-Signature` header value: `t=<unix>,v1=<hmac-hex>`. */
  signature: string;
  body: string;
}

export interface Subscription {
  id: string;
  url: string;
  /** Event types to receive, or `["*"]` for all. */
  events: string[];
}

export interface DeadLetter {
  event: WebhookEvent;
  url: string;
  attempts: number;
  status?: number;
  error?: string;
}

export interface EmitterOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Disable HTTP delivery (record-only) - used by the in-process smoke test. */
  deliver?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class WebhookEmitter {
  private secret: string;
  private sink: DeliveredWebhook[] = [];
  private subs: Subscription[] = [];
  private dead: DeadLetter[] = [];
  private pending: Promise<void>[] = [];
  private maxAttempts: number;
  private baseDelayMs: number;
  private deliverEnabled: boolean;

  constructor(secret: string, opts: EmitterOptions = {}) {
    this.secret = secret;
    this.maxAttempts = opts.maxAttempts ?? 5;
    this.baseDelayMs = opts.baseDelayMs ?? 200;
    this.deliverEnabled = opts.deliver ?? true;
  }

  subscribe(url: string, events: string[]): Subscription {
    const sub: Subscription = {
      id: `sub_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      url,
      events,
    };
    this.subs.push(sub);
    return sub;
  }

  emit(type: string, data: unknown): DeliveredWebhook {
    const nowSec = Math.floor(Date.now() / 1000);
    const event: WebhookEvent = {
      id: `evt_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      type,
      created_at: new Date(nowSec * 1000).toISOString(),
      data,
    };
    const body = JSON.stringify(event);
    const signature = signWebhook(this.secret, body, nowSec);
    const delivered: DeliveredWebhook = { event, signature, body };
    this.sink.push(delivered);
    console.log(`[webhook] ${type} ${event.id}`);
    if (this.deliverEnabled) {
      for (const sub of this.subs) {
        if (sub.events.includes("*") || sub.events.includes(type)) {
          this.pending.push(this.deliver(sub, delivered));
        }
      }
    }
    return delivered;
  }

  private async deliver(sub: Subscription, d: DeliveredWebhook): Promise<void> {
    let lastStatus: number | undefined;
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const res = await fetch(sub.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "florence-signature": d.signature,
            "florence-event": d.event.type,
            "florence-event-id": d.event.id,
          },
          body: d.body,
        });
        if (res.ok) return;
        lastStatus = res.status;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
      if (attempt < this.maxAttempts) await sleep(this.baseDelayMs * attempt);
    }
    const dl: DeadLetter = { event: d.event, url: sub.url, attempts: this.maxAttempts };
    if (lastStatus !== undefined) dl.status = lastStatus;
    if (lastError !== undefined) dl.error = lastError;
    this.dead.push(dl);
    console.warn(`[webhook] dead-letter ${d.event.id} → ${sub.url} after ${this.maxAttempts} attempts`);
  }

  /** Await all in-flight deliveries (tests/shutdown). */
  async flush(): Promise<void> {
    await Promise.all(this.pending);
    this.pending = [];
  }

  recent(n = 50): DeliveredWebhook[] {
    return this.sink.slice(-n);
  }
  deadLetters(): DeadLetter[] {
    return [...this.dead];
  }
  subscriptions(): Subscription[] {
    return [...this.subs];
  }
}
