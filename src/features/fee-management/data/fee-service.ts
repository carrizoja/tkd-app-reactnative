/**
 * Fee use cases (OpenSpec 8.2, odd/tasks/fee-management.md). Security Rules
 * enforce tenancy, the deterministic id, the payment shape and create-only
 * writes; this service validates the period and the amount, reports a paid
 * period before writing (S2), and splits a school's students into overdue and
 * paid for a period (S4, S5).
 */
import type { Student } from "../../student-management/model/types";
import { paymentId, type PeriodString } from "../../../lib/model/ids";
import { FeeError, type Payment } from "../model/types";

/** Persistence port; the Firestore implementation lives in `./repository`. */
export interface PaymentStore {
  /** `schoolId` is required because the rules scope reads by it. */
  listBySchoolAndPeriod(schoolId: string, period: PeriodString): Promise<Payment[]>;
  /** Creates the payment under its deterministic id; never overwrites one. */
  create(payment: Payment): Promise<void>;
}

export interface FeeDeps {
  /** The school's students, ordered by surname. */
  listStudentsBySchool(schoolId: string): Promise<Student[]>;
  now(): Date;
}

/** A student who paid the period, with the payment. */
export interface PaidStudent {
  student: Student;
  payment: Payment;
}

/** A school's fees for one period. */
export interface PeriodSummary {
  /** Students with no payment for the period (S4). */
  overdue: Student[];
  /** Students with a payment for the period (S5). */
  paid: PaidStudent[];
}

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function requirePeriod(period: string): void {
  if (!PERIOD_RE.test(period)) {
    throw new FeeError("invalid-period", `Invalid period "${period}": expected YYYY-MM.`);
  }
}

function periodOf(date: Date): PeriodString {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function createFeeService(store: PaymentStore, deps: FeeDeps) {
  const currentPeriod = (): PeriodString => periodOf(deps.now());

  return {
    /** The device's current month, `YYYY-MM`. */
    currentPeriod,

    /** S4/S5: the school's overdue and paid students for a period. */
    async getPeriod(schoolId: string, period: PeriodString): Promise<PeriodSummary> {
      requirePeriod(period);
      const [students, payments] = await Promise.all([
        deps.listStudentsBySchool(schoolId),
        store.listBySchoolAndPeriod(schoolId, period),
      ]);
      const byStudent = new Map(payments.map((p) => [p.studentId, p]));
      const summary: PeriodSummary = { overdue: [], paid: [] };
      for (const student of students) {
        const payment = byStudent.get(student.id);
        if (payment) summary.paid.push({ student, payment });
        else summary.overdue.push(student);
      }
      return summary;
    },

    /**
     * S1–S3: records a cash payment for the student and period. A period the
     * student already paid is rejected and the first payment stays (S2).
     */
    async registerPayment(student: Student, period: PeriodString, amount: number): Promise<void> {
      requirePeriod(period);
      // `YYYY-MM` strings compare in calendar order.
      if (period > currentPeriod()) {
        throw new FeeError("future-period", `Period ${period} has not started yet.`);
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new FeeError("invalid-amount", `Invalid amount ${amount}: expected a number above 0.`);
      }
      const paid = await store.listBySchoolAndPeriod(student.schoolId, period);
      if (paid.some((p) => p.studentId === student.id)) {
        throw new FeeError("already-paid", `Student ${student.id} already paid ${period}.`);
      }
      await store.create({
        id: paymentId(student.id, period),
        studentId: student.id,
        schoolId: student.schoolId,
        period,
        amount,
        status: "paid",
        method: "cash",
        paidAt: deps.now().toISOString(),
      });
    },
  };
}

export type FeeService = ReturnType<typeof createFeeService>;
