/** Generate hourly time slots between open_time and close_time (supports overnight, e.g. 07:00–00:00) */
export function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const openHour = parseInt(openTime.split(":")[0], 10);
  let closeHour = parseInt(closeTime.split(":")[0], 10);
  if (closeHour <= openHour) closeHour += 24;
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    const displayHour = h % 24;
    const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
    const ampm = displayHour < 12 ? "AM" : "PM";
    slots.push(`${hour12}:00 ${ampm}`);
  }
  return slots;
}

/** Convert "HH:MM" or "HH:MM:SS" to "7:00 AM" format */
export function formatTime12(time: string): string {
  const hour = parseInt(time.split(":")[0], 10);
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${hour12}:00 ${ampm}`;
}

/** Given a slot like "7:00 AM", return the next hour label e.g. "8:00 AM" */
export function nextHourLabel(slot: string): string {
  const h24 = parse12Hour(slot);
  const next = (h24 + 1) % 24;
  const hour12 = next === 0 ? 12 : next > 12 ? next - 12 : next;
  const ampm = next < 12 ? "AM" : "PM";
  return `${hour12}:00 ${ampm}`;
}

/** Convert "7:00 AM" to 24h hour number (e.g. 7, or "12:00 AM" → 0) */
export function parse12Hour(slot: string): number {
  const [timePart, ampm] = slot.split(" ");
  let hour = parseInt(timePart.split(":")[0], 10);
  if (ampm === "AM" && hour === 12) hour = 0;
  else if (ampm === "PM" && hour !== 12) hour += 12;
  return hour;
}

/** Get the per-hour rate for a slot, falling back to court base price */
export function getSlotRate(
  slot: string,
  hourlyRates: Record<string, number> | null | undefined,
  basePrice: number
): number {
  if (!hourlyRates) return basePrice;
  const hour = parse12Hour(slot);
  return hourlyRates[String(hour)] ?? basePrice;
}

/** Get the per-hour rate for a 24h hour number, falling back to base price */
export function getHourRate(
  hour: number,
  hourlyRates: Record<string, number> | null | undefined,
  basePrice: number
): number {
  if (!hourlyRates) return basePrice;
  return hourlyRates[String(hour)] ?? basePrice;
}

export function formatCurrency(amount: number) {
  return `\u20B1${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Format a Date to "YYYY-MM-DD" using local time (Asia/Manila safe) */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Convert 24h hour to "7:00 - 8:00 AM" range format */
export function hour24ToLabel(hour: number): string {
  const startH = hour % 24;
  const endH = (hour + 1) % 24;

  const to12 = (h: number) => (h === 0 ? 12 : h > 12 ? h - 12 : h);
  const period = (h: number) => (h < 12 ? "AM" : "PM");

  const startPeriod = period(startH);
  const endPeriod = period(endH);

  if (startPeriod === endPeriod) {
    return `${to12(startH)}:00 - ${to12(endH)}:00 ${endPeriod}`;
  }
  return `${to12(startH)}:00 ${startPeriod} - ${to12(endH)}:00 ${endPeriod}`;
}

export const STORAGE_KEY = "velocity-booking-form";

export const STEPS = [
  { num: 1, label: "Your Details" },
  { num: 2, label: "Court & Schedule" },
  { num: 3, label: "Review & Confirm" },
] as const;

// Colors used throughout the booking UI
export const colors = {
  bg: "#182916",
  accent: "#d3e9cb",
  accentDim: "#b7cdb0",
  surface: "#f5f4ed",
} as const;

export const ease = [0.16, 1, 0.3, 1] as const;
