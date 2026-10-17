export interface BotProtection {
  readonly configured: boolean;
  verify(token: string | null, remoteIp?: string | null): Promise<boolean>;
}

export class DisabledBotProtection implements BotProtection {
  readonly configured = false;

  async verify(): Promise<boolean> {
    return true;
  }
}

export class RejectingBotProtection implements BotProtection {
  readonly configured = true;

  async verify(): Promise<boolean> {
    return false;
  }
}

export class TurnstileBotProtection implements BotProtection {
  readonly configured = true;

  constructor(private readonly secret: string) {}

  async verify(token: string | null, remoteIp?: string | null): Promise<boolean> {
    if (!token) return false;
    try {
      const body = new URLSearchParams({ secret: this.secret, response: token });
      if (remoteIp) body.set("remoteip", remoteIp);
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { success?: boolean };
      return payload.success === true;
    } catch {
      return false;
    }
  }
}

export function botProtection(): BotProtection {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (secret) return new TurnstileBotProtection(secret);
  if (process.env.APP_ENV === "staging" || process.env.APP_ENV === "production") {
    return new RejectingBotProtection();
  }
  return new DisabledBotProtection();
}

export function turnstileToken(formData: FormData): string | null {
  const value = formData.get("cf-turnstile-response");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
