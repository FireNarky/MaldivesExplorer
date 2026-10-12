import { randomUUID } from "node:crypto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { subscribeForm } from "@/modules/newsletter/actions";
import { newsletterTopics, topicLabel } from "@/modules/newsletter/rules";

const fieldClass = "min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base text-ink";

export function SubscribeForm({
  idPrefix,
  noticeVersion,
  returnPath,
  showTopics,
}: {
  idPrefix: string;
  noticeVersion: string;
  returnPath: string;
  showTopics: boolean;
}) {
  const key = randomUUID().replace(/-/g, "").slice(0, 24);
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
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <input id={`${idPrefix}-email`} name="email" type="email" required className={fieldClass} />
      </div>
      {showTopics ? (
        <fieldset className="grid gap-2">
          <legend className="font-semibold">Optional topics</legend>
          {newsletterTopics.map((topic) => (
            <label key={topic} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="topics" value={topic} />
              {topicLabel(topic)}
            </label>
          ))}
        </fieldset>
      ) : null}
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="consent" value="yes" required />
        <span>I agree to receive the Maldives Explorer newsletter. I can unsubscribe later.</span>
      </label>
      <Button type="submit">Subscribe</Button>
    </form>
  );
}
