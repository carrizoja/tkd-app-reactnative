import { makeConverter, type Entity } from "../../../lib/model/converter";
import type { PeriodString } from "../../../lib/model/ids";

export type PaymentStatus = "paid" | "pending";

/** Cash-only in the MVP; kept as a union for later payment methods. */
export type PaymentMethod = "cash";

/**
 * One cuota per student/period. The document id is deterministic
 * (`${studentId}_${period}`, see `paymentId`) so a period cannot be paid twice.
 */
export interface Payment extends Entity {
  studentId: string;
  /** Denormalized for rules/queries. */
  schoolId: string;
  /** Billing period `YYYY-MM`. */
  period: PeriodString;
  amount: number;
  status: PaymentStatus;
  /** ISO timestamp of when the payment was recorded (the rules require it). */
  paidAt: string;
  method: PaymentMethod;
}

export const paymentConverter = makeConverter<Payment>();

export type FeeErrorCode = "invalid-period" | "future-period" | "invalid-amount" | "already-paid";

/** A rejected fee operation; `code` lets the UI show the right message. */
export class FeeError extends Error {
  readonly code: FeeErrorCode;

  constructor(code: FeeErrorCode, message: string) {
    super(message);
    this.name = "FeeError";
    this.code = code;
  }
}
