import { readAppEnv } from "@/lib/env/schema";
import { applicationName, applicationVersion } from "@/lib/version";

export type HealthPayload = {
  status: "ok";
  application: string;
  environment: string;
  version: string;
};

export function healthPayload(
  source: Record<string, string | undefined> = process.env,
): HealthPayload {
  const env = readAppEnv(source);
  return {
    status: "ok",
    application: applicationName,
    environment: env.APP_ENV,
    version: applicationVersion,
  };
}
