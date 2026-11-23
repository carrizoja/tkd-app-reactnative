import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SCHOOL } from "../../class-management/ui/test-helpers";
import { ANA, BRUNO } from "../../student-management/ui/test-helpers";
import { feeService } from "../data/repository";
import { FeeError, type Payment } from "../model/types";
import { FEE_COPY, formatAmount, formatPeriod, parseAmount, shiftPeriod } from "./copy";
import { FeesScreen } from "./FeesScreen";
import type { MockFeeService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  feeService: jest.requireActual("./test-helpers").mockFeeService(),
}));

const fees = feeService as unknown as MockFeeService;

const PERIOD = "2026-11";

const paymentOf = (studentId: string, period = PERIOD, amount = 15000): Payment => ({
  id: `${studentId}_${period}`,
  studentId,
  schoolId: SCHOOL.id,
  period,
  amount,
  status: "paid",
  method: "cash",
  paidAt: "2026-11-02T12:00:00.000Z",
});

async function renderScreen() {
  return await render(<FeesScreen school={SCHOOL} />);
}

describe("FeesScreen", () => {
  beforeEach(() => {
    Object.values(fees).forEach((fn) => fn.mockReset());
    fees.currentPeriod.mockReturnValue(PERIOD);
    fees.getPeriod.mockResolvedValue({ overdue: [ANA], paid: [{ student: BRUNO, payment: paymentOf(BRUNO.id) }] });
    fees.registerPayment.mockResolvedValue(undefined);
  });

  it("S4/S5: opens on the current month and lists overdue and paid students", async () => {
    await renderScreen();

    expect(await screen.findByText(FEE_COPY.overdueTitle(1))).toBeTruthy();
    expect(screen.getByText(formatPeriod(PERIOD))).toBeTruthy();
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText(FEE_COPY.paidTitle(1))).toBeTruthy();
    expect(screen.getByText("Bruno Gómez")).toBeTruthy();
    expect(screen.getByText(FEE_COPY.paidLine("$15.000", "02/11/2026"))).toBeTruthy();
    expect(fees.getPeriod).toHaveBeenCalledWith(SCHOOL.id, PERIOD);
  });

  it("S1: registers a typed amount for an overdue student and reloads the month", async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(FEE_COPY.registerFor("Ana Pérez")));
    await fireEvent.changeText(screen.getByLabelText(FEE_COPY.amountLabel), "12.500,50");
    fees.getPeriod.mockResolvedValue({
      overdue: [],
      paid: [
        { student: ANA, payment: paymentOf(ANA.id, PERIOD, 12500.5) },
        { student: BRUNO, payment: paymentOf(BRUNO.id) },
      ],
    });
    await fireEvent.press(screen.getByText(FEE_COPY.register));

    expect(fees.registerPayment).toHaveBeenCalledWith(ANA, PERIOD, 12500.5);
    expect(await screen.findByText(FEE_COPY.registered("Ana Pérez"))).toBeTruthy();
    expect(screen.getByText(FEE_COPY.paidTitle(2))).toBeTruthy();
    expect(screen.getByText(FEE_COPY.noOverdue)).toBeTruthy();
    expect(fees.getPeriod).toHaveBeenCalledTimes(2);
  });

  it("S2: shows that the period is already paid when the service rejects it", async () => {
    fees.registerPayment.mockRejectedValue(new FeeError("already-paid", "paid"));
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(FEE_COPY.registerFor("Ana Pérez")));
    await fireEvent.changeText(screen.getByLabelText(FEE_COPY.amountLabel), "15000");
    await fireEvent.press(screen.getByText(FEE_COPY.register));

    expect(await screen.findByText("Ese alumno ya pagó la cuota de este mes.")).toBeTruthy();
  });

  it("A1: passes an unreadable amount to the service, which rejects it", async () => {
    fees.registerPayment.mockRejectedValue(new FeeError("invalid-amount", "bad"));
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(FEE_COPY.registerFor("Ana Pérez")));
    await fireEvent.changeText(screen.getByLabelText(FEE_COPY.amountLabel), "quince");
    await fireEvent.press(screen.getByText(FEE_COPY.register));

    expect(fees.registerPayment).toHaveBeenCalledWith(ANA, PERIOD, Number.NaN);
    expect(await screen.findByText("Ingresá un monto mayor a 0, por ejemplo 15.000.")).toBeTruthy();
  });

  it("cancelling closes the amount form without registering", async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(FEE_COPY.registerFor("Ana Pérez")));
    await fireEvent.press(screen.getByText(FEE_COPY.cancel));

    expect(screen.queryByLabelText(FEE_COPY.amountLabel)).toBeNull();
    expect(fees.registerPayment).not.toHaveBeenCalled();
  });

  it("A2: moves to the previous month and back, never past the current one", async () => {
    await renderScreen();
    await screen.findByText(FEE_COPY.overdueTitle(1));
    expect(screen.getByLabelText(FEE_COPY.nextMonth)).toBeDisabled();

    await fireEvent.press(screen.getByLabelText(FEE_COPY.previousMonth));
    await waitFor(() => expect(fees.getPeriod).toHaveBeenLastCalledWith(SCHOOL.id, "2026-10"));
    expect(await screen.findByText(formatPeriod("2026-10"))).toBeTruthy();
    expect(screen.getByLabelText(FEE_COPY.nextMonth)).toBeEnabled();

    await fireEvent.press(screen.getByLabelText(FEE_COPY.nextMonth));
    await waitFor(() => expect(fees.getPeriod).toHaveBeenLastCalledWith(SCHOOL.id, PERIOD));
  });

  it("says when the school has no students", async () => {
    fees.getPeriod.mockResolvedValue({ overdue: [], paid: [] });
    await renderScreen();

    expect(await screen.findByText(FEE_COPY.noStudents)).toBeTruthy();
  });

  it("says when nobody has paid the month yet", async () => {
    fees.getPeriod.mockResolvedValue({ overdue: [ANA, BRUNO], paid: [] });
    await renderScreen();

    expect(await screen.findByText(FEE_COPY.noPaid)).toBeTruthy();
  });
});

describe("fee copy helpers", () => {
  it("reads Argentine amounts and rejects text", () => {
    expect(parseAmount("15.000")).toBe(15000);
    expect(parseAmount(" $ 15000 ")).toBe(15000);
    expect(parseAmount("12.500,50")).toBe(12500.5);
    expect(parseAmount("quince")).toBeNaN();
    expect(parseAmount("")).toBeNaN();
  });

  it("shows amounts and periods in Spanish", () => {
    expect(formatAmount(15000)).toBe("$15.000");
    expect(formatAmount(12500.5)).toBe("$12.500,50");
    expect(formatPeriod("2026-01")).toBe("Enero 2026");
  });

  it("shifts periods across years", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2025-12", 1)).toBe("2026-01");
  });
});
