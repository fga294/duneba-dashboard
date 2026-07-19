"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { startOfDay } from "date-fns";
import ReactCountryFlag from "react-country-flag";
import {
  Activity,
  Droplets,
  Eye,
  House,
  Leaf,
  Quote,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTemp, sydneyTime } from "@/lib/utils";
import {
  daysSince,
  daysUntil,
  nextAnniversary,
  upcomingSeasons,
} from "@/lib/relative-time";
import type {
  CurrencyRates,
  QuoteData,
  TransitBody,
  WeatherCurrent,
  WeatherData,
} from "@/types/dashboard";

/* ---------------------------------------------------------------------------
 * The Almanac Deck — one card slot that rotates through the almanac facts
 * every 30 s: Moon Phases · Astrological Transits · Exchange Rates ·
 * Time on Earth · Countdowns · Weather Gauges · Quote. Fixed height so the
 * layout never jumps between cards.
 * ------------------------------------------------------------------------- */

const CYCLE_MS = 30_000;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/* --- shared personal data (formerly Data Tracker) ---------------------------- */

// Local-midnight constructors (month is 0-indexed in the Date ctor).
// Photo paths are case-sensitive on the Linux kiosk — keep the exact casing.
const PEOPLE = [
  { photo: "/Fabricio_face.PNG", name: "Fabricio", dob: new Date(1982, 3, 29) },
  { photo: "/Viviane_face.JPG", name: "Viviane", dob: new Date(1981, 3, 22) },
  { photo: "/Dimitri_face.PNG", name: "Dimitri", dob: new Date(2012, 0, 2) },
  { photo: "/Lola_face.JPG", name: "Lola", dob: new Date(2020, 8, 22) },
] as const;

const ARRIVAL_AU = new Date(2015, 0, 23);
// 3 July 2020 — day 3 of month 7 (DD/MM; the Date ctor month is 0-indexed).
const DUNEBA_SINCE = new Date(2020, 6, 3);

// `month` here is human form (1-12) to match `nextAnniversary`.
const COUNTDOWNS = [
  { emoji: "🎄", label: "Christmas", month: 12, day: 25 },
  { emoji: "🎂", label: "Fabricio", month: 4, day: 29 },
  { emoji: "🎂", label: "Viviane", month: 4, day: 22 },
  { emoji: "🎂", label: "Dimitri", month: 1, day: 2 },
  { emoji: "🎂", label: "Lola", month: 9, day: 22 },
] as const;

/* --- moon helpers ------------------------------------------------------------- */

// Phase name (as returned by WeatherAPI) → emoji across the eight-phase cycle.
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

/* --- FX sparkline primitives (formerly Data Tracker) --------------------------- */

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

// "2026-02-15" → "feb"
function monthCode(isoDate: string): string {
  return MONTHS[Number(isoDate.slice(5, 7)) - 1] ?? "";
}

