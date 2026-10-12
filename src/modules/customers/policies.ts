export const moduleStatus = "implemented" as const;

export function canReadOwnCustomer(actorUserId: string, customerUserId: string | null): boolean {
  return actorUserId.length > 0 && actorUserId === customerUserId;
}
