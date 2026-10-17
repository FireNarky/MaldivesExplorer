export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

export type EmailAcceptance = {
  accepted: true;
  providerMessageId: string;
};

export type EmailRefusal = {
  accepted: false;
  reason: string;
};

export type EmailResult = EmailAcceptance | EmailRefusal;

export interface EmailProvider {
  readonly configured: boolean;
  send(message: EmailMessage): Promise<EmailResult>;
}

export class DisabledEmailProvider implements EmailProvider {
  readonly configured = false;

  async send(message: EmailMessage): Promise<EmailResult> {
    void message;
    return { accepted: false, reason: "Email delivery is not configured." };
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly configured = true;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
    } catch {
      return { accepted: false, reason: "The email provider could not be reached." };
    }
    if (!response.ok) {
      return {
        accepted: false,
        reason: `The email provider refused the message (${response.status}).`,
      };
    }
    const body = (await response.json()) as { id?: unknown };
    if (typeof body.id !== "string" || body.id.length === 0) {
      return { accepted: false, reason: "The email provider did not return a message id." };
    }
    return { accepted: true, providerMessageId: body.id };
  }
}

const captured: string[] = [];

export class CaptureEmailProvider implements EmailProvider {
  readonly configured = true;

  async send(message: EmailMessage): Promise<EmailResult> {
    captured.push(message.text);
    return { accepted: true, providerMessageId: `capture-${captured.length}` };
  }
}

export function capturedEmails(): string[] {
  return [...captured];
}

export function takeCapturedEmail(): string {
  return captured.pop() ?? "";
}

export function emailProvider(): EmailProvider {
  const choice = process.env.EMAIL_PROVIDER?.trim();
  const env = process.env.APP_ENV;
  if (choice === "capture") {
    if (env === "staging" || env === "production") {
      throw new Error("The capture email provider is not allowed.");
    }
    return new CaptureEmailProvider();
  }
  if (choice === "resend") {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) return new DisabledEmailProvider();
    return new ResendEmailProvider(apiKey, from);
  }
  return new DisabledEmailProvider();
}
