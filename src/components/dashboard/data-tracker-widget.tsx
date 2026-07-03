"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { startOfDay } from "date-fns";
import ReactCountryFlag from "react-country-flag";
import { Activity, Sunrise, Sunset } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { sydneyTime } from "@/lib/utils";
import {
  currentSeason,
  daysSince,
  daysUntil,
  daysUntilNextSeason,
  nextAnniversary,
} from "@/lib/relative-time";
import type {
  CurrencyRates,
  TransitBody,
  WeatherData,
} from "@/types/dashboard";

// Local-midnight constructors (month is 0-indexed in the Date ctor).
const PEOPLE = [
  { emoji: "🧑", name: "Fabricio", dob: new Date(1982, 3, 29) },
  { emoji: "👩", name: "Viviane", dob: new Date(1981, 3, 22) },
  { emoji: "👦", name: "Dimitri", dob: new Date(2012, 0, 2) },
  { emoji: "🐶", name: "Lola", dob: new Date(2020, 8, 22) },
] as const;

const ARRIVAL_AU = new Date(2015, 0, 23);

// `month` here is human form (1-12) to match `nextAnniversary`.
const COUNTDOWNS = [
  { emoji: "🎄", label: "Christmas", month: 12, day: 25 },
  { emoji: "🎂", label: "Fabricio", month: 4, day: 29 },
  { emoji: "🎂", label: "Viviane", month: 4, day: 22 },
  { emoji: "🎂", label: "Dimitri", month: 1, day: 2 },
  { emoji: "🎂", label: "Lola", month: 9, day: 22 },
] as const;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// Phase name (as returned by WeatherAPI) → emoji across the eight-phase cycle.
// Keyed on normalized names; accepts both "New Moon"/"New" and the
// "Last Quarter"/"Third Quarter" spellings for 🌗.
const MOON_EMOJI: Record<string, string> = {
  "new moon": "🌑",
  new: "🌑",
  "waxing crescent": "🌒",
  "first quarter": "🌓",
  "waxing gibbous": "🌔",
  "full moon": "🌕",
  full: "🌕",
  "waning gibbous": "🌖",
  "last quarter": "🌗",
  "third quarter": "🌗",
  "waning crescent": "🌘",
};

function moonEmoji(phase: string): string {
  return MOON_EMOJI[phase.trim().toLowerCase()] ?? "🌙";
}

// Illumination rises through the waxing half (New → Full) and falls through the
// waning half (Full → New); New and Full are the turning points.
function moonIncreasing(phase: string): boolean {
  const p = phase.trim().toLowerCase();
  if (p.includes("wax")) return true;
  if (p.includes("wan")) return false;
  if (p.includes("first quarter")) return true;
  if (p.includes("last quarter") || p.includes("third quarter")) return false;
  if (p.includes("full")) return false; // turning point → decreasing
  return true; // New (and any fallback) → increasing
}

function Hairline() {
  return <hr className="my-1.5 h-px border-0 bg-white/[0.07]" />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[8px] font-medium uppercase tracking-[0.2em] text-white/35">
      {children}
    </p>
  );
}

function Flag({ code }: { code: string }) {
  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.1]">
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: "1.1em", height: "1.1em" }}
        aria-label={code}
      />
    </span>
  );
}

