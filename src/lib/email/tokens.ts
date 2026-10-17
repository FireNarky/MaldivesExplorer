import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export function hashVerificationToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function storeVerificationHash(input: {
  identifier: string;
  hash: string;
  expires: Date;
}): Promise<void> {
  await db.verificationToken.create({
    data: { identifier: input.identifier, token: input.hash, expires: input.expires },
  });
}

export async function retireVerificationHash(hash: string): Promise<void> {
  await db.verificationToken.deleteMany({ where: { token: hash } });
}

export function mintRawToken(): string {
  return randomBytes(32).toString("base64url");
}
