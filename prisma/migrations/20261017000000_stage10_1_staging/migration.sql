CREATE TABLE "rate_limit_buckets" (
    "bucket_key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "hits" INTEGER NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key","window_start")
);

DELETE FROM "verification_tokens" WHERE "identifier" LIKE 'claim:%';
