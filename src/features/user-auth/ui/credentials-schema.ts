/**
 * Form-level validation for the auth screens. This is a UI concern (it carries
 * user-facing copy and mirrors what the form asks for), so it lives next to the
 * screens rather than in `model/`.
 */
import { z } from "zod";
import { AUTH_COPY } from "./copy";

/** Registration asks for a well-formed address and a minimum-length password. */
export const registerSchema = z.object({
  email: z.email({ message: AUTH_COPY.validation.email }),
  password: z.string().min(8, { message: AUTH_COPY.validation.passwordMin }),
});

/**
 * Login only checks that both fields are filled: length rules must not hint at
 * whether an existing account matches (user-auth spec, "Invalid credentials").
 */
export const loginSchema = z.object({
  email: z.email({ message: AUTH_COPY.validation.email }),
  password: z.string().min(1, { message: AUTH_COPY.validation.passwordRequired }),
});

export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
