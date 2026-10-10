import { z } from "zod";
import { roleCodes } from "@/lib/auth/permissions";
import { minimumPasswordLength } from "@/lib/auth/password";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(minimumPasswordLength).max(200),
});

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(roleCodes),
});
