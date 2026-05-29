"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { startOfDay } from "date-fns";
import ReactCountryFlag from "react-country-flag";
import { Hourglass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { sydneyTime } from "@/lib/utils";
import {
  currentSeason,
  daysSince,
  daysUntil,
  daysUntilNextSeason,
  nextAnniversary,
} from "@/lib/relative-time";
import type { TransitBody } from "@/types/dashboard";

// Local-midnight constructors (month is 0-indexed in the Date ctor).
const PEOPLE = [
  { emoji: "🧑", name: "Fabricio", dob: new Date(1982, 3, 29) },
  { emoji: "👩", name: "Viviane", dob: new Date(1981, 3, 22) },
  { emoji: "👦", name: "Dimitri", dob: new Date(2012, 0, 2) },
] as const;

const ARRIVAL_AU = new Date(2015, 0, 23);

// `month` here is human form (1-12) to match `nextAnniversary`.
const COUNTDOWNS = [
  { emoji: "🎄", label: "Christmas", month: 12, day: 25 },
  { emoji: "🎆", label: "New Year", month: 1, day: 1 },
  { emoji: "🎂", label: "Fabricio", month: 4, day: 29 },
  { emoji: "🎂", label: "Viviane", month: 4, day: 22 },
  { emoji: "🎂", label: "Dimitri", month: 1, day: 2 },
] as const;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

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

// Single-line transit row: ☉ Sun — Gemini 8°
function TransitRow({ body }: { body: TransitBody }) {
  return (
    <div className="flex items-baseline gap-1.5 py-0.5 text-[10px] leading-none">
      <span className="w-3.5 shrink-0 text-center text-[11px] text-white/70">
        {body.symbol}
      </span>
      <span className="w-[2.6rem] shrink-0 font-medium text-white/85">
        {body.name}
      </span>
      <span className="shrink-0 text-white/25">—</span>
      <span className="font-medium text-[color:var(--accent-2)]">
        {body.sign}
      </span>
      <span className="shrink-0 text-[9px] text-white/45 num-tabular">
        {body.degree}°
      </span>
    </div>
  );
}

export function RelativeTimeWidget() {
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

  if (!today) return null;

  const season = currentSeason(today);
  const next = daysUntilNextSeason(today);

  return (
    <Card>
      <CardContent className="flex h-full flex-col py-3">
        <div className="mb-2 flex items-center gap-2">
          <Hourglass
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Relative Time
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-2">
          {/* Time on Earth — hairline marks the end of the section */}
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

          {/* Countdowns — hairline marks the end of the section */}
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
