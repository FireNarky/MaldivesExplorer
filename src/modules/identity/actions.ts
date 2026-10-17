"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { botProtection, turnstileToken } from "@/lib/bot/protection";
import { rateLimiter } from "@/lib/rate-limit/limiter";
import { sealChallenge } from "@/lib/auth/challenge";
import { createTotpSecret, totpFor } from "@/lib/auth/mfa";
import { hashPassword, passwordError } from "@/lib/auth/password";
import { signIn } from "@/auth";
import { enqueueJob } from "@/jobs/worker";
import { redeemClaim } from "@/modules/customers/service";
import { claimToken, safeAccountPath } from "@/modules/customers/rules";
import { isStaffUser } from "@/modules/identity/service";

async function limited(key: string, limit = 5): Promise<boolean> {
  const allowed = await rateLimiter().consume(key, limit, 15 * 60 * 1000);
  return !allowed;
}

async function botAllows(formData: FormData): Promise<boolean> {
  return botProtection().verify(turnstileToken(formData));
}

async function queueAuthMessage(template: string, userId: string): Promise<void> {
  await enqueueJob({
    type: "email.deliver",
    payload: { template, userId },
    idempotencyKey: `${template}:${userId}:${randomBytes(8).toString("hex")}`,
  });
}

export async function passwordSignIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!(await botAllows(formData))) redirect("/login?error=check");
  if (await limited(`password:${email}`)) redirect("/login?error=limited");
  const user = await db.user.findUnique({ where: { email } });
  const { verifyPassword } = await import("@/lib/auth/password");
  if (
    !user?.passwordHash ||
    user.status !== "ACTIVE" ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    redirect("/login?error=credentials");
  }
  if (await isStaffUser(user.id)) {
    const factor = await db.mfaFactor.findUnique({
      where: { userId_type: { userId: user.id, type: "TOTP" } },
    });
    const purpose = factor?.enabledAt ? "verify" : "enroll";
    const pendingSecret = purpose === "enroll" ? createTotpSecret() : undefined;
    const jar = await cookies();
    jar.set(
      "mfa_challenge",
      sealChallenge({ userId: user.id, purpose, pendingSecret, exp: Date.now() + 10 * 60 * 1000 }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.APP_ENV === "production",
        path: "/",
        maxAge: 600,
      },
    );
    redirect("/login/mfa");
  }
  const destination = accountDestination(formData);
  try {
    await signIn("credentials", { email, password, redirectTo: destination });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=credentials");
    throw error;
  }
}

export async function completeMfa(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim();
  const jar = await cookies();
  const challenge = jar.get("mfa_challenge")?.value;
  if (!challenge) redirect("/login?error=challenge");
  const { readChallenge } = await import("@/lib/auth/challenge");
  const parsed = readChallenge(challenge);
  if (await limited(`mfa:${parsed?.userId ?? "missing"}`)) redirect("/login/mfa?error=limited");
  try {
    await signIn("credentials", { challenge, totp: code, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login/mfa?error=code");
    throw error;
  }
}

export async function registerAccount(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!(await botAllows(formData))) redirect("/register?error=check");
  if (await limited(`register:${email}`)) redirect("/register?error=limited");
  if (!name || passwordError(password)) redirect("/register?error=invalid");
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect("/register?error=unavailable");
  const claim = claimToken(String(formData.get("claim") ?? ""));
  await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), status: "ACTIVE" },
  });
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  let notice = "";
  if (user && claim) {
    try {
      const result = await redeemClaim(user.id, claim);
      notice = result.linked ? "linked" : "claim";
    } catch {
      notice = "claim";
    }
  }
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: notice ? `/account?notice=${notice}` : "/account",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=credentials");
    throw error;
  }
}

function accountDestination(formData: FormData): string {
  const claim = claimToken(String(formData.get("claim") ?? ""));
  if (claim) return `/account?claim=${encodeURIComponent(claim)}`;
  return safeAccountPath(String(formData.get("next") ?? "")) ?? "/";
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!(await botAllows(formData))) redirect("/forgot-password?error=check");
  if (await limited(`reset:${email}`)) redirect("/forgot-password?sent=1");
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    await queueAuthMessage("auth.reset-password", user.id);
  }
  redirect("/forgot-password?sent=1");
}

export async function requestMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!(await botAllows(formData))) redirect("/login?error=check");
  if (await limited(`magic:${email}`)) redirect("/login?sent=1");
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE" && !(await isStaffUser(user.id))) {
    await queueAuthMessage("auth.magic-link", user.id);
  }
  redirect("/login?sent=1");
}

export async function enrollmentUri(): Promise<string | null> {
  const { readChallenge } = await import("@/lib/auth/challenge");
  const jar = await cookies();
  const challenge = readChallenge(jar.get("mfa_challenge")?.value ?? "");
  if (!challenge || challenge.purpose !== "enroll" || !challenge.pendingSecret) return null;
  const user = await db.user.findUnique({
    where: { id: challenge.userId },
    select: { email: true },
  });
  if (!user) return null;
  return totpFor(challenge.pendingSecret, user.email).toString();
}
