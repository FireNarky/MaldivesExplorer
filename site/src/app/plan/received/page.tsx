import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { Acknowledgement } from "@/components/planner/acknowledgement";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Plan received",
  description: "The trip plan acknowledgement.",
  path: "/plan/received",
});

export default function PlanReceivedPage() {
  return (
    <section className="grid gap-6">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Plan my trip", href: "/plan" },
          { name: "Received" },
        ]}
      />
      <h1>Plan received</h1>
      <Acknowledgement />
    </section>
  );
}
