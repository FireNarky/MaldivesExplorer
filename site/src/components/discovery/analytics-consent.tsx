import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { setAnalyticsConsent } from "@/modules/search/actions";

export async function AnalyticsConsent() {
  const store = await cookies();
  if (store.get("me_analytics")?.value) return null;
  return (
    <section aria-label="Search analytics" className="border-t border-border-subtle bg-white">
      <form
        action={setAnalyticsConsent}
        className="mx-auto grid w-full max-w-[90rem] gap-3 px-4 py-4 lg:px-8"
      >
        <p>Search analytics stays off until you allow it.</p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="choice" value="granted">
            Allow search analytics
          </Button>
          <Button type="submit" name="choice" value="denied" variant="secondary">
            Decline
          </Button>
        </div>
      </form>
    </section>
  );
}
