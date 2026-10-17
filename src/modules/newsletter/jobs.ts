import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dispatchDelivery } from "@/lib/email/dispatch";
import {
  hashVerificationToken,
  mintRawToken,
  retireVerificationHash,
  storeVerificationHash,
} from "@/lib/email/tokens";
import { absoluteUrl } from "@/lib/seo/site";

function subscriptionId(payload: Prisma.JsonValue): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  return "subscriptionId" in payload && typeof payload.subscriptionId === "string"
    ? payload.subscriptionId
    : "";
}

export async function confirmQueuedNewsletter(payload: Prisma.JsonValue): Promise<void> {
  const id = subscriptionId(payload);
  if (!id) throw new Error("The newsletter confirmation has no subscription.");
  const delivery = await db.emailDelivery.findFirst({
    where: {
      relatedType: "subscription",
      relatedId: id,
      templateCode: "newsletter.confirm",
      status: "QUEUED",
    },
    select: { id: true },
  });
  if (!delivery) throw new Error("The newsletter confirmation is not queued.");
  await dispatchDelivery(delivery.id, async () => {
    const raw = mintRawToken();
    const hash = hashVerificationToken(raw);
    await storeVerificationHash({
      identifier: `newsletter:${id}`,
      hash,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await db.subscription.update({ where: { id }, data: { confirmTokenHash: hash } });
    return {
      subject: "Confirm the Maldives Explorer newsletter",
      text: `Confirm this subscription at ${absoluteUrl(`/newsletter/confirm?token=${raw}`)}.`,
      releaseSecret: async () => {
        await retireVerificationHash(hash);
        await db.subscription.update({ where: { id }, data: { confirmTokenHash: null } });
      },
    };
  });
}
