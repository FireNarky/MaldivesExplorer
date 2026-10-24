import { isExplicitLocalEnvironment } from "@/lib/env/schema";

type Env = Record<string, string | undefined>;

/**
 * Local-only sign-in helper for the `?uat=1` bar on /login.
 *
 * It is available only when ALL of these hold: `APP_ENV` is explicitly and exactly `local` (unset or empty does not count), `ENABLE_UAT_QUICK_FILL` is
 * exactly `true`, and a seeded administrator email and password are set in the server
 * environment. The credentials come from that environment (the same `SEED_ADMIN_*` values the
 * local seed uses), never from source code, and they are only passed to the page when the gate is
 * open. Staging, preview, and production can never open it. There is no default password, no
 * traveller account, and no way to bypass sign-in: the helper only pre-fills the normal form.
 */
export function uatQuickFill(env: Env = process.env): { email: string; password: string } | null {
  if (env.ENABLE_UAT_QUICK_FILL !== "true") return null;
  if (!isExplicitLocalEnvironment(env)) return null;
  const email = env.SEED_ADMIN_EMAIL?.trim();
  const password = env.SEED_ADMIN_PASSWORD;
  return email && password ? { email, password } : null;
}
