import type { Student } from "../../student-management/model/types";
import type { Payment } from "../model/types";
import { createFeeService, type PaymentStore } from "./fee-service";

// `./repository` pulls in the Firebase SDK, which the jest-expo preset cannot
// transform. Every test injects an in-memory store instead.
jest.mock("./repository", () => ({}));

const NOW = "2026-11-23T15:00:00.000Z";
const PERIOD = "2026-11";

const student = (id: string, lastName: string, schoolId = "a1"): Student => ({
  id,
  schoolId,
  associationId: "assocA",
  firstName: id,
  lastName,
  lastNameLower: lastName.toLowerCase(),
});

const ana = student("stu-ana", "Alvarez");
const beto = student("stu-beto", "Benitez");
const caro = student("stu-caro", "Castro");

const payment = (studentId: string, period = PERIOD, amount = 15000, schoolId = "a1"): Payment => ({
  id: `${studentId}_${period}`,
  studentId,
  schoolId,
  period,
  amount,
  status: "paid",
  method: "cash",
  paidAt: "2026-11-02T12:00:00.000Z",
});

function setup(seed: { payments?: Payment[]; students?: Student[] } = {}) {
  const payments = new Map((seed.payments ?? []).map((p) => [p.id, p]));
  const created: Payment[] = [];
  const store: PaymentStore = {
    listBySchoolAndPeriod: async (schoolId, period) =>
      [...payments.values()].filter((p) => p.schoolId === schoolId && p.period === period),
    create: async (p) => {
      created.push(p);
      payments.set(p.id, p);
    },
  };
  const students = seed.students ?? [ana, beto, caro];
  const service = createFeeService(store, {
    listStudentsBySchool: async (schoolId) => students.filter((s) => s.schoolId === schoolId),
    now: () => new Date(NOW),
  });
  return { service, payments, created };
}

describe("registerPayment", () => {
  it("S1/S3: stores a cash payment marked paid for the student and period", async () => {
    const { service, created } = setup();

    await service.registerPayment(ana, PERIOD, 15000);

    expect(created).toEqual([
      {
        id: "stu-ana_2026-11",
        studentId: "stu-ana",
        schoolId: "a1",
        period: PERIOD,
        amount: 15000,
        status: "paid",
        method: "cash",
        paidAt: NOW,
      },
    ]);
  });

  it("S1: accepts a past period", async () => {
    const { service, created } = setup();

    await service.registerPayment(ana, "2026-10", 12500.5);

    expect(created.map((p) => [p.id, p.amount])).toEqual([["stu-ana_2026-10", 12500.5]]);
  });

  it("S2: rejects a period the student already paid, keeping the first payment", async () => {
    const first = payment("stu-ana");
    const { service, payments, created } = setup({ payments: [first] });

    await expect(service.registerPayment(ana, PERIOD, 20000)).rejects.toMatchObject({ code: "already-paid" });
    expect(created).toHaveLength(0);
    expect(payments.get(first.id)).toEqual(first);
  });

  it("A1: rejects an amount that is not a number above 0", async () => {
    const { service, created } = setup();

    for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(service.registerPayment(ana, PERIOD, amount)).rejects.toMatchObject({ code: "invalid-amount" });
    }
    expect(created).toHaveLength(0);
  });

  it("A2: rejects a malformed period and a month after the current one", async () => {
    const { service, created } = setup();

    for (const period of ["2026-1", "202611", "2026-13", "2026-00"]) {
      await expect(service.registerPayment(ana, period, 15000)).rejects.toMatchObject({ code: "invalid-period" });
    }
    await expect(service.registerPayment(ana, "2026-12", 15000)).rejects.toMatchObject({ code: "future-period" });
    expect(created).toHaveLength(0);
  });
});

describe("getPeriod", () => {
  it("S4: lists the students with no payment for the period as overdue", async () => {
    const { service } = setup({ payments: [payment("stu-beto")] });

    const summary = await service.getPeriod("a1", PERIOD);

    expect(summary.overdue).toEqual([ana, caro]);
  });

  it("S5: lists a paid student with the payment and not as overdue", async () => {
    const paid = payment("stu-beto");
    const { service } = setup({ payments: [paid] });

    const summary = await service.getPeriod("a1", PERIOD);

    expect(summary.paid).toEqual([{ student: beto, payment: paid }]);
    expect(summary.overdue).not.toContainEqual(beto);
  });

  it("S4/S5: a payment of another period does not count", async () => {
    const { service } = setup({ payments: [payment("stu-ana", "2026-10")] });

    const summary = await service.getPeriod("a1", PERIOD);

    expect(summary.overdue).toEqual([ana, beto, caro]);
    expect(summary.paid).toEqual([]);
  });

  it("S4: a period after a registered payment shows the student as paid", async () => {
    const { service } = setup();

    await service.registerPayment(caro, PERIOD, 15000);
    const summary = await service.getPeriod("a1", PERIOD);

    expect(summary.overdue).toEqual([ana, beto]);
    expect(summary.paid.map((p) => p.student)).toEqual([caro]);
  });

  it("rejects a malformed period", async () => {
    const { service } = setup();

    await expect(service.getPeriod("a1", "2026-1")).rejects.toMatchObject({ code: "invalid-period" });
  });
});

describe("currentPeriod", () => {
  it("is the month of the device's clock", () => {
    const { service } = setup();

    expect(service.currentPeriod()).toBe(PERIOD);
  });
});
