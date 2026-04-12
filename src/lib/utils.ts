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

export function formatEventTime(dateStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const date = new Date(dateStr);
  return format(date, "h:mm a");
}
