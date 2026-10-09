const DAY = 86_400_000;

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(parseISO(iso).getTime() + days * DAY));
}

export function daysBetween(fromISO: string, toISO_: string): number {
  return Math.round((parseISO(toISO_).getTime() - parseISO(fromISO).getTime()) / DAY);
}

/** Sackmann dates are yyyymmdd. */
export function fromCompact(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** The Monday on or before a date. */
export function mondayOf(iso: string): string {
  const d = parseISO(iso);
  const back = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -back);
}

const LONG = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export const formatDate = (iso: string) => LONG.format(parseISO(iso));
export const formatShortDate = (iso: string) => SHORT.format(parseISO(iso));
export const formatMonth = (iso: string) => MONTH.format(parseISO(iso));

export function ageOn(dobISO: string, onISO: string): number | null {
  if (!dobISO) return null;
  const dob = parseISO(dobISO);
  const on = parseISO(onISO);
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  if (on.getUTCMonth() < dob.getUTCMonth() || (on.getUTCMonth() === dob.getUTCMonth() && on.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
