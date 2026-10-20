import { randomUUID } from "node:crypto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { subscribeForm } from "@/modules/newsletter/actions";
import { newsletterTopics, topicLabel } from "@/modules/newsletter/rules";

export function SubscribeForm({
  idPrefix,
  noticeVersion,
  returnPath,
  showTopics,
  inverted = false,
}: {
  idPrefix: string;
  noticeVersion: string;
  returnPath: string;
  showTopics: boolean;
  inverted?: boolean;
}) {
  const key = randomUUID().replace(/-/g, "").slice(0, 24);
  const inputClass = inverted
    ? "min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-base text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
    : "min-h-11 w-full rounded-xl border border-border bg-white dark:bg-[#0c1c24] dark:border-[#223d4d] px-4 text-base text-ink dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-lagoon/30";

  return (
    <form action={subscribeForm} className="grid gap-4">
      <input type="hidden" name="noticeVersion" value={noticeVersion} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {showTopics ? <input type="hidden" name="replaceTopics" value="yes" /> : null}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`${idPrefix}-website`}>Website</label>
        <input id={`${idPrefix}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-1.5">
        <Label
          htmlFor={`${idPrefix}-email`}
          className={inverted ? "text-xs font-semibold uppercase tracking-wider text-white" : "text-xs font-semibold uppercase tracking-wider text-muted dark:text-slate-300"}
        >
          Email
        </Label>
        <input id={`${idPrefix}-email`} name="email" type="email" required className={inputClass} placeholder="traveler@example.com" />
      </div>
      {showTopics ? (
        <fieldset className="grid gap-2">
          <legend className={`font-semibold ${inverted ? "text-white" : "text-ink dark:text-white"}`}>Optional topics</legend>
          {newsletterTopics.map((topic) => (
            <label key={topic} className={`flex min-h-11 items-center gap-3 text-sm cursor-pointer select-none ${inverted ? "text-slate-200" : "text-ink dark:text-slate-200"}`}>
              <input type="checkbox" name="topics" value={topic} className="size-6 min-w-6 rounded-md cursor-pointer accent-lagoon text-ocean" />
              {topicLabel(topic)}
            </label>
          ))}
        </fieldset>
      ) : null}
      <label className={`flex min-h-11 items-center gap-3 text-xs leading-relaxed cursor-pointer select-none ${inverted ? "text-slate-200" : "text-muted dark:text-slate-300"}`}>
        <input
          type="checkbox"
          name="consent"
          value="yes"
          required
          className="size-6 min-w-6 rounded-md cursor-pointer accent-lagoon text-ocean focus:ring-2 focus:ring-lagoon/40"
        />
        <span>I agree to receive the Maldives Explorer newsletter. I can unsubscribe later.</span>
      </label>
      <Button type="submit" variant={inverted ? "conversion" : "primary"} className="w-full sm:w-auto">
        Subscribe
      </Button>
    </form>
  );
}
