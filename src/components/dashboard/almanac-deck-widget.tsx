"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { startOfDay } from "date-fns";
import ReactCountryFlag from "react-country-flag";
import {
  Activity,
  Droplets,
  Eye,
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
  currentSeason,
  daysSince,
  daysUntil,
  nextAnniversary,
  upcomingSeasons,
} from "@/lib/relative-time";
import type {
  CurrencyRates,
  QuoteData,
  WeatherCurrent,
  WeatherData,
} from "@/types/dashboard";

/* ---------------------------------------------------------------------------
 * The Almanac Deck — one card slot that rotates through the almanac facts
 * every 30 s: Moon Phases · Exchange Rates · Time on Earth · Countdowns ·
 * Season · Weather Gauges · Quote. Fixed height so the layout never jumps
 * between cards.
 * ------------------------------------------------------------------------- */

const CYCLE_MS = 30_000;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/* --- shared personal data (formerly Data Tracker) ---------------------------- */

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

function Flag({ code }: { code: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.15]">
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: "1.5em", height: "1.5em" }}
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
        <span className="text-[18px] leading-none">{icon}</span>
        <span className="truncate text-[15px] font-medium text-foreground/85">
          {label}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[16px] font-medium text-[color:var(--accent-1)] num-tabular">
        {value}
        {unit && (
          <span className="ml-1 text-[12px] font-normal text-foreground/50">
            {unit}
          </span>
        )}
      </span>
    </div>
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
    <div className="flex items-center justify-between gap-2 py-0.5">
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

function TimeBody({ today }: { today: Date }) {
  return (
    <div className="grid max-w-[680px] grid-cols-2 gap-x-10">
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
    </div>
  );
}

function CountdownBody({ today }: { today: Date }) {
  return (
    <div className="grid max-w-[680px] grid-cols-2 gap-x-10">
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
    </div>
  );
}

function SeasonBody({ today }: { today: Date }) {
  const season = currentSeason(today);
  // Soonest season is the headline; the rest of the cycle sits small on the right.
  const [next, ...later] = upcomingSeasons(today);
  return (
    <div className="flex max-w-[680px] items-center justify-between gap-6 py-0.5">
      {/* Current season is the star; the countdown rides beside it as support. */}
      <span className="flex items-center gap-3">
        <span className="text-[42px] leading-none" aria-hidden>
          {season.emoji}
        </span>
        <span className="flex items-baseline gap-3">
          <span className="text-[27px] font-semibold leading-none text-foreground">
            {season.season}
          </span>
          <span className="flex items-baseline gap-1.5 text-[14px] text-foreground/60">
            <span className="text-[15px] leading-none" aria-hidden>
              {next.emoji}
            </span>
            <span className="font-mono text-[color:var(--accent-1)] num-tabular">
              {next.days}
            </span>{" "}
            days until {next.season}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col gap-1.5 text-[13px] text-foreground/60">
        {later.map((s) => (
          <span key={s.season} className="flex items-center gap-1.5">
            <span className="text-[15px] leading-none" aria-hidden>
              {s.emoji}
            </span>
            <span className="font-mono text-[color:var(--accent-1)] num-tabular">
              {s.days}
            </span>{" "}
            days until {s.season}
          </span>
        ))}
      </span>
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

  if (!today) return null;

  const cards: { label: string; node: ReactNode }[] = [
    { label: "Moon Phases", node: <MoonBody astronomy={weather?.astronomy} /> },
    { label: "Exchange Rates", node: <FxBody currency={currency} /> },
    { label: "Time on Earth", node: <TimeBody today={today} /> },
    { label: "Countdowns", node: <CountdownBody today={today} /> },
    { label: "Season", node: <SeasonBody today={today} /> },
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
