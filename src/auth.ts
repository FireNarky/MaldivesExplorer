import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { decryptSecret, verifyTotp } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/password";
import { isStaffUser } from "@/modules/identity/service";
import { readChallenge } from "@/lib/auth/challenge";

const staffSessionMs = 12 * 60 * 60 * 1000;
const customerSessionMs = 30 * 24 * 60 * 60 * 1000;

function configuredSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

let cached: ReturnType<typeof NextAuth> | null = null;

function authInstance() {
  const secret = configuredSecret();
  if (!secret) return null;
  cached ??= NextAuth({
    secret,
    trustHost: true,
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    pages: { signIn: "/login" },
    providers: [
      Credentials({
        credentials: {
          email: {},
          password: {},
          challenge: {},
          totp: {},
        },
        authorize: async (credentials) => {
          const challengeValue =
            typeof credentials.challenge === "string" ? credentials.challenge : "";
          const totp = typeof credentials.totp === "string" ? credentials.totp : "";
          const challenge = challengeValue ? readChallenge(challengeValue) : null;

          const user = challenge
            ? await db.user.findUnique({ where: { id: challenge.userId } })
            : await db.user.findUnique({
                where: {
                  email: String(credentials.email ?? "")
                    .trim()
                    .toLowerCase(),
                },
              });
          if (!user || user.status !== "ACTIVE") return null;

          if (challenge) {
            const factor =
              challenge.purpose === "verify"
                ? await db.mfaFactor.findUnique({
                    where: { userId_type: { userId: user.id, type: "TOTP" } },
                  })
                : null;
            const secretValue =
              challenge.purpose === "enroll"
                ? challenge.pendingSecret
                : factor?.secretEncrypted
                  ? decryptSecret(factor.secretEncrypted)
                  : undefined;
            if (!secretValue || !verifyTotp(secretValue, user.email, totp)) return null;
            if (challenge.purpose === "enroll") {
              const { encryptSecret } = await import("@/lib/auth/mfa");
              await db.mfaFactor.upsert({
                where: { userId_type: { userId: user.id, type: "TOTP" } },
                create: {
                  userId: user.id,
                  type: "TOTP",
                  secretEncrypted: encryptSecret(secretValue),
                  enabledAt: new Date(),
                  lastUsedAt: new Date(),
                },
                update: {
                  secretEncrypted: encryptSecret(secretValue),
                  enabledAt: new Date(),
                  lastUsedAt: new Date(),
                },
              });
            } else {
              await db.mfaFactor.update({
                where: { userId_type: { userId: user.id, type: "TOTP" } },
                data: { lastUsedAt: new Date() },
              });
            }
          } else {
            const password = typeof credentials.password === "string" ? credentials.password : "";
            if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash)))
              return null;
            if (await isStaffUser(user.id)) return null;
          }

          const staff = await isStaffUser(user.id);
          const sessionToken = randomBytes(32).toString("base64url");
          await db.session.create({
            data: {
              sessionToken,
              userId: user.id,
              expires: new Date(Date.now() + (staff ? staffSessionMs : customerSessionMs)),
            },
          });
          await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            sessionToken,
            staff,
          };
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user && "sessionToken" in user && typeof user.sessionToken === "string") {
          token.sessionToken = user.sessionToken;
        }
        return token;
      },
      async session({ session, token }) {
        const sessionToken = typeof token.sessionToken === "string" ? token.sessionToken : "";
        if (!sessionToken) return session;
        const row = await db.session.findUnique({
          where: { sessionToken },
          include: { user: { select: { id: true, email: true, name: true, status: true } } },
        });
        if (
          !row ||
          row.revokedAt ||
          row.expires.getTime() <= Date.now() ||
          row.user.status !== "ACTIVE"
        ) {
          return {
            expires: new Date(0).toISOString(),
            user: { id: "", email: "", name: "", emailVerified: null, staff: false },
          };
        }
        session.user = {
          id: row.user.id,
          email: row.user.email,
          name: row.user.name,
          emailVerified: null,
          staff: await isStaffUser(row.user.id),
        };
        return session;
      },
    },
    events: {
      async signOut(message) {
        if ("token" in message && typeof message.token?.sessionToken === "string") {
          await db.session.updateMany({
            where: { sessionToken: message.token.sessionToken, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      },
    },
  });
  return cached;
}

export function authReady(): boolean {
  return configuredSecret() !== null;
}

export async function auth() {
  return (await authInstance()?.auth()) ?? null;
}

export async function signIn(
  ...args: Parameters<NonNullable<ReturnType<typeof authInstance>>["signIn"]>
) {
  const instance = authInstance();
  if (!instance) throw new Error("Authentication is not configured.");
  return instance.signIn(...args);
}

export async function signOut(
  ...args: Parameters<NonNullable<ReturnType<typeof authInstance>>["signOut"]>
) {
  const instance = authInstance();
  if (!instance) throw new Error("Authentication is not configured.");
  return instance.signOut(...args);
}

export function authHandlers() {
  return authInstance()?.handlers ?? null;
}
