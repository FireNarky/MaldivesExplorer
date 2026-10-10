import { hash, verify } from "@node-rs/argon2";

const argonOptions = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const minimumPasswordLength = 12;

export function passwordError(password: string): string | undefined {
  if (password.length < minimumPasswordLength) {
    return `Use at least ${minimumPasswordLength} characters.`;
  }
  return undefined;
}

export async function hashPassword(password: string): Promise<string> {
  const problem = passwordError(password);
  if (problem) throw new Error(problem);
  return hash(password, argonOptions);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return verify(passwordHash, password, argonOptions);
}
