import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type MfaChallenge = {
  userId: string;
  purpose: "verify" | "enroll";
  pendingSecret?: string;
  exp: number;
};

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication is not configured.");
  return createHash("sha256").update(`mfa:${secret}`).digest();
}

export function sealChallenge(challenge: MfaChallenge): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(challenge), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function readChallenge(stored: string): MfaChallenge | null {
  try {
    const [ivPart, tagPart, dataPart] = stored.split(".");
    if (!ivPart || !tagPart || !dataPart) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plain) as MfaChallenge;
    if (!parsed.userId || (parsed.purpose !== "verify" && parsed.purpose !== "enroll")) return null;
    if (parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
