import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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
    select: { status: true },
  });
  if (!delivery) throw new Error("The newsletter confirmation is not queued.");
}
