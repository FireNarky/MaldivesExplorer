import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { deliverEmail } from "@/jobs/handlers/email";
import { confirmQueuedAcknowledgement } from "@/modules/communications/service";
import { confirmPrivacyRequest } from "@/modules/customers/privacy-handler";
import { confirmQueuedQuote, expireQuoteJob } from "@/modules/quotes/jobs";

export type JobHandler = (payload: Prisma.JsonValue) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export async function enqueueJob(input: {
  type: string;
  payload: Prisma.InputJsonValue;
  idempotencyKey: string;
  runAt?: Date;
}): Promise<string> {
  const existing = await db.job.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  });
  if (existing) return existing.id;
  const row = await db.job.create({
    data: {
      type: input.type,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      runAt: input.runAt ?? new Date(),
    },
    select: { id: true },
  });
  return row.id;
}

type ClaimedJob = {
  id: string;
  type: string;
  payload: Prisma.JsonValue;
  attempts: number;
};

export async function runDueJobs(limit = 10): Promise<number> {
  let completed = 0;
  for (let index = 0; index < limit; index += 1) {
    const claimed = await db.$queryRaw<ClaimedJob[]>`
      WITH next_job AS (
        SELECT id FROM jobs
        WHERE status = 'PENDING' AND run_at <= now()
        ORDER BY run_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE jobs
      SET status = 'RUNNING', locked_at = now(), attempts = attempts + 1
      FROM next_job
      WHERE jobs.id = next_job.id
      RETURNING jobs.id, jobs.type, jobs.payload, jobs.attempts
    `;
    const job = claimed[0];
    if (!job) break;
    const handler = handlers.get(job.type);
    try {
      if (!handler) throw new Error(`No handler is registered for ${job.type}.`);
      await handler(job.payload);
      await db.job.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", finishedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      await db.job.update({
        where: { id: job.id },
        data: { status: "FAILED", finishedAt: new Date(), lastError: message },
      });
    }
    completed += 1;
  }
  return completed;
}

registerJobHandler("email.deliver", deliverEmail);
registerJobHandler("enquiry.acknowledge", confirmQueuedAcknowledgement);
registerJobHandler("privacy.export", confirmPrivacyRequest);
registerJobHandler("privacy.deletion", confirmPrivacyRequest);
registerJobHandler("quote.send", confirmQueuedQuote);
registerJobHandler("quote.expire", expireQuoteJob);
