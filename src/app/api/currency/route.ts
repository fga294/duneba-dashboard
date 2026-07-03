import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { CurrencyRates } from "@/types/dashboard";

const SYMBOLS = "BRL,USD,EUR";

// Pick n evenly-spaced points (always including the first and last) so the
// sparkline payload stays light while its endpoints — which drive the up/down
// trend colour — remain exact.
function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

async function fetchHistory(): Promise<{
  history: CurrencyRates["history"];
  historyDates: string[];
}> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // Frankfurter timeseries: business-day rates across the range, keyed by date.
  const res = await fetch(
    `https://api.frankfurter.app/${iso(start)}..${iso(end)}?from=AUD&to=${SYMBOLS}`
  );
  if (!res.ok) throw new Error(`Currency timeseries error ${res.status}`);

  const data = await res.json();
  const series = data.rates as Record<
    string,
    { BRL: number; USD: number; EUR: number }
  >;
  const dates = Object.keys(series).sort();

  // Sample rates and dates at the SAME indices so the month labels line up with
  // the sparkline's first and last points.
  return {
    history: {
      BRL: sample(dates.map((d) => series[d].BRL), 24),
      USD: sample(dates.map((d) => series[d].USD), 24),
      EUR: sample(dates.map((d) => series[d].EUR), 24),
    },
    historyDates: sample(dates, 24),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    `https://api.frankfurter.app/latest?from=AUD&to=${SYMBOLS}`
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Currency API error" }, { status: 502 });
  }

  const data = await res.json();

  // History powers the sparkline — a progressive enhancement. If it fails we
  // still serve the live rates and render rows without a trend line.
  let history: CurrencyRates["history"] = { BRL: [], USD: [], EUR: [] };
  let historyDates: string[] = [];
  try {
    const h = await fetchHistory();
    history = h.history;
    historyDates = h.historyDates;
  } catch (err) {
    console.warn("currency history unavailable:", err);
  }

  const rates: CurrencyRates = {
    base: data.base,
    date: data.date,
    rates: {
      BRL: data.rates.BRL,
      USD: data.rates.USD,
      EUR: data.rates.EUR,
    },
    history,
    historyDates,
  };

  return NextResponse.json(rates);
}
