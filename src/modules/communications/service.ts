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

export const moduleStatus = "implemented" as const;

export async function queueEnquiryAcknowledgement(
  tx: Prisma.TransactionClient,
  input: {
    enquiryId: string;
    toEmail: string;
    reference: string;
    claimRequired: boolean;
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
        reference: input.reference,
        claimRequired: input.claimRequired,
      },
    },
  });
}

function payloadRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

export async function confirmQueuedAcknowledgement(payload: unknown): Promise<void> {
  const record = payloadRecord(payload);
  const enquiryId = typeof record?.enquiryId === "string" ? record.enquiryId : "";
  const reference = typeof record?.reference === "string" ? record.reference : "";
  const claimRequired = record?.claimRequired === true;
  if (!enquiryId) throw new Error("The acknowledgement job has no enquiry.");
  const delivery = await db.emailDelivery.findFirst({
    where: { relatedType: "enquiry", relatedId: enquiryId, templateCode: "enquiry.received" },
    select: { id: true },
  });
  if (!delivery) throw new Error("The acknowledgement is not queued.");
  await dispatchDelivery(delivery.id, async () => {
    let claimLine = "";
    let hash = "";
    if (claimRequired) {
      const enquiry = await db.enquiry.findUnique({
        where: { id: enquiryId },
        select: { customer: { select: { email: true, userId: true } } },
      });
      if (enquiry && !enquiry.customer.userId) {
        const raw = mintRawToken();
        hash = hashVerificationToken(raw);
        await storeVerificationHash({
          identifier: `claim:${enquiry.customer.email}`,
          hash,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        claimLine = ` Link this plan from ${absoluteUrl(`/register?claim=${raw}`)}.`;
      }
    }
    return {
      subject: `Plan ${reference} received`,
      text: `We received plan ${reference}.${claimLine}`,
      releaseSecret: hash ? () => retireVerificationHash(hash) : undefined,
    };
  });
}
