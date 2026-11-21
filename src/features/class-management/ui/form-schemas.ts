/**
 * Form-level validation for the class form, carrying user-facing copy. The
 * service re-validates, so a bypassed form still cannot store bad data.
 */
import { z } from "zod";
import { isTime } from "../model/schedule";
import type { Weekday } from "../model/types";
import { CLASS_COPY } from "./copy";

const { validation } = CLASS_COPY;

export const classFormSchema = z
  .object({
    name: z.string().trim().min(1, { message: validation.name }),
    sedeId: z.string().min(1, { message: validation.sede }),
    days: z.array(z.custom<Weekday>()).min(1, { message: validation.days }),
    start: z.string().refine(isTime, { message: validation.start }),
    end: z.string().refine(isTime, { message: validation.end }),
  })
  // Zero-padded HH:MM strings compare in time order.
  .refine((form) => !isTime(form.start) || !isTime(form.end) || form.start < form.end, {
    message: validation.order,
    path: ["end"],
  });

export type ClassForm = z.infer<typeof classFormSchema>;
