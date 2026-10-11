"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readAcknowledgement, type PlanAcknowledgement } from "@/lib/planner/local";
import { EmptyState } from "@/components/ui/empty-state";

export function Acknowledgement() {
  const [ack, setAck] = useState<PlanAcknowledgement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAck(readAcknowledgement());
    setReady(true);
  }, []);

  if (!ready) return <p>Loading the acknowledgement.</p>;
  if (!ack) {
    return (
      <EmptyState title="Acknowledgement">
        <p>Submit a plan to see the acknowledgement on this device.</p>
        <Link href="/plan" className="text-lagoon-ink">
          Plan a trip
        </Link>
      </EmptyState>
    );
  }
  return (
    <div className="grid max-w-[65ch] gap-4">
      <p>
        Reference <strong>{ack.reference}</strong>
      </p>
      <p>A message is queued for this plan.</p>
      {ack.duplicate ? <p>This trip overlaps an open plan for the same email.</p> : null}
      {ack.missing.length > 0 ? (
        <div className="grid gap-2">
          <h2>Still open</h2>
          <ul className="list-disc pl-5">
            {ack.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href="/resorts" className="text-lagoon-ink">
        Resorts
      </Link>
    </div>
  );
}
