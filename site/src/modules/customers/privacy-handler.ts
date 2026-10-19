import { db } from "@/lib/db";

export async function confirmPrivacyRequest(payload: unknown): Promise<void> {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("customerId" in payload)
  ) {
    throw new Error("The privacy request has no customer.");
  }
  const customerId = payload.customerId;
  if (typeof customerId !== "string") throw new Error("The privacy request has no customer.");
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) throw new Error("The privacy request has no customer.");
}
