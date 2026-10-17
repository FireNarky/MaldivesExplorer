import { db } from "../src/lib/db";
import { rateLimiter, resetMemoryRateLimiter } from "../src/lib/rate-limit/limiter";
import { promoteDuePublications } from "../src/modules/publishing/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.includes("maldives_stage1")) {
    throw new Error("Stage 10.1 exercise refused a database that is not disposable.");
  }
  process.env.RATE_LIMIT_STORE = "database";
  const limiter = rateLimiter();
  const key = `stage10:${Date.now()}`;
  assert(await limiter.consume(key, 1, 60_000), "The shared limiter refused the first request.");
  assert(!(await limiter.consume(key, 1, 60_000)), "The shared limiter allowed a second request.");
  resetMemoryRateLimiter();

  await db.faq.create({
    data: {
      ownerType: "GLOBAL",
      question: "Stage 10 schedule check",
      answer: "Scheduled question.",
      status: "SCHEDULED",
      scheduledAt: new Date(Date.now() - 60_000),
    },
  });
  await promoteDuePublications();
  const faq = await db.faq.findFirstOrThrow({
    where: { question: "Stage 10 schedule check" },
    select: { id: true, status: true, publishedAt: true, scheduledAt: true },
  });
  assert(
    faq.status === "PUBLISHED" && faq.publishedAt,
    "The scheduled question was not published.",
  );
  const audit = await db.auditLog.findFirst({
    where: { action: "publication.promote", entityType: "faq", entityId: faq.id },
  });
  const before =
    audit?.before && typeof audit.before === "object" && !Array.isArray(audit.before)
      ? audit.before
      : null;
  const after =
    audit?.after && typeof audit.after === "object" && !Array.isArray(audit.after)
      ? audit.after
      : null;
  assert(before && after, "Scheduled publication did not write an audit row.");
  assert(
    before.status === "SCHEDULED" &&
      after.status === "PUBLISHED" &&
      after.actor === "system:publication-scheduler",
    "The publication audit did not record the status change.",
  );
  const leakedJobs = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM jobs
    WHERE payload::text LIKE '%claim=%' OR payload::text LIKE '%token=%'
  `;
  assert(leakedJobs.length === 0, "A job payload contains a raw token.");
  const leakedAudits = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM audit_logs
    WHERE "before"::text LIKE '%claim=%' OR "after"::text LIKE '%claim=%'
       OR "before"::text LIKE '%token=%' OR "after"::text LIKE '%token=%'
  `;
  assert(leakedAudits.length === 0, "An audit row contains a raw token.");
  const rawTokens = await db.$queryRaw<Array<{ token: string }>>`
    SELECT token FROM verification_tokens
    WHERE token !~ '^[a-f0-9]{64}$'
  `;
  assert(rawTokens.length === 0, "A verification token is not a hash.");
  console.log("Stage 10.1 exercise passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Stage 10.1 exercise failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
