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

// Maps °C to a perceptually-uniform OKLCH color: deep purple at extreme cold,
// blue → cyan → green → yellow → orange → bright red at extreme heat.
// Stops chosen for "how a person would feel," not for evenly-spaced math.
// Dark-theme (Gunmetal) ramp: bright L≈0.65–0.86 values that carry against
// charcoal metal (the light ramp's L≈0.5 values go muddy on dark surfaces).
type TempStop = readonly [tempC: number, l: number, c: number, h: number];
const TEMP_STOPS: readonly TempStop[] = [
  [-10, 0.65, 0.18, 320],
  [0, 0.7, 0.18, 300],
  [10, 0.74, 0.17, 275],
  [16, 0.78, 0.14, 210],
  [20, 0.8, 0.16, 150],
  [25, 0.86, 0.17, 95],
  [30, 0.76, 0.19, 50],
  [38, 0.68, 0.23, 25],
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
