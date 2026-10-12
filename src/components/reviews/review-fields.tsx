import { Label } from "@/components/ui/label";

const fieldClass = "min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base text-ink";

export function ReviewFields({
  resorts,
  values,
}: {
  resorts: Array<{ id: string; name: string; status: string }>;
  values?: {
    resortId: string;
    sourceType: string;
    sourceReference: string;
    displayName: string;
    rating: string;
    ratingBasis: string;
    body: string;
    consentGranted: boolean;
  };
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="resortId">Resort</Label>
        <select
          id="resortId"
          name="resortId"
          defaultValue={values?.resortId ?? ""}
          className={fieldClass}
        >
          <option value="">No resort</option>
          {resorts.map((resort) => (
            <option key={resort.id} value={resort.id}>
              {resort.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sourceType">Source</Label>
        <select
          id="sourceType"
          name="sourceType"
          defaultValue={values?.sourceType ?? "EDITORIAL"}
          className={fieldClass}
        >
          <option value="EDITORIAL">Editorial</option>
          <option value="FIRST_PARTY">First-party</option>
          <option value="IMPORTED">Imported</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sourceReference">Source reference</Label>
        <input
          id="sourceReference"
          name="sourceReference"
          defaultValue={values?.sourceReference ?? ""}
          className={fieldClass}
        />
        <p className="text-sm text-muted">
          Use a won enquiry reference, a written permission note, or the imported source.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <input
          id="displayName"
          name="displayName"
          required
          defaultValue={values?.displayName ?? ""}
          className={fieldClass}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rating">Rating</Label>
        <input
          id="rating"
          name="rating"
          inputMode="decimal"
          defaultValue={values?.rating ?? ""}
          className={fieldClass}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ratingBasis">Rating basis</Label>
        <input
          id="ratingBasis"
          name="ratingBasis"
          defaultValue={values?.ratingBasis ?? ""}
          className={fieldClass}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="body">Review</Label>
        <textarea
          id="body"
          name="body"
          required
          defaultValue={values?.body ?? ""}
          className="min-h-32 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink"
        />
      </div>
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="consent" value="yes" defaultChecked={values?.consentGranted ?? false} required />
        <span>Permission to publish this text is recorded.</span>
      </label>
    </>
  );
}