function Row({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-[12px] leading-none">{icon}</span>
        <span className="truncate text-[10px] font-medium text-white/85">
          {label}
        </span>
      </span>
      <span
        className="shrink-0 font-mono text-[11px] font-medium text-[color:var(--accent-1)] num-tabular"
        style={{ textShadow: "0 0 14px oklch(0.72 0.18 250 / 0.35)" }}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[9px] font-normal text-white/40">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

// Mini area+line chart of a rate's recent history. Colour follows direction over
// the whole window: green if the last point is at/above the first, else red.
// Renders a fixed-size placeholder when there isn't enough data, so the row
// layout stays stable while history loads or if the timeseries is unavailable.
const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

// "2026-02-15" → "feb"
function monthCode(isoDate: string): string {
  return MONTHS[Number(isoDate.slice(5, 7)) - 1] ?? "";
}

const SPARK_W = 138;
const SPARK_H = 14;

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    return (
      <span
        className="shrink-0"
        style={{ width: SPARK_W, height: SPARK_H }}
        aria-hidden
      />
    );
  }

  const pad = 1.5;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerH = SPARK_H - pad * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * SPARK_W;
    const y = pad + (1 - (v - min) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const up = data[data.length - 1] >= data[0];
  const color = up ? "oklch(0.8 0.17 145)" : "oklch(0.7 0.2 25)";
  const line = `M${points.join(" L")}`;
  const area = `${line} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`;

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className="shrink-0"
      aria-hidden
    >
      <path d={area} fill={color} fillOpacity={0.16} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Exchange-rate row: [flag code] — sparkline — value. The sparkline sits between
// the currency and its rate, tinted by the 6-month trend direction.
function MonthTick({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span className="shrink-0 text-[8px] font-medium tracking-[0.1em] text-white/35">
      {label}
    </span>
  );
}

function RateRow({
  countryCode,
  currency,
  rate,
  history,
  startLabel,
  endLabel,
}: {
  countryCode: string;
  currency: string;
  rate: number;
  history: number[];
  startLabel: string;
  endLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-[12px] leading-none">
          <Flag code={countryCode} />
        </span>
        <span className="truncate text-[10px] font-medium text-white/85">
          {currency}
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <MonthTick label={startLabel} />
        {history.length >= 2 && (
          <span className="shrink-0 font-mono text-[10px] text-white/45 num-tabular">
            {history[0].toFixed(2)}
          </span>
        )}
        <Sparkline data={history} />
        <MonthTick label={endLabel} />
      </span>
      <span
        className="shrink-0 font-mono text-[11px] font-medium text-[color:var(--accent-1)] num-tabular"
        style={{ textShadow: "0 0 14px oklch(0.72 0.18 250 / 0.35)" }}
      >
        {rate.toFixed(2)}
      </span>
    </div>
  );
}

// Two-column transit row: [☉ Sun]            [8° Gemini]
// Symbol + name left-aligned; degree + sign grouped right-aligned. The right
// group is nowrap so "22° Sagittarius" never breaks across lines.
function TransitRow({ body }: { body: TransitBody }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-[12px] leading-none">
      <span className="flex shrink-0 items-baseline gap-1.5">
        <span className="w-4 shrink-0 text-center text-white/70">
          {body.symbol}
        </span>
        <span className="font-medium text-white/85">{body.name}</span>
      </span>
      <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
        <span className="text-white/45 num-tabular">{body.degree}°</span>
        <span className="font-medium text-[color:var(--accent-2)]">
          {body.sign}
        </span>
      </span>
    </div>
  );
}

export function DataTrackerWidget() {
  // Hydration-safe: render nothing until the client resolves the Sydney date,
  // then re-tick every 60s so counters roll over at local midnight.
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setToday(startOfDay(sydneyTime()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // All ten planetary positions, computed server-side (ephemeris), refreshed 10m.
  const { data: transits } = useSWR<TransitBody[]>("/api/transits", fetcher, {
    refreshInterval: 10 * 60 * 1000,
  });
  // Moon block reads the shared weather feed (SWR dedupes the request).
  const { data: weather } = useSWR<WeatherData>("/api/weather", fetcher, {
    refreshInterval: 30 * 60 * 1000,
  });
  // Exchange rates + 6-month history, base AUD → BRL/USD/EUR.
  const { data: currency } = useSWR<CurrencyRates>("/api/currency", fetcher, {
    refreshInterval: 60 * 60 * 1000,
  });

  if (!today) return null;

  const season = currentSeason(today);
  const next = daysUntilNextSeason(today);
  const astronomy = weather?.astronomy;

  // Shared across all three rates — the timeseries covers one date range.
  const histDates = currency?.historyDates ?? [];
  const startMonth = histDates.length ? monthCode(histDates[0]) : "";
  const endMonth = histDates.length
    ? monthCode(histDates[histDates.length - 1])
    : "";

  return (
    <Card>
      <CardContent className="flex h-full flex-col py-4">
        <div className="mb-2 flex items-center gap-2">
          <Activity
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Data Tracker
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3">
          {/* Moon Phases — sunrise/sunset laid out alongside the phase name */}
          <div>
            <SectionLabel>Moon Phases</SectionLabel>
            {astronomy ? (
              <div className="flex items-center justify-between gap-2 py-0.5">
                <span className="flex items-center gap-2.5">
                  <span className="text-[40px] leading-none" aria-hidden>
                    {moonEmoji(astronomy.moon_phase)}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[14px] font-semibold text-white">
                      {astronomy.moon_phase}
                    </span>
                    <span className="text-[9px] text-white/45 num-tabular">
                      {astronomy.moon_illumination}% illuminated{" "}
                      <span className="text-white/35">
                        (and{" "}
                        {moonIncreasing(astronomy.moon_phase)
                          ? "increasing"
                          : "decreasing"}
                        )
                      </span>
                    </span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1 text-[10px] text-white/55">
                  <span className="flex items-center gap-1">
                    <Sunrise
                      className="h-3 w-3 text-[color:var(--accent-2)]"
                      strokeWidth={1.5}
                    />
                    <span className="num-tabular">{astronomy.sunrise}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Sunset
                      className="h-3 w-3 text-[color:var(--accent-1)]"
                      strokeWidth={1.5}
                    />
                    <span className="num-tabular">{astronomy.sunset}</span>
                  </span>
                </span>
              </div>
            ) : (
              <div className="py-0.5 text-[10px] text-white/30">…</div>
            )}
            <Hairline />
          </div>

          {/* Exchange Rates — base AUD, with 6-month trend sparklines */}
          <div>
            <SectionLabel>Exchange Rates</SectionLabel>
            {currency ? (
              <>
                <RateRow
                  countryCode="BR"
                  currency="BRL"
                  rate={currency.rates.BRL}
                  history={currency.history.BRL}
                  startLabel={startMonth}
                  endLabel={endMonth}
                />
                <RateRow
                  countryCode="US"
                  currency="USD"
                  rate={currency.rates.USD}
                  history={currency.history.USD}
                  startLabel={startMonth}
                  endLabel={endMonth}
                />
                <RateRow
                  countryCode="EU"
                  currency="EUR"
                  rate={currency.rates.EUR}
                  history={currency.history.EUR}
                  startLabel={startMonth}
                  endLabel={endMonth}
                />
              </>
            ) : (
              <div className="py-0.5 text-[10px] text-white/30">…</div>
            )}
            <Hairline />
          </div>

          {/* Time on Earth */}
          <div>
            <SectionLabel>Time on Earth</SectionLabel>
            {PEOPLE.map((p) => (
              <Row
                key={p.name}
                icon={p.emoji}
                label={p.name}
                value={daysSince(p.dob, today).toLocaleString()}
                unit="days"
              />
            ))}
            <Row
              icon={<Flag code="AU" />}
              label="Living in Australia"
              value={daysSince(ARRIVAL_AU, today).toLocaleString()}
              unit="days"
            />
            <Hairline />
          </div>

          {/* Countdowns */}
          <div>
            <SectionLabel>Countdowns</SectionLabel>
            {COUNTDOWNS.map((c) => {
              const d = daysUntil(nextAnniversary(c.month, c.day, today), today);
              return (
                <Row
                  key={c.label}
                  icon={c.emoji}
                  label={c.label}
                  value={d === 0 ? "Today" : d.toLocaleString()}
                  unit={d === 0 ? undefined : "days away"}
                />
              );
            })}
            <Hairline />
          </div>

          {/* Season */}
          <div>
            <SectionLabel>Season</SectionLabel>
            <div className="flex items-center justify-between gap-2 py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="text-[14px] leading-none">{season.emoji}</span>
                <span className="text-[11px] font-semibold text-white">
                  {season.season}
                </span>
              </span>
              <span className="text-right text-[10px] leading-tight text-white/55">
                <span className="font-mono text-[color:var(--accent-1)] num-tabular">
                  {next.days}
                </span>{" "}
                days
                <br />
                <span className="text-white/40">until {next.next}</span>
              </span>
            </div>
            <Hairline />
          </div>

          {/* Astrological Transits — all ten bodies, Sun..Pluto */}
          <div>
            <SectionLabel>Astrological Transits</SectionLabel>
            {transits ? (
              transits.map((t) => <TransitRow key={t.name} body={t} />)
            ) : (
              <div className="py-0.5 text-[10px] text-white/30">…</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
