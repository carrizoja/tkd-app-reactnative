/**
 * Spanish (Argentina) user-facing copy for the fees screen, plus the helpers
 * that read and show periods and amounts the Argentine way.
 * Code and identifiers remain English (design D4); only these values are localized.
 */
import type { PeriodString } from "../../../lib/model/ids";
import { FeeError, type FeeErrorCode } from "../model/types";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "2026-11" → "Noviembre 2026". */
export function formatPeriod(period: PeriodString): string {
  const [year, month] = period.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

/** The period `delta` months away: shiftPeriod("2026-01", -1) is "2025-12". */
export function shiftPeriod(period: PeriodString, delta: number): PeriodString {
  const [year, month] = period.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * Reads an amount typed the Argentine way: "15.000", "15000" or "12.500,50".
 * Returns NaN when the text is not a number, so the service rejects it.
 */
export function parseAmount(text: string): number {
  const normalized = text.trim().replace(/\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** 15000 → "$15.000"; 12500.5 → "$12.500,50". */
export function formatAmount(amount: number): string {
  const [whole, cents] = amount.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return cents === "00" ? `$${grouped}` : `$${grouped},${cents}`;
}

export const FEE_COPY = {
  schoolLink: "Cuotas",
  title: (schoolName: string) => `Cuotas · ${schoolName}`,
  previousMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  overdueTitle: (count: number) => `Adeudan (${count})`,
  paidTitle: (count: number) => `Pagaron (${count})`,
  noStudents: "La escuela todavía no tiene alumnos.",
  noOverdue: "Nadie adeuda la cuota de este mes.",
  noPaid: "Nadie pagó la cuota de este mes todavía.",
  registerFor: (name: string) => `Registrar cuota de ${name}`,
  amountLabel: "Monto ($)",
  amountPlaceholder: "Ej.: 15.000",
  cashNote: "Pago en efectivo.",
  collect: "Cobrar",
  register: "Registrar pago",
  cancel: "Cancelar",
  registered: (name: string) => `Pago de ${name} registrado.`,
  paidLine: (amount: string, date: string) => `${amount} · ${date}`,
};

const ERROR_MESSAGES: Record<FeeErrorCode, string> = {
  "invalid-period": "El mes no es válido.",
  "future-period": "No se puede registrar la cuota de un mes que todavía no empezó.",
  "invalid-amount": "Ingresá un monto mayor a 0, por ejemplo 15.000.",
  "already-paid": "Ese alumno ya pagó la cuota de este mes.",
};

export function feeErrorMessage(error: unknown): string {
  if (error instanceof FeeError) {
    return ERROR_MESSAGES[error.code];
  }
  return "No se pudo registrar el pago. Revisá la conexión y probá de nuevo.";
}
