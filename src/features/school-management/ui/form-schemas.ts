/**
 * Form-level validation for the school and sede forms. Like the auth forms,
 * this carries user-facing copy, so it lives next to the screens. The service
 * re-validates (`normalize*Input`), so a bypassed form still cannot store blanks.
 */
import { z } from "zod";
import { SCHOOL_COPY } from "./copy";

const required = (message: string) => z.string().trim().min(1, { message });

export const schoolFormSchema = z.object({
  name: required(SCHOOL_COPY.validation.schoolName),
});

export const sedeFormSchema = z.object({
  name: required(SCHOOL_COPY.validation.sedeName),
  address: required(SCHOOL_COPY.validation.sedeAddress),
});

export type SchoolForm = z.infer<typeof schoolFormSchema>;
export type SedeForm = z.infer<typeof sedeFormSchema>;
