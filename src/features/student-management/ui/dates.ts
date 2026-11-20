/**
 * Birth dates are stored as `YYYY-MM-DD` (a calendar day, no time zone) and
 * shown as `DD/MM/AAAA` (Argentina). Conversions use the device's local
 * calendar so a picked day never shifts by one across time zones.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar day of `date`, as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of a `YYYY-MM-DD` day, to open the calendar on it. */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** "09/03/2015" for "2015-03-09"; anything else is shown as it was. */
export function formatBirthDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}