const SPARK_W = 170;
const SPARK_H = 20;

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    return (
      <span className="shrink-0" style={{ width: SPARK_W, height: SPARK_H }} aria-hidden />
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
  const color = up ? "var(--trend-up)" : "var(--trend-down)";
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

function MonthTick({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span className="shrink-0 text-[11px] font-medium tracking-[0.1em] text-foreground/45">
      {label}
    </span>
  );
}

// `large` is the marquee size (Time on Earth); default stays the coin size the
// FX rate rows use.
function Flag({ code, large }: { code: string; large?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.15] ${
        large ? "h-14 w-14" : "h-5 w-5"
      }`}
    >
      <ReactCountryFlag
        countryCode={code}
        svg
        style={
          large
            ? { width: "4.5em", height: "4.5em" }
            : { width: "1.5em", height: "1.5em" }
        }
        aria-label={code}
      />
    </span>
  );
}

// Round face avatar for the Time on Earth marquee — same ring treatment as
// Flag. alt is empty because the person's name sits right beside the photo.
function Face({ src }: { src: string }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.15]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

// A person/anniversary chip: round avatar beside a stacked name / day-count.
function TimePerson({
  avatar,
  label,
  days,
}: {
  avatar: ReactNode;
  label: string;
  days: number;
}) {
  return (
    <span className="flex shrink-0 items-center gap-3.5 whitespace-nowrap">
      {avatar}
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-medium leading-none text-foreground/85">
          {label}
        </span>
        <span className="font-mono text-[21px] font-medium leading-none text-[color:var(--accent-1)] num-tabular">
          {days.toLocaleString()}
          <span className="ml-1.5 font-sans text-[13px] font-normal text-foreground/50">
            days
          </span>
        </span>
      </span>
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
  const up = history.length >= 2 && history[history.length - 1] >= history[0];
  return (
    // Left-aligned, compact: the three groups (flag, sparkline, price) sit
    // together instead of spreading across the card.
    <div className="flex items-center gap-4 py-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-[18px] leading-none">
          <Flag code={countryCode} />
        </span>
        <span className="truncate text-[15px] font-medium text-foreground/85">
          {currency}
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <MonthTick label={startLabel} />
        {history.length >= 2 && (
          <span className="shrink-0 font-mono text-[13px] text-foreground/55 num-tabular">
            {history[0].toFixed(2)}
          </span>
        )}
        <Sparkline data={history} />
        <MonthTick label={endLabel} />
        {history.length >= 2 && (
          // Direction tick pairs with the trend colour for red-green colour-blind safety.
          <span
            className="text-[12px] font-bold leading-none"
            style={{ color: up ? "var(--trend-up)" : "var(--trend-down)" }}
            aria-hidden
          >
            {up ? "▲" : "▼"}
          </span>
        )}
      </span>
      <span className="shrink-0 font-mono text-[16px] font-medium text-[color:var(--accent-1)] num-tabular">
        {rate.toFixed(2)}
      </span>
    </div>
  );
}

/* --- weather gauge primitives (formerly Meteorologists Corner) ------------------ */

// US EPA index: 1 Good, 2 Moderate, 3 Unhealthy (sensitive), 4 Unhealthy, 5 Very Unhealthy, 6 Hazardous
// Dark-tuned for gunmetal: bright hues carry the semantics against dark metal.
const AQI_LABELS = ["—", "Good", "Mod", "Unhlth*", "Unhlth", "V.Unhlth", "Hazard"];
const AQI_COLORS = [
  "oklch(0.65 0 0 / 0.7)",
  "oklch(0.78 0.16 145)",
  "oklch(0.85 0.15 95)",
  "oklch(0.78 0.16 60)",
  "oklch(0.7 0.2 25)",
  "oklch(0.6 0.22 340)",
  "oklch(0.5 0.18 25)",
];
const aqiLabel = (i: number) => AQI_LABELS[i] ?? "—";
const aqiColor = (i: number) => AQI_COLORS[i] ?? AQI_COLORS[0];

// Left→right "best to worst" gauge gradients per stat (CSS stop lists).
const GAUGE = {
  feels: "#0000ff, #00cfff, #00e676, #ffee58, #ff7043, #b71c1c, #6a1b9a",
  humidity: "#ffee58, #00e676, #00cfff, #1565c0",
  wind: "#00e676, #ffee58, #ff7043, #b71c1c",
  uv: "#00e676, #ffee58, #ff7043, #b71c1c, #6a1b9a",
  visibility: "#b71c1c, #ff7043, #ffee58, #00e676", // reversed: low vis = bad (red)
  aqi: "#00e676, #ffee58, #ff7043, #b71c1c, #6a1b9a",
} as const;

// We only have the WeatherAPI US-EPA category (1–6), not a numeric AQI, so map
// each category to the midpoint of its band on the brief's 0–200 scale.
const aqiGaugeValue = (epaIndex: number) => (epaIndex - 0.5) * 50;

// One metric: icon + label + value over a gradient gauge bar. `icon` arrives as
// a prop (a lucide component), so rendering <Icon/> is a prop render — not a
// render-scope component definition — and stays clear of react-hooks/static-components.
function Stat({
  icon: Icon,
  label,
  value,
  color,
  gradient,
  fraction,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string;
  gradient: string;
  fraction: number;
}) {
  const left = Math.min(98, Math.max(2, fraction * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[15px] text-foreground/70">
        <Icon
          className="h-5 w-5 shrink-0"
          strokeWidth={1.5}
          style={color ? { color } : undefined}
        />
        <span className="text-foreground/60">{label}</span>
        <span
          className="ml-auto font-mono text-foreground/85 num-tabular"
          style={color ? { color } : undefined}
        >
          {value}
        </span>
      </div>
      <div
        className="relative h-[4px] w-full rounded-full opacity-90"
        style={{ background: `linear-gradient(to right, ${gradient})` }}
      >
        <span
          className="absolute top-1/2 h-[9px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ left: `${left}%`, boxShadow: "0 0 4px oklch(0 0 0 / 0.7)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/* --- card bodies ------------------------------------------------------------------ */

function MoonBody({ astronomy }: { astronomy?: WeatherData["astronomy"] }) {
  if (!astronomy) return <Pending />;
  return (
    <div className="flex max-w-[680px] items-center justify-between gap-2 py-0.5">
      <span className="flex items-center gap-4">
        <span className="text-[64px] leading-none" aria-hidden>
          {moonEmoji(astronomy.moon_phase)}
        </span>
        <span className="flex flex-col">
          <span className="text-[22px] font-semibold text-foreground">
            {astronomy.moon_phase}
          </span>
          <span className="text-[13px] text-foreground/55 num-tabular">
            {astronomy.moon_illumination}% illuminated{" "}
            <span className="text-foreground/45">
              (and {moonIncreasing(astronomy.moon_phase) ? "increasing" : "decreasing"})
            </span>
          </span>
        </span>
      </span>
      <span className="flex flex-col items-end gap-2 text-[14px] text-foreground/60">
        <span className="flex items-center gap-2">
          <Sunrise
            className="h-4 w-4 text-[color:var(--accent-2)]"
            strokeWidth={1.5}
          />
          <span className="text-foreground/45">Sunrise</span>
          <span className="num-tabular">{astronomy.sunrise}</span>
        </span>
        <span className="flex items-center gap-2">
          <Sunset
            className="h-4 w-4 text-[color:var(--accent-1)]"
            strokeWidth={1.5}
          />
          <span className="text-foreground/45">Sunset</span>
          <span className="num-tabular">{astronomy.sunset}</span>
        </span>
      </span>
    </div>
  );
}

// All ten bodies statically fill the card as a 5×2 grid. Each cell pairs a
// large glyph with a two-line name / degree-sign stack — the tallest, widest
// type the fixed card height allows without scrolling. An ember ℞ between
// degree and sign marks bodies currently in retrograde motion.
function TransitsBody({ transits }: { transits?: TransitBody[] }) {
  if (!transits) return <Pending />;
  return (
    <div className="grid grid-cols-5 gap-x-6 gap-y-5">
      {transits.map((t) => (
        <div key={t.name} className="flex items-center gap-3">
          <span
            className="w-8 shrink-0 text-center text-[32px] leading-none text-foreground/70"
            aria-hidden
          >
            {t.symbol}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[16px] font-medium leading-none text-foreground/85">
              {t.name}
            </span>
            <span className="flex items-baseline gap-1.5 whitespace-nowrap leading-none">
              <span className="font-mono text-[14px] text-foreground/50 num-tabular">
                {t.degree}°
              </span>
              {t.retrograde && (
                <span
                  className="text-[13px] text-[color:var(--accent-1)]"
                  title="Retrograde"
                >
                  ℞
                </span>
              )}
              <span className="text-[15px] font-medium text-[color:var(--accent-2)]">
                {t.sign}
              </span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function FxBody({ currency }: { currency?: CurrencyRates }) {
  if (!currency) return <Pending />;
  const histDates = currency.historyDates ?? [];
  const startMonth = histDates.length ? monthCode(histDates[0]) : "";
  const endMonth = histDates.length
    ? monthCode(histDates[histDates.length - 1])
    : "";
  return (
    <div className="max-w-[680px]">
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
    </div>
  );
}

// Two states crossfading on a 20 s cycle (~10 s each, see .deck-fade): the
// four people, then the household anniversaries — Living in Australia and the
// Duneba house counter. Layers are absolutely stacked (out of flow) so their
// intrinsic width can never propagate into the page grid; the delayed layer
// also carries base opacity-0 so a reduced-motion freeze shows only state A.
function TimeBody({ today }: { today: Date }) {
  return (
    <div className="relative h-16 w-full overflow-hidden">
      <div className="deck-fade absolute inset-0 flex items-center gap-12">
        {PEOPLE.map((p) => (
          <TimePerson
            key={p.name}
            avatar={<Face src={p.photo} />}
            label={p.name}
            days={daysSince(p.dob, today)}
          />
        ))}
      </div>
      <div
        className="deck-fade absolute inset-0 flex items-center gap-16 opacity-0"
        style={{ animationDelay: "10s" }}
      >
        <TimePerson
          avatar={<Flag code="AU" large />}
          label="Living in Australia"
          days={daysSince(ARRIVAL_AU, today)}
        />
        <TimePerson
          avatar={
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.15]">
              <House
                className="h-7 w-7 text-[color:var(--accent-1)]"
                strokeWidth={1.5}
              />
            </span>
          }
          label="Duneba"
          days={daysSince(DUNEBA_SINCE, today)}
        />
      </div>
    </div>
  );
}

// The year as a line, today as a fixed ember filament at its centre.
// Anniversaries and season starts enter from the right ("in N days"), drift
// toward the filament as days pass, light up ember on the day itself, then
// recede left ("N days ago") until they fall off the edge half a year later.
// Emoji sit ON the line like beads on a rail (clear of the card's vertical
// clip); their text stacks alternate above/below in x-order so near-coincident
// dates never collide. Seasons ride the same rail on the same rules, but at a
// larger bead size — they are the coarser tier of the year and read as such.
function CountdownBody({ today }: { today: Date }) {
  const events = [
    ...COUNTDOWNS.map((c) => ({
      emoji: c.emoji,
      label: c.label,
      days: daysUntil(nextAnniversary(c.month, c.day, today), today),
      season: false,
    })),
    // Season starts. A season starting today reports 365 days, which folds to
    // offset 0 — "Today". Tagged here, at the one point the two sources are
    // still distinguishable, so the rail can size them as their own tier.
    ...upcomingSeasons(today).map((s) => ({
      emoji: s.emoji,
      label: s.season,
      days: s.days,
      season: true,
    })),
  ]
    // Fold the yearly cycle onto ±half a year around today: an anniversary
    // more than ~6 months out reads as the previous one receding into the past.
    .map((e) => ({ ...e, offset: e.days <= 182 ? e.days : e.days - 365 }))
    .sort((a, b) => a.offset - b.offset);

  return (
    <div className="relative h-[124px] w-full overflow-hidden">
      <div
        className="absolute inset-x-0 top-1/2 h-px bg-white/[0.12] [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%_-_24px),transparent)]"
        aria-hidden
      />
      {/* "Now" — an ember filament crossing the rail, the fixed reference the
          markers drift through. Three layers: a soft bloom, the 1px filament
          itself (brightest where it meets the rail, dissolving at both ends so
          it reads as lit rather than drawn), and a pip on the crossing. The
          bloom is a gradient, not a blur() filter, so the always-on kiosk keeps
          the whole marker on the compositor. Unlike the dial it replaces, a
          1px line survives an event landing on today — it runs past the emoji
          instead of hiding behind it. */}
      <span
        className="absolute inset-y-0 left-1/2 w-[14px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,var(--glow-1),transparent_70%)]"
        aria-hidden
      />
      <span
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,var(--accent-1)_45%,var(--accent-1)_55%,transparent)]"
        aria-hidden
      />
      <span
        className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--accent-1)] shadow-[0_0_6px_2px_var(--glow-1)]"
        aria-hidden
      />
      {events.map((e, i) => {
        const isToday = e.offset === 0;
        const past = e.offset < 0;
        const above = i % 2 === 0;
        const pct = 50 + (e.offset / 365) * 100;
        const caption = isToday
          ? "Today"
          : past
            ? `${-e.offset} days ago`
            : `in ${e.offset} days`;
        // Seasons are the coarser tier of the year and run visibly larger than
        // the anniversaries; within each tier the day itself steps up again.
        const size = e.season
          ? isToday
            ? "text-[34px]"
            : "text-[30px]"
          : isToday
            ? "text-[26px]"
            : "text-[20px]";
        // A 34px bead reaches ±17px about the rail, so the season tier needs one
        // more step of clearance or it grazes its own caption.
        const clearance = e.season
          ? above
            ? "bottom-1/2 mb-5"
            : "top-1/2 mt-5"
          : above
            ? "bottom-1/2 mb-4"
            : "top-1/2 mt-4";
        return (
          <Fragment key={e.label}>
            {/* the bead riding the rail */}
            <span
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none ${size} ${
                past ? "opacity-60" : ""
              }`}
              style={{ left: `${pct}%` }}
              aria-hidden
            >
              {e.emoji}
            </span>
            {/* its label, floated clear of the rail */}
            <div
              className={`absolute flex -translate-x-1/2 flex-col items-center gap-1 whitespace-nowrap ${clearance} ${
                past ? "opacity-60" : ""
              }`}
              style={{ left: `${pct}%` }}
            >
              <span
                className={`text-[12px] font-medium leading-none ${
                  isToday ? "text-foreground" : "text-foreground/75"
                }`}
              >
                {e.label}
              </span>
              <span
                className={`font-mono text-[11px] leading-none num-tabular ${
                  isToday
                    ? "font-semibold text-[color:var(--accent-1)]"
                    : past
                      ? "text-foreground/45"
                      : "text-[color:var(--accent-1)]"
                }`}
              >
                {caption}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function GaugesBody({ current }: { current?: WeatherCurrent }) {
  if (!current) return <Pending />;
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-3.5">
      <Stat
        icon={Thermometer}
        label="Feels"
        value={formatTemp(current.feelslike_c)}
        gradient={GAUGE.feels}
        fraction={(current.feelslike_c + 10) / 60}
      />
      <Stat
        icon={Droplets}
        label="Humidity"
        value={`${current.humidity}%`}
        gradient={GAUGE.humidity}
        fraction={current.humidity / 100}
      />
      <Stat
        icon={Wind}
        label="Wind"
        value={`${Math.round(current.wind_kph)} km/h`}
        gradient={GAUGE.wind}
        fraction={current.wind_kph / 100}
      />
      <Stat
        icon={Sun}
        label="UV"
        value={`${Math.round(current.uv)}`}
        gradient={GAUGE.uv}
        fraction={Math.min(current.uv, 11) / 11}
      />
      <Stat
        icon={Eye}
        label="Visibility"
        value={`${Math.round(current.vis_km)} km`}
        gradient={GAUGE.visibility}
        fraction={Math.min(current.vis_km, 20) / 20}
      />
      <Stat
        icon={Leaf}
        label="AQI"
        value={aqiLabel(current.air_quality_index)}
        color={aqiColor(current.air_quality_index)}
        gradient={GAUGE.aqi}
        fraction={Math.min(aqiGaugeValue(current.air_quality_index), 200) / 200}
      />
    </div>
  );
}

