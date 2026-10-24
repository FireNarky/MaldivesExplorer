import { z } from "zod";

export const appEnvironments = ["local", "preview", "staging", "production"] as const;

export type AppEnvironment = (typeof appEnvironments)[number];

const blankToUndefined = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const schema = z.object({
  APP_ENV: z.preprocess(blankToUndefined, z.enum(appEnvironments).default("local")),
  DATABASE_URL: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  AUTH_SECRET: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  AUTH_URL: z.preprocess(blankToUndefined, z.string().url().optional()),
});

export type AppEnv = z.infer<typeof schema>;

export function parseAppEnv(source: Record<string, string | undefined>): AppEnv {
  return schema.parse({
    APP_ENV: source.APP_ENV,
    DATABASE_URL: source.DATABASE_URL,
    AUTH_SECRET: source.AUTH_SECRET,
    AUTH_URL: source.AUTH_URL,
  });
}

/**
 * Fail-closed check for security-sensitive test/UAT gates. Unlike `parseAppEnv`, which defaults a
 * missing `APP_ENV` to `local` for ordinary behaviour, this is true only when `APP_ENV` is set to
 * exactly `local`. Unset, empty, padded, differently cased, or unrecognised values are all false.
 */
export function isExplicitLocalEnvironment(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return source.APP_ENV === "local";
}

export function readAppEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  return parseAppEnv(source);
}
