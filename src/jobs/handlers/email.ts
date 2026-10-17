import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dispatchDelivery } from "@/lib/email/dispatch";
import { emailProvider } from "@/lib/email/provider";
import {
  hashVerificationToken,
  mintRawToken,
  retireVerificationHash,
  storeVerificationHash,
} from "@/lib/email/tokens";
import { absoluteUrl } from "@/lib/seo/site";

function record(payload: Prisma.JsonValue): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

export async function deliverEmail(payload: Prisma.JsonValue): Promise<void> {
  if (!emailProvider().configured) throw new Error("Email delivery is not configured.");
  const body = record(payload);
  const template = typeof body?.template === "string" ? body.template : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true },
      })
    : null;
  if (!user || user.status !== "ACTIVE") throw new Error("The email has no recipient.");
  const delivery = await db.emailDelivery.create({
    data: {
      templateCode: template || "auth.message",
      toEmail: user.email,
      classification: "TRANSACTIONAL",
      idempotencyKey: `auth:${template}:${user.id}:${randomBytes(8).toString("hex")}`,
      status: "QUEUED",
      relatedType: "user",
      relatedId: user.id,
    },
    select: { id: true },
  });
  await dispatchDelivery(delivery.id, async () => {
    if (template !== "auth.reset-password" && template !== "auth.magic-link") {
      return { subject: "Maldives Explorer", text: "A message is ready in your account." };
    }
    const raw = mintRawToken();
    const hash = hashVerificationToken(raw);
    const purpose = template === "auth.reset-password" ? "reset" : "magic";
    const path = purpose === "reset" ? `/forgot-password?token=${raw}` : `/login?token=${raw}`;
    await storeVerificationHash({
      identifier: `${purpose}:${user.email}`,
      hash,
      expires: new Date(Date.now() + (purpose === "reset" ? 30 : 15) * 60 * 1000),
    });
    return {
      subject: purpose === "reset" ? "Reset your password" : "Sign in to Maldives Explorer",
      text: `Use this link: ${absoluteUrl(path)}`,
      releaseSecret: () => retireVerificationHash(hash),
    };
  });
}