function QuoteBody({ quote }: { quote?: QuoteData }) {
  const q = quote ?? {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
  };
  return (
    // Full card width, big type, wrapping to a second line when the quote needs it.
    <div className="flex items-start gap-3">
      <Quote
        className="mt-1 h-5 w-5 shrink-0 text-[color:var(--accent-1)]"
        strokeWidth={1.75}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="line-clamp-2 text-[21px] font-light italic leading-snug text-foreground/85">
          &ldquo;{q.text}&rdquo;
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-[color:var(--accent-1)]">
          {q.author}
        </span>
      </div>
    </div>
  );
}

function Pending() {
  return <div className="py-0.5 text-[14px] text-foreground/40">…</div>;
}

/* --- the deck ----------------------------------------------------------------------- */

export function AlmanacDeckWidget() {
  // Hydration-safe: render nothing until the client resolves the Sydney date,
  // then re-tick every 60s so counters roll over at local midnight.
  const [today, setToday] = useState<Date | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const update = () => setToday(startOfDay(sydneyTime()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Advance the deck every 30 s.
  useEffect(() => {
    const id = setInterval(() => setIndex((v) => v + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const { data: weather } = useSWR<WeatherData>("/api/weather", fetcher, {
    refreshInterval: 30 * 60 * 1000,
  });
  const { data: currency } = useSWR<CurrencyRates>("/api/currency", fetcher, {
    refreshInterval: 60 * 60 * 1000,
  });
  const { data: quote } = useSWR<QuoteData>("/api/quote", fetcher, {
    refreshInterval: 60 * 60 * 1000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  // Computed locally by the ephemeris package — refreshing every 10 min keeps
  // the fast-moving Moon (~0.5°/hour) accurate at zero external cost.
  const { data: transits } = useSWR<TransitBody[]>("/api/transits", fetcher, {
    refreshInterval: 10 * 60 * 1000,
  });

  if (!today) return null;

  const cards: { label: string; node: ReactNode }[] = [
    { label: "Moon Phases", node: <MoonBody astronomy={weather?.astronomy} /> },
    {
      label: "Astrological Transits",
      node: <TransitsBody transits={transits} />,
    },
    { label: "Exchange Rates", node: <FxBody currency={currency} /> },
    { label: "Time on Earth", node: <TimeBody today={today} /> },
    { label: "Countdowns", node: <CountdownBody today={today} /> },
    { label: "Weather Gauges", node: <GaugesBody current={weather?.current} /> },
    { label: "Quote", node: <QuoteBody quote={quote} /> },
  ];
  const i = index % cards.length;
  const card = cards[i];

  return (
    // Fixed height: cards differ in natural height and the slot must not jump.
    <Card className="h-[205px] shrink-0">
      <CardContent className="flex h-full flex-col py-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Activity
            className="h-4 w-4 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-foreground/60">
            {card.label}
          </p>
        </div>

        <div
          key={i}
          className="flex min-h-0 flex-1 flex-col justify-center animate-in fade-in duration-500"
          aria-live="polite"
        >
          {card.node}
        </div>
      </CardContent>
    </Card>
  );
}
