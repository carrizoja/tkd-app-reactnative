/**
 * Form-level validation for the student and group forms, carrying user-facing
 * copy. The service re-validates, so a bypassed form still cannot store bad data.
 */
import { z } from "zod";
import { isCalendarDate } from "../data/student-service";
import { isItfBelt } from "../model/belts";
import { STUDENT_COPY } from "./copy";

const required = (message: string) => z.string().trim().min(1, { message });

export const studentFormSchema = z.object({
  firstName: required(STUDENT_COPY.validation.firstName),
  lastName: required(STUDENT_COPY.validation.lastName),
  // Empty, or a grade from the ITF list (older free text must be re-picked).
  beltGrade: z.string().refine((value) => value.trim() === "" || isItfBelt(value.trim()), {
    message: STUDENT_COPY.validation.beltGrade,
  }),
  birthDate: z
    .string()
    .refine((value) => value.trim() === "" || isCalendarDate(value.trim()), {
      message: STUDENT_COPY.validation.birthDate,
    }),
});

export const groupFormSchema = z.object({
  name: required(STUDENT_COPY.validation.groupName),
});

export type StudentForm = z.infer<typeof studentFormSchema>;
export type GroupForm = z.infer<typeof groupFormSchema>;
