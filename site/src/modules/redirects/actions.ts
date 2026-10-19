"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { permissionsForUser } from "@/modules/identity/service";
import { deactivateRedirect, saveRedirect } from "@/modules/redirects/service";

async function requireContentWrite(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("content.write")) redirect("/admin");
}

function fail(message: string): never {
  redirect(`/admin/redirects?error=${encodeURIComponent(message)}`);
}

export async function saveRedirectAction(formData: FormData): Promise<void> {
  await requireContentWrite();
  const status = Number(formData.get("statusCode"));
  if (status !== 301 && status !== 302 && status !== 307 && status !== 308) {
    fail("Choose a redirect status.");
  }
  try {
    await saveRedirect({
      fromPath: String(formData.get("fromPath") ?? ""),
      toPath: String(formData.get("toPath") ?? ""),
      statusCode: status,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : "The redirect could not be saved.");
  }
  redirect("/admin/redirects");
}

export async function deactivateRedirectAction(formData: FormData): Promise<void> {
  await requireContentWrite();
  const id = String(formData.get("id") ?? "");
  if (!id) fail("Choose a redirect.");
  try {
    await deactivateRedirect(id);
  } catch (error) {
    fail(error instanceof Error ? error.message : "The redirect could not be updated.");
  }
  redirect("/admin/redirects");
}
