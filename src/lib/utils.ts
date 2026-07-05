import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SYDNEY_TZ = "Australia/Sydney";

export function sydneyTime(date: Date = new Date()): Date {
  return toZonedTime(date, SYDNEY_TZ);
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°`;
}

// Maps °C to a perceptually-uniform OKLCH color: violet at extreme cold,
// indigo → slate blue → teal → eucalyptus → olive-gold → amber → clay red.
// Stops chosen for "how a person would feel," not for evenly-spaced math.
// Light-theme (Almanac) ramp: L≈0.45–0.58 so temps hold ~4:1 on warm paper
// (the old bright-on-black values washed out entirely on a light surface).
type TempStop = readonly [tempC: number, l: number, c: number, h: number];
const TEMP_STOPS: readonly TempStop[] = [
  [-10, 0.45, 0.14, 300],
  [0, 0.47, 0.12, 275],
  [10, 0.5, 0.1, 245],
  [16, 0.52, 0.09, 200],
  [20, 0.52, 0.1, 155],
  [25, 0.58, 0.11, 95],
  [30, 0.56, 0.14, 55],
  [38, 0.5, 0.17, 30],
];

export function tempColor(tempC: number): string {
  const first = TEMP_STOPS[0];
  const last = TEMP_STOPS[TEMP_STOPS.length - 1];
  if (tempC <= first[0]) return `oklch(${first[1]} ${first[2]} ${first[3]})`;
  if (tempC >= last[0]) return `oklch(${last[1]} ${last[2]} ${last[3]})`;
  for (let i = 0; i < TEMP_STOPS.length - 1; i++) {
    const [t0, l0, c0, h0] = TEMP_STOPS[i];
    const [t1, l1, c1, h1] = TEMP_STOPS[i + 1];
    if (tempC >= t0 && tempC <= t1) {
      const r = (tempC - t0) / (t1 - t0);
      const L = l0 + (l1 - l0) * r;
      const C = c0 + (c1 - c0) * r;
      const H = h0 + (h1 - h0) * r;
      return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
    }
  }
  return `oklch(${last[1]} ${last[2]} ${last[3]})`;
}

export function formatEventTime(dateStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const date = new Date(dateStr);
  return format(date, "h:mm a");
}
