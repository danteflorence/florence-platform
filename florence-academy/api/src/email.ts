// Email delivery abstraction (transactional — currently just verification).
//
// Like payments, the real path is provider-agnostic and DORMANT by default: with
// no EMAIL_RELAY_URL set, a Mock provider logs the message and retains the last
// one per recipient so the dev/demo flow can complete without a real inbox. To go
// live, point EMAIL_RELAY_URL at your ESP/relay (it receives {to,subject,text,html}).

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  readonly name: string;
  readonly isMock: boolean;
  send(msg: EmailMessage): Promise<void>;
}

/** Dev/test: logs the message and keeps the last one per recipient. */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  readonly isMock = true;
  private last = new Map<string, EmailMessage>();
  async send(msg: EmailMessage): Promise<void> {
    this.last.set(msg.to.toLowerCase(), msg);
    console.log(`[email:mock] to=${msg.to} subject=${JSON.stringify(msg.subject)}`);
  }
  lastFor(email: string): EmailMessage | undefined {
    return this.last.get(email.toLowerCase());
  }
}

/** Real, provider-agnostic delivery: POST the message to a relay/ESP endpoint. */
export class RelayEmailProvider implements EmailProvider {
  readonly name = "relay";
  readonly isMock = false;
  private url: string;
  private authHeader: string | undefined;
  constructor(url: string, authHeader: string | undefined) {
    this.url = url;
    this.authHeader = authHeader;
  }
  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.authHeader && { authorization: this.authHeader }),
      },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error(`email relay failed: ${res.status}`);
  }
}

export function selectEmailProvider(): EmailProvider {
  const url = process.env["EMAIL_RELAY_URL"];
  return url ? new RelayEmailProvider(url, process.env["EMAIL_RELAY_AUTH"]) : new MockEmailProvider();
}
