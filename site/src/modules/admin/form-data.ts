import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Check the form.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That slug or code is already used.";
  }
  return error instanceof Error ? error.message : "The record could not be saved.";
}

export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}
