import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addItemForm,
  addSegmentForm,
  approveQuoteForm,
  newVersionForm,
  removeItemForm,
  removeSegmentForm,
  saveDraftForm,
  sendQuoteForm,
  submitQuoteForm,
  withdrawQuoteForm,
} from "@/modules/quotes/actions";
import type { QuoteDetail } from "@/modules/quotes/service";

const area =
  "min-h-24 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink";
const selectClass =
  "min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base text-ink";

const itemTypes = [
  ["ACCOMMODATION", "Accommodation"],
  ["TRANSFER", "Transfer"],
  ["EXPERIENCE", "Experience"],
  ["TAX", "Tax"],
  ["FEE", "Fee"],
  ["DISCOUNT", "Discount"],
  ["OTHER", "Other"],
] as const;

export function QuoteBuilder({ quote }: { quote: QuoteDetail }) {
  const version = quote.version;
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="text-sm text-muted">
          Version {version.versionNo} · {version.statusLabel}
        </p>
        <h1>{quote.reference}</h1>
        <p>
          <Link
            href={`/admin/enquiries/${quote.enquiryReference}`}
            className="font-semibold text-lagoon-ink"
          >
            {quote.enquiryReference}
          </Link>
        </p>
      </div>
      <section className="grid gap-3">
        <h2>Versions</h2>
        <ul className="grid gap-2">
          {quote.versions.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/quotes/${quote.id}?version=${item.id}`}
                className="font-semibold text-lagoon-ink"
              >
                Version {item.versionNo} · {item.statusLabel}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {quote.needsSecondApprover && version.status === "IN_REVIEW" ? (
        <p>This total needs two approvers.</p>
      ) : null}
      {quote.approvalWaiting ? <p>A second approver is required.</p> : null}
      {version.preparedByYou && version.status === "IN_REVIEW" ? (
        <p>The person who prepared this version cannot approve it.</p>
      ) : null}
      <section className="grid max-w-[65ch] gap-3">
        <h2>Welcome</h2>
        {quote.canEdit ? (
          <form action={saveDraftForm} className="grid gap-4">
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className="grid gap-2">
              <Label htmlFor="welcome">Welcome</Label>
              <textarea
                id="welcome"
                name="welcome"
                className={area}
                defaultValue={version.welcome}
                maxLength={2000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="overview">Overview</Label>
              <textarea
                id="overview"
                name="overview"
                className={area}
                defaultValue={version.overview}
                maxLength={4000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inclusions">Inclusions</Label>
              <textarea
                id="inclusions"
                name="inclusions"
                className={area}
                defaultValue={version.inclusions}
                maxLength={2000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exclusions">Exclusions</Label>
              <textarea
                id="exclusions"
                name="exclusions"
                className={area}
                defaultValue={version.exclusions}
                maxLength={2000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terms">Terms</Label>
              <textarea
                id="terms"
                name="terms"
                className={area}
                defaultValue={version.terms}
                maxLength={8000}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiresOn">Valid through</Label>
              <Input
                id="expiresOn"
                name="expiresOn"
                type="date"
                defaultValue={version.expiresOn}
                required
              />
            </div>
            <Button type="submit">Save draft</Button>
          </form>
        ) : (
          <div className="grid gap-3">
            <p>{version.welcome || "Welcome is not written yet."}</p>
            {version.overview ? <p>{version.overview}</p> : null}
            {version.inclusions ? (
              <p>
                <span className="font-semibold">Inclusions. </span>
                {version.inclusions}
              </p>
            ) : null}
            {version.exclusions ? (
              <p>
                <span className="font-semibold">Exclusions. </span>
                {version.exclusions}
              </p>
            ) : null}
            <p>{version.terms || "Terms are not written yet."}</p>
            <p>Valid through {version.expiresOn}.</p>
          </div>
        )}
      </section>
      <section className="grid gap-3">
        <h2>Accommodation</h2>
        {version.segments.length === 0 ? <p>No stay is listed.</p> : null}
        <ul className="grid gap-3">
          {version.segments.map((segment) => (
            <li key={segment.id} className="grid gap-1">
              <p>
                {segment.startDate} to {segment.endDate}
              </p>
              <p>{segment.resort}</p>
              {segment.transfer ? <p>{segment.transfer}</p> : null}
              {segment.notes ? <p>{segment.notes}</p> : null}
              {quote.canEdit ? (
                <form action={removeSegmentForm}>
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="segmentId" value={segment.id} />
                  <Button type="submit" variant="secondary">
                    Remove stay
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {quote.canEdit ? (
          <form action={addSegmentForm} className="grid max-w-[65ch] gap-4">
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
            {quote.resorts.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="resortId">Resort</Label>
                <select id="resortId" name="resortId" className={selectClass} defaultValue="">
                  <option value="">Not added</option>
                  {quote.resorts.map((resort) => (
                    <option key={resort.id} value={resort.id}>
                      {resort.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {quote.meals.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="mealPlanId">Meal plan</Label>
                <select id="mealPlanId" name="mealPlanId" className={selectClass} defaultValue="">
                  <option value="">Not added</option>
                  {quote.meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="transfer">Transfer</Label>
              <Input id="transfer" name="transfer" maxLength={500} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" name="notes" className={area} maxLength={2000} />
            </div>
            <Button type="submit" variant="secondary">
              Add stay
            </Button>
          </form>
        ) : null}
      </section>
      <section className="grid gap-3">
        <h2>Pricing</h2>
        <p className="text-sm text-muted">{version.currency}</p>
        {version.lines.length === 0 ? <p>No line is listed.</p> : null}
        <ul className="grid gap-3">
          {version.lines.map((line) => (
            <li key={line.id} className="grid gap-1">
              <p>
                {line.description} · {line.quantity} × {line.unitAmount}
              </p>
              <p>{line.lineTotal}</p>
              {quote.canEdit ? (
                <form action={removeItemForm}>
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="itemId" value={line.id} />
                  <Button type="submit" variant="secondary">
                    Remove line
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        <dl className="grid max-w-[65ch] gap-2">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd>{version.subtotal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Tax</dt>
            <dd>{version.taxTotal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Fees</dt>
            <dd>{version.feeTotal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Discounts</dt>
            <dd>{version.discountTotal}</dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <dt>Total</dt>
            <dd>{version.grandTotal}</dd>
          </div>
        </dl>
        {quote.canEdit ? (
          <form action={addItemForm} className="grid max-w-[65ch] gap-4">
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className="grid gap-2">
              <Label htmlFor="itemType">Type</Label>
              <select
                id="itemType"
                name="itemType"
                className={selectClass}
                defaultValue="ACCOMMODATION"
              >
                {itemTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" maxLength={500} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" inputMode="numeric" defaultValue="1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitAmount">Amount</Label>
              <Input id="unitAmount" name="unitAmount" inputMode="decimal" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taxAmount">Tax on this line</Label>
              <Input id="taxAmount" name="taxAmount" inputMode="decimal" defaultValue="0.00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discountAmount">Discount on this line</Label>
              <Input
                id="discountAmount"
                name="discountAmount"
                inputMode="decimal"
                defaultValue="0.00"
              />
            </div>
            <Button type="submit" variant="secondary">
              Add line
            </Button>
          </form>
        ) : null}
      </section>
      {version.responses.length > 0 ? (
        <section className="grid gap-2">
          <h2>Responses</h2>
          <ul className="grid gap-2">
            {version.responses.map((response) => (
              <li key={`${response.label}-${response.createdAt}`}>
                <p className="font-semibold">{response.label}</p>
                {response.message ? <p>{response.message}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="grid gap-3">
        <h2>History</h2>
        {quote.history.length === 0 ? <p>No history is recorded yet.</p> : null}
        <ul className="grid gap-2">
          {quote.history.map((entry) => (
            <li key={entry.id}>
              {entry.label} · {entry.at.slice(0, 16).replace("T", " ")}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-3">
        {quote.canEdit ? (
          <form action={submitQuoteForm}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit">Submit for approval</Button>
          </form>
        ) : null}
        {quote.canWithdraw ? (
          <form action={withdrawQuoteForm}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" variant="secondary">
              Return to draft
            </Button>
          </form>
        ) : null}
        {quote.canApprove ? (
          <form action={approveQuoteForm}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <Button type="submit">Approve</Button>
          </form>
        ) : null}
        {quote.canSend ? (
          <form action={sendQuoteForm}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <Button type="submit">Send quote</Button>
          </form>
        ) : null}
        {quote.canStartVersion ? (
          <form action={newVersionForm}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" variant="secondary">
              New version
            </Button>
          </form>
        ) : null}
        {version.pdfAvailable ? (
          <Link
            href={`/api/v1/admin/quote-versions/${version.id}/pdf`}
            className="inline-flex min-h-11 items-center font-semibold text-lagoon-ink"
          >
            Download PDF
          </Link>
        ) : null}
      </div>
    </div>
  );
}
