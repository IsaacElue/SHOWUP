import { DateTime } from "luxon";

/** Values for `<input type="date">` and `<input type="time">` in Europe/Dublin. */
export function utcIsoToDublinDateAndTime(iso: string): { dateStr: string; timeStr: string } {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone("Europe/Dublin");
  if (!dt.isValid) {
    throw new Error("Invalid appointment time");
  }
  return { dateStr: dt.toFormat("yyyy-LL-dd"), timeStr: dt.toFormat("HH:mm") };
}

/** Interpret date + time as Europe/Dublin wall clock and return UTC ISO for storage. */
export function appointmentAtDublinToUtcIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const dt = DateTime.fromObject(
    { year: y, month: m, day: d, hour: h, minute: min },
    { zone: "Europe/Dublin" }
  );
  if (!dt.isValid) {
    throw new Error("Invalid date or time");
  }
  const utc = dt.toUTC();
  return utc.toISO()!;
}
