import { db } from "@/lib/db";
import { emailProvider, type EmailMessage } from "@/lib/email/provider";

export type OutboundMail = {
  subject: string;
  text: string;
  releaseSecret?: () => Promise<void>;
};

function allowlisted(email: string): boolean {
  if (process.env.APP_ENV !== "staging") return true;
  const list = (process.env.EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

async function marketingBlocked(email: string, templateCode: string, classification: string) {
  if (classification !== "MARKETING" && templateCode !== "newsletter.confirm") return false;
  const row = await db.subscription.findUnique({
    where: { email },
    select: { status: true },
  });
  return row?.status === "SUPPRESSED" || row?.status === "UNSUBSCRIBED";
}

export async function dispatchDelivery(
  deliveryId: string,
  compose: () => Promise<OutboundMail>,
): Promise<void> {
  const delivery = await db.emailDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new Error("The email is not queued.");
  if (delivery.status === "SENT") return;
  if (await marketingBlocked(delivery.toEmail, delivery.templateCode, delivery.classification)) {
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "SUPPRESSED", error: "The address is suppressed." },
    });
    throw new Error("The address is suppressed.");
  }
  if (!allowlisted(delivery.toEmail)) {
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: "The recipient is not allowed in this environment." },
    });
    throw new Error("The recipient is not allowed in this environment.");
  }
  const provider = emailProvider();
  if (!provider.configured) {
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: "Email delivery is not configured." },
    });
    throw new Error("Email delivery is not configured.");
  }
  const message = await compose();
  const outbound: EmailMessage = {
    to: delivery.toEmail,
    subject: message.subject,
    text: message.text,
    idempotencyKey: delivery.idempotencyKey,
  };
  const result = await provider.send(outbound);
  if (!result.accepted) {
    await message.releaseSecret?.();
    await db.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: result.reason },
    });
    throw new Error(result.reason);
  }
  const sent = await db.emailDelivery.updateMany({
    where: { id: delivery.id, status: "QUEUED" },
    data: { status: "SENT", providerId: result.providerMessageId, sentAt: new Date(), error: null },
  });
  if (sent.count !== 1) {
    throw new Error("The email was not waiting to be sent.");
  }
}
