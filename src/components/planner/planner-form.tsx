"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { readWishlist } from "@/lib/shortlist/local";
import {
  clearPlannerDraft,
  loadPlannerDraft,
  readLandingPath,
  writeAcknowledgement,
  writePlannerDraft,
} from "@/lib/planner/local";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyDraft,
  plannerStepLabels,
  plannerSteps,
  qualification,
  stepIssues,
  type PlannerDraft,
} from "@/modules/enquiries/rules";

type Choice = { id: string; name: string };

type PlannerFormProps = {
  noticeVersion: string;
  draftTtlDays: number;
  tripTypes: Array<{ id: string; label: string }>;
  resorts: Choice[];
  experiences: Choice[];
  savedResortIds: string[];
  savedExperienceIds: string[];
  savedOfferIds: string[];
  accountEmail: string | null;
};

export function PlannerForm(props: PlannerFormProps) {
  const router = useRouter();
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlannerDraft>(() => emptyDraft());
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const current = plannerSteps[step] ?? "dates";

  useEffect(() => {
    const loaded = loadPlannerDraft(props.draftTtlDays);
    const params = new URLSearchParams(window.location.search);
    const next = loaded.draft ?? emptyDraft(crypto.randomUUID());
    if (!loaded.draft) {
      const local = readWishlist();
      next.resortIds = unique([
        ...props.savedResortIds,
        ...local.filter((item) => item.entityType === "RESORT").map((item) => item.entityId),
      ]);
      next.experienceIds = unique([
        ...props.savedExperienceIds,
        ...local.filter((item) => item.entityType === "EXPERIENCE").map((item) => item.entityId),
      ]);
      next.offerIds = unique([
        ...props.savedOfferIds,
        ...local.filter((item) => item.entityType === "OFFER").map((item) => item.entityId),
      ]);
      next.source = params.get("utm_source") ?? "";
      next.medium = params.get("utm_medium") ?? "";
      next.campaign = params.get("utm_campaign") ?? "";
      next.referrer = document.referrer.slice(0, 300);
      next.landingPath = params.get("from") || readLandingPath();
      if (props.accountEmail) next.email = props.accountEmail;
    }
    setDraft(next);
    setExpired(loaded.expired);
    setReady(true);
  }, [props]);

  useEffect(() => {
    if (Object.keys(issues).length > 0) summaryRef.current?.focus();
  }, [issues]);

  function update(patch: Partial<PlannerDraft>) {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  }

  function save(next = draft) {
    const withKey = next.idempotencyKey ? next : { ...next, idempotencyKey: crypto.randomUUID() };
    writePlannerDraft(withKey);
    setDraft(withKey);
    setStatus("Draft saved on this device.");
  }

  function goNext() {
    const found = stepIssues(current, draft);
    setIssues(found);
    if (Object.keys(found).length > 0) return;
    save(draft);
    setStep((value) => Math.min(value + 1, plannerSteps.length - 1));
    setIssues({});
  }

  async function submit() {
    const found = stepIssues("review", draft);
    setIssues(found);
    if (Object.keys(found).length > 0 || pending) return;
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/api/v1/enquiries", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": draft.idempotencyKey,
        },
        body: JSON.stringify({ ...draft, website }),
      });
      const payload = (await response.json()) as {
        reference?: string;
        duplicate?: boolean;
        missing?: string[];
        message?: string;
        errors?: Record<string, string>;
      };
      if (!response.ok || !payload.reference) {
        setIssues(payload.errors ?? {});
        setStatus(payload.message ?? "The plan could not be submitted.");
        return;
      }
      clearPlannerDraft();
      writeAcknowledgement({
        reference: payload.reference,
        duplicate: payload.duplicate === true,
        missing: payload.missing ?? [],
      });
      router.push("/plan/received");
    } catch {
      setStatus("The plan could not be submitted.");
    } finally {
      setPending(false);
    }
  }

  if (!ready) return <p>Loading the saved draft.</p>;
  const gaps = qualification(draft);

  return (
    <form
      className="grid max-w-[65ch] gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (current === "review") void submit();
        else goNext();
      }}
    >
      <p>
        Step {step + 1} of {plannerSteps.length}
      </p>
      <ol aria-label="Progress" className="flex flex-wrap gap-2">
        {plannerSteps.map((name, index) => (
          <li key={name} aria-current={index === step ? "step" : undefined}>
            <Button
              type="button"
              variant={index === step ? "primary" : "secondary"}
              disabled={index > step}
              onClick={() => {
                if (index < step) setStep(index);
              }}
            >
              {index + 1}. {plannerStepLabels[index]}
            </Button>
          </li>
        ))}
      </ol>
      {expired ? <p role="status">This draft has expired.</p> : null}
      <p id={statusId} role="status" aria-live="polite">
        {status}
      </p>
      {Object.keys(issues).length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="grid gap-2">
          <h2>Check this step</h2>
          <ul className="list-disc pl-5">
            {Object.entries(issues).map(([field, message]) => (
              <li key={field}>
                <a href={`#${field.replace(".", "-")}`} className="text-lagoon-ink">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {current === "dates" ? <DatesStep draft={draft} issues={issues} onChange={update} /> : null}
      {current === "budget" ? <BudgetStep draft={draft} issues={issues} onChange={update} /> : null}
      {current === "party" ? (
        <PartyStep draft={draft} issues={issues} tripTypes={props.tripTypes} onChange={update} />
      ) : null}
      {current === "preferences" ? (
        <PreferencesStep
          draft={draft}
          issues={issues}
          resorts={props.resorts}
          experiences={props.experiences}
          onChange={update}
        />
      ) : null}
      {current === "review" ? (
        <ReviewStep
          draft={draft}
          issues={issues}
          missing={gaps.missing}
          noticeVersion={props.noticeVersion}
          accountEmail={props.accountEmail}
          tripTypes={props.tripTypes}
          resorts={props.resorts}
          experiences={props.experiences}
          onChange={update}
        />
      ) : null}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px overflow-hidden">
        <label>
          Company
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((value) => value - 1)}>
            Back
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={() => save()}>
          Save draft
        </Button>
        {current === "review" ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Sending" : "Send plan"}
          </Button>
        ) : (
          <Button type="submit">Next</Button>
        )}
      </div>
    </form>
  );
}

