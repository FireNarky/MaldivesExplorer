import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dispatchDelivery } from "@/lib/email/dispatch";
import { absoluteUrl } from "@/lib/seo/site";
import { expireDueQuotes } from "@/modules/quotes/service";

function versionId(payload: Prisma.JsonValue): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  return "versionId" in payload && typeof payload.versionId === "string" ? payload.versionId : "";
}

export async function confirmQueuedQuote(payload: Prisma.JsonValue): Promise<void> {
  const id = versionId(payload);
  if (!id) throw new Error("The quote send job has no version.");
  const delivery = await db.emailDelivery.findUnique({
    where: { idempotencyKey: `quote.sent:${id}` },
    select: { id: true, status: true },
  });
  if (!delivery) throw new Error("The quote email is not queued.");
  if (delivery.status === "SENT") return;
  const version = await db.quoteVersion.findUnique({
    where: { id },
    select: { quote: { select: { reference: true } } },
  });
  const reference = version?.quote.reference ?? "your quote";
  await dispatchDelivery(delivery.id, async () => ({
    subject: `Quote ${reference}`,
    text: `Quote ${reference} is ready in your account at ${absoluteUrl("/account")}.`,
  }));
}

export async function expireQuoteJob(payload: Prisma.JsonValue): Promise<void> {
  if (!versionId(payload)) throw new Error("The quote expiry job has no version.");
  await expireDueQuotes();
}
