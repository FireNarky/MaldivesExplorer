import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const blockedPrefixes = ["/admin", "/api", "/login", "/media", "/_next"];

export type RedirectWrite = {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302 | 307 | 308;
};

export function normalizeRedirectPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "";
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? "";
  return withoutQuery.length > 1 && withoutQuery.endsWith("/")
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

export function redirectPathError(fromPath: string, toPath: string): string | null {
  if (!fromPath.startsWith("/") || !toPath.startsWith("/")) {
    return "A redirect path starts with /.";
  }
  if (fromPath === toPath) return "The two paths are the same.";
  if (fromPath.includes("//") || toPath.includes("//")) return "A redirect path is a site path.";
  if (blockedPrefixes.some((prefix) => fromPath === prefix || fromPath.startsWith(`${prefix}/`))) {
    return "That path cannot be redirected.";
  }
  return null;
}

export async function recordSlugRedirect(
  tx: Prisma.TransactionClient,
  fromPath: string,
  toPath: string,
): Promise<void> {
  const from = normalizeRedirectPath(fromPath);
  const to = normalizeRedirectPath(toPath);
  if (redirectPathError(from, to)) return;
  await tx.redirect.deleteMany({ where: { fromPath: to, toPath: from } });
  await tx.redirect.upsert({
    where: { fromPath: from },
    update: { toPath: to, statusCode: 301, active: true },
    create: { fromPath: from, toPath: to, statusCode: 301, active: true },
  });
}

export async function findActiveRedirect(pathname: string) {
  const fromPath = normalizeRedirectPath(pathname);
  if (!fromPath.startsWith("/")) return null;
  if (blockedPrefixes.some((prefix) => fromPath === prefix || fromPath.startsWith(`${prefix}/`))) {
    return null;
  }
  return db.redirect.findFirst({
    where: { fromPath, active: true },
    select: { toPath: true, statusCode: true },
  });
}

export async function listRedirects() {
  return db.redirect.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, fromPath: true, toPath: true, statusCode: true, active: true },
  });
}

export async function saveRedirect(input: RedirectWrite): Promise<void> {
  const fromPath = normalizeRedirectPath(input.fromPath);
  const toPath = normalizeRedirectPath(input.toPath);
  const error = redirectPathError(fromPath, toPath);
  if (error) throw new Error(error);
  await db.redirect.upsert({
    where: { fromPath },
    update: { toPath, statusCode: input.statusCode, active: true },
    create: { fromPath, toPath, statusCode: input.statusCode, active: true },
  });
}

export async function deactivateRedirect(id: string): Promise<void> {
  await db.redirect.update({ where: { id }, data: { active: false } });
}
