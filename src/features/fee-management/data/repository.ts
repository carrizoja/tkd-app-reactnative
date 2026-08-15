import { where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { paymentId, type PeriodString } from "../../../lib/model/ids";
import { paymentConverter, type Payment } from "../model/types";

export const paymentsRepo = createFirestoreRepository<Payment>(
  COLLECTIONS.payments,
  paymentConverter,
);

/**
 * Register a cash payment for a student/period. The deterministic id guarantees
 * at most one payment per student per period.
 */
export function registerPayment(input: {
  studentId: string;
  schoolId: string;
  period: PeriodString;
  amount: number;
}): Promise<void> {
  const id = paymentId(input.studentId, input.period);
  return paymentsRepo.set(id, {
    studentId: input.studentId,
    schoolId: input.schoolId,
    period: input.period,
    amount: input.amount,
    status: "paid",
    method: "cash",
    paidAt: new Date().toISOString(),
  });
}

/** Payments recorded for a school in a period (to derive overdue students). */
export function listPaymentsByPeriod(
  schoolId: string,
  period: PeriodString,
): Promise<Payment[]> {
  return paymentsRepo.list(
    where("schoolId", "==", schoolId),
    where("period", "==", period),
  );
}