function unique(values: string[]): string[] {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function fieldId(field: string): string {
  return field.replace(".", "-");
}

function DatesStep({
  draft,
  issues,
  onChange,
}: {
  draft: PlannerDraft;
  issues: Record<string, string>;
  onChange: (patch: Partial<PlannerDraft>) => void;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="text-xl font-semibold">Dates</legend>
      <Field id="travelStart" label="Arrival" error={issues.travelStart}>
        <Input
          id="travelStart"
          type="date"
          value={draft.travelStart}
          invalid={Boolean(issues.travelStart)}
          aria-describedby={issues.travelStart ? "travelStart-error" : undefined}
          onChange={(event) => onChange({ travelStart: event.target.value })}
        />
      </Field>
      <Field id="travelEnd" label="Departure" error={issues.travelEnd}>
        <Input
          id="travelEnd"
          type="date"
          value={draft.travelEnd}
          invalid={Boolean(issues.travelEnd)}
          aria-describedby={issues.travelEnd ? "travelEnd-error" : undefined}
          onChange={(event) => onChange({ travelEnd: event.target.value })}
        />
      </Field>
      <Field id="flexibility" label="Flexibility" optional error={issues.flexibility}>
        <Input
          id="flexibility"
          value={draft.flexibility}
          maxLength={200}
          invalid={Boolean(issues.flexibility)}
          onChange={(event) => onChange({ flexibility: event.target.value })}
        />
      </Field>
    </fieldset>
  );
}

function BudgetStep({
  draft,
  issues,
  onChange,
}: {
  draft: PlannerDraft;
  issues: Record<string, string>;
  onChange: (patch: Partial<PlannerDraft>) => void;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="text-xl font-semibold">Budget</legend>
      <p>Amounts are USD. Leave both blank if the budget is still open.</p>
      <Field id="budgetMin" label="Lowest budget" optional error={issues.budgetMin}>
        <Input
          id="budgetMin"
          inputMode="decimal"
          value={draft.budgetMin}
          invalid={Boolean(issues.budgetMin)}
          onChange={(event) => onChange({ budgetMin: event.target.value })}
        />
      </Field>
      <Field id="budgetMax" label="Highest budget" optional error={issues.budgetMax}>
        <Input
          id="budgetMax"
          inputMode="decimal"
          value={draft.budgetMax}
          invalid={Boolean(issues.budgetMax)}
          onChange={(event) => onChange({ budgetMax: event.target.value })}
        />
      </Field>
      <Field id="budgetCurrency" label="Currency" error={issues.budgetCurrency}>
        <p id="budgetCurrency">USD</p>
      </Field>
    </fieldset>
  );
}

function PartyStep({
  draft,
  issues,
  tripTypes,
  onChange,
}: {
  draft: PlannerDraft;
  issues: Record<string, string>;
  tripTypes: Array<{ id: string; label: string }>;
  onChange: (patch: Partial<PlannerDraft>) => void;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="text-xl font-semibold">Travel type</legend>
      <Field id="adultCount" label="Adults" error={issues.adultCount}>
        <Input
          id="adultCount"
          inputMode="numeric"
          value={draft.adultCount}
          invalid={Boolean(issues.adultCount)}
          onChange={(event) => onChange({ adultCount: event.target.value })}
        />
      </Field>
      <fieldset className="grid gap-3">
        <legend className="font-semibold">
          Child ages <span className="font-normal">Optional</span>
        </legend>
        <p>Ages from 0 through 17. An age of 0 or 1 is an infant.</p>
        {draft.childAges.map((age, index) => (
          <Field
            key={`child-${index}`}
            id={fieldId(`childAges.${index}`)}
            label={`Child ${index + 1} age`}
            error={issues[`childAges.${index}`]}
          >
            <Input
              id={fieldId(`childAges.${index}`)}
              inputMode="numeric"
              value={age}
              invalid={Boolean(issues[`childAges.${index}`])}
              onChange={(event) => {
                const childAges = [...draft.childAges];
                childAges[index] = event.target.value;
                onChange({ childAges });
              }}
            />
          </Field>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange({ childAges: [...draft.childAges, ""] })}
        >
          Add a child age
        </Button>
      </fieldset>
      <Field id="tripTypeId" label="Trip type" optional error={issues.tripTypeId}>
        <select
          id="tripTypeId"
          className="min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base"
          value={draft.tripTypeId}
          onChange={(event) => onChange({ tripTypeId: event.target.value })}
        >
          <option value="">Choose a trip type</option>
          {tripTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </Field>
    </fieldset>
  );
}

function PreferencesStep({
  draft,
  issues,
  resorts,
  experiences,
  onChange,
}: {
  draft: PlannerDraft;
  issues: Record<string, string>;
  resorts: Choice[];
  experiences: Choice[];
  onChange: (patch: Partial<PlannerDraft>) => void;
}) {
  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="font-semibold">
          Preferred resorts <span className="font-normal">Optional</span>
        </legend>
        {resorts.length === 0 ? <p>No published resort is available to attach.</p> : null}
        {resorts.map((resort) => (
          <label key={resort.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5"
              checked={draft.resortIds.includes(resort.id)}
              onChange={(event) =>
                onChange({
                  resortIds: event.target.checked
                    ? [...draft.resortIds, resort.id]
                    : draft.resortIds.filter((id) => id !== resort.id),
                })
              }
            />
            {resort.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="font-semibold">
          Interests <span className="font-normal">Optional</span>
        </legend>
        {experiences.length === 0 ? <p>No published experience is available to attach.</p> : null}
        {experiences.map((experience) => (
          <label key={experience.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5"
              checked={draft.experienceIds.includes(experience.id)}
              onChange={(event) =>
                onChange({
                  experienceIds: event.target.checked
                    ? [...draft.experienceIds, experience.id]
                    : draft.experienceIds.filter((id) => id !== experience.id),
                })
              }
            />
            {experience.name}
          </label>
        ))}
      </fieldset>
      <Field
        id="accessibilityNeeds"
        label="Accessibility needs"
        optional
        error={issues.accessibilityNeeds}
      >
        <Textarea
          id="accessibilityNeeds"
          value={draft.accessibilityNeeds}
          maxLength={500}
          onChange={(event) => onChange({ accessibilityNeeds: event.target.value })}
        />
      </Field>
      <p>Rooms, transfers, or mobility. Leave this blank if you prefer.</p>
      <Field id="requirements" label="Note" optional error={issues.requirements}>
        <Textarea
          id="requirements"
          value={draft.requirements}
          maxLength={2000}
          onChange={(event) => onChange({ requirements: event.target.value })}
        />
      </Field>
    </div>
  );
}

function ReviewStep({
  draft,
  issues,
  missing,
  noticeVersion,
  accountEmail,
  tripTypes,
  resorts,
  experiences,
  onChange,
}: {
  draft: PlannerDraft;
  issues: Record<string, string>;
  missing: string[];
  noticeVersion: string;
  accountEmail: string | null;
  tripTypes: Array<{ id: string; label: string }>;
  resorts: Choice[];
  experiences: Choice[];
  onChange: (patch: Partial<PlannerDraft>) => void;
}) {
  const trip = tripTypes.find((type) => type.id === draft.tripTypeId)?.label ?? "Not chosen";
  const resortNames = names(draft.resortIds, resorts);
  const experienceNames = names(draft.experienceIds, experiences);
  return (
    <div className="grid gap-4">
      <h2>Review</h2>
      <dl className="grid gap-2">
        <div>
          <dt className="font-semibold">Dates</dt>
          <dd>
            {draft.travelStart && draft.travelEnd
              ? `${draft.travelStart} to ${draft.travelEnd}`
              : "Not added"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Budget</dt>
          <dd>
            {draft.budgetMin && draft.budgetMax
              ? `${draft.budgetMin} to ${draft.budgetMax} USD`
              : "Not added"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Adults</dt>
          <dd>{draft.adultCount}</dd>
        </div>
        <div>
          <dt className="font-semibold">Trip type</dt>
          <dd>{trip}</dd>
        </div>
        <div>
          <dt className="font-semibold">Resorts</dt>
          <dd>{resortNames || "Not added"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Interests</dt>
          <dd>{experienceNames || "Not added"}</dd>
        </div>
      </dl>
      <h2>Still open</h2>
      {missing.length === 0 ? (
        <p>Dates, budget, trip type, and a place or interest are included.</p>
      ) : (
        <ul className="list-disc pl-5">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <Field id="name" label="Name" error={issues.name}>
        <Input
          id="name"
          autoComplete="name"
          value={draft.name}
          invalid={Boolean(issues.name)}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      <Field id="email" label="Email" error={issues.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={draft.email}
          readOnly={Boolean(accountEmail)}
          invalid={Boolean(issues.email)}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </Field>
      <Field id="phone" label="Phone" optional error={issues.phone}>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={draft.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </Field>
      <Field id="countryCode" label="Country code" optional error={issues.countryCode}>
        <Input
          id="countryCode"
          maxLength={2}
          autoComplete="country"
          value={draft.countryCode}
          onChange={(event) => onChange({ countryCode: event.target.value })}
        />
      </Field>
      <p>Two letters, such as MV.</p>
      <label className="flex min-h-11 items-start gap-3">
        <input
          id="consent"
          type="checkbox"
          className="mt-1 size-5"
          checked={draft.consent}
          onChange={(event) => onChange({ consent: event.target.checked })}
        />
        <span>
          I agree that Maldives Explorer may contact me about this trip plan. Notice version{" "}
          {noticeVersion}.
        </span>
      </label>
      {issues.consent ? <FieldError id="consent-error">{issues.consent}</FieldError> : null}
    </div>
  );
}

function names(ids: string[], choices: Choice[]): string {
  return ids
    .map((id) => choices.find((choice) => choice.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

function Field({
  id,
  label,
  optional = false,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label} {optional ? <span className="font-normal">Optional</span> : null}
      </Label>
      {children}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}
