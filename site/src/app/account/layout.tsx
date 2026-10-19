import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account/account-nav";
import { ErrorState } from "@/components/ui/error-state";
import { auth } from "@/auth";
import { isNextRedirect } from "@/lib/http/navigation";
import { claimToken, safeAccountPath } from "@/modules/customers/rules";
import { openAccount, PortalError, redeemClaim } from "@/modules/customers/service";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  if (!userId) {
    const headerStore = await headers();
    const path = headerStore.get("x-pathname") ?? "/account";
    const search = headerStore.get("x-search") ?? "";
    const next = safeAccountPath(`${path}${search}`) ?? "/account";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const headerStore = await headers();
  const claim = claimToken(
    new URLSearchParams(headerStore.get("x-search") ?? "").get("claim") ?? "",
  );
  if (claim) {
    const result = await redeemClaim(userId, claim);
    redirect(result.linked ? "/account?notice=linked" : "/account?notice=claim");
  }
  try {
    await openAccount(userId);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message =
      error instanceof PortalError ? error.message : "The account could not be opened.";
    return (
      <ErrorState title="Account">
        <p>{message}</p>
      </ErrorState>
    );
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <AccountNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
