import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const moduleStatus = "implemented" as const;

export async function queueEnquiryAcknowledgement(
  tx: Prisma.TransactionClient,
  input: {
    enquiryId: string;
    toEmail: string;
    reference: string;
    claimUrl: string | null;
  },
): Promise<void> {
  const idempotencyKey = `enquiry.received:${input.enquiryId}`;
  const template = await tx.emailTemplate.findFirst({
    where: { code: "enquiry.received", locale: "en" },
    select: { id: true },
  });
  await tx.emailDelivery.create({
    data: {
      templateId: template?.id,
      templateCode: "enquiry.received",
      toEmail: input.toEmail,
      classification: "TRANSACTIONAL",
      idempotencyKey,
      status: "QUEUED",
      relatedType: "enquiry",
      relatedId: input.enquiryId,
    },
  });
  await tx.job.create({
    data: {
      type: "enquiry.acknowledge",
      idempotencyKey,
      payload: {
        template: "enquiry.received",
        enquiryId: input.enquiryId,
        toEmail: input.toEmail,
        reference: input.reference,
        claimUrl: input.claimUrl,
      },
    },
  });
}

export async function confirmQueuedAcknowledgement(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The acknowledgement job has no enquiry.");
  }
  const enquiryId =
    "enquiryId" in payload && typeof payload.enquiryId === "string" ? payload.enquiryId : "";
  const delivery = await db.emailDelivery.findFirst({
    where: { relatedType: "enquiry", relatedId: enquiryId, templateCode: "enquiry.received" },
    select: { id: true, status: true },
  });
  if (!delivery) throw new Error("The acknowledgement is not queued.");
}
