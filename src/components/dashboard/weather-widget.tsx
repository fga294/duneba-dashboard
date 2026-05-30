"use client";

import { createElement } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Droplets,
  Wind,
  Thermometer,
  CloudSun,
  Sun,
  Eye,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { getWeatherIcon } from "@/lib/weather-icons";
import { formatTemp, tempColor } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { WeatherData } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// US EPA index: 1 Good, 2 Moderate, 3 Unhealthy (sensitive), 4 Unhealthy, 5 Very Unhealthy, 6 Hazardous
const AQI_LABELS = ["—", "Good", "Mod", "Unhlth*", "Unhlth", "V.Unhlth", "Hazard"];
const AQI_COLORS = [
  "oklch(0.65 0 0 / 0.7)",
  "oklch(0.78 0.16 145)",
  "oklch(0.85 0.15 95)",
  "oklch(0.78 0.16 60)",
  "oklch(0.7 0.2 25)",
  "oklch(0.6 0.22 340)",
  "oklch(0.45 0.18 25)",
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

// One cell of the 2×3 middle stats grid. `icon` arrives as a prop (a lucide
// component), so rendering <Icon/> is a prop render — not a render-scope
// component definition — and stays clear of react-hooks/static-components.
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
  // When set (AQI), tints the icon + value to carry the air-quality semantics.
  color?: string;
  // CSS gradient stop list for the gauge, best→worst left→right.
  gradient: string;
  // Marker position 0–1; clamped to [2%, 98%] so it never clips the edge.
  fraction: number;
}) {
  const left = Math.min(98, Math.max(2, fraction * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-white/65">
        <Icon
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={color ? { color } : undefined}
        />
        <span className="text-white/55">{label}</span>
        <span
          className="font-mono text-white/85 num-tabular"
          style={color ? { color } : undefined}
        >
          {value}
        </span>
      </div>
      <div
        className="relative h-[3px] w-full rounded-full"
        style={{ background: `linear-gradient(to right, ${gradient})` }}
      >
        <span
          className="absolute top-1/2 h-[7px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ left: `${left}%`, boxShadow: "0 0 4px oklch(0 0 0 / 0.7)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function WeatherWidget() {
  const { data, isLoading, error } = useSWR<WeatherData>(
    "/api/weather",
    fetcher,
    { refreshInterval: 30 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-1 flex-col py-2">
          <Skeleton className="h-40 w-full flex-1 rounded-2xl bg-white/[0.04]" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-white/50">
          Weather unavailable
        </CardContent>
      </Card>
    );
  }

  // Lowercase + createElement: getWeatherIcon returns a stable lucide component
  // from a lookup table, but rendering it as <PascalCase/> from a render-scope
  // variable trips react-hooks/static-components. This renders it safely.
  const currentIcon = getWeatherIcon(
    data.current.condition_code,
    data.current.is_day
  );

  return (
    <Card>
      <CardContent className="flex flex-1 flex-col py-2">
        <div className="mb-1.5 flex items-center gap-2">
          <CloudSun
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Weather · {data.location}
          </p>
        </div>

        {/* Three vertically-centred zones: forecast · stats grid · current.
            justify-between drops the stats grid into the gap between the
            forecast row and the current-conditions block. */}
        <div className="flex flex-1 items-center justify-between gap-4 px-1">
          {/* Zone 1 — 3-day forecast (unchanged), natural width */}
          <div className="flex items-center gap-2.5">
            {data.forecast.map((day) => {
              const DayIcon = getWeatherIcon(day.condition_code, true);
              return (
                <div
                  key={day.date}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-white/[0.05] hover:ring-white/[0.1]"
                >
                  <DayIcon
                    className="h-12 w-12 shrink-0 text-[color:var(--accent-1)]"
                    strokeWidth={1.5}
                    style={{
                      filter:
                        "drop-shadow(0 0 16px oklch(0.72 0.18 250 / 0.6))",
                    }}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                      {format(parseISO(day.date), "EEE")}
                    </span>
                    <div className="flex items-stretch gap-2">
                      <div className="flex flex-col gap-0.5 font-mono num-tabular leading-tight">
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-[10px] uppercase tracking-[0.18em]"
                            style={{
                              color: tempColor(day.mintemp_c),
                              opacity: 0.7,
                            }}
                          >
                            Low
                          </span>
                          <span
                            className="text-[14px] font-medium"
                            style={{
                              color: tempColor(day.mintemp_c),
                              textShadow: `0 0 10px ${tempColor(day.mintemp_c)}40`,
                            }}
                          >
                            {formatTemp(day.mintemp_c)}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-[10px] uppercase tracking-[0.18em]"
                            style={{
                              color: tempColor(day.maxtemp_c),
                              opacity: 0.7,
                            }}
                          >
                            High
                          </span>
                          <span
                            className="text-[16px] font-semibold"
                            style={{
                              color: tempColor(day.maxtemp_c),
                              textShadow: `0 0 14px ${tempColor(day.maxtemp_c)}55`,
                            }}
                          >
                            {formatTemp(day.maxtemp_c)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="w-px self-stretch bg-white/[0.1]"
                        aria-hidden
                      />
                      <span className="line-clamp-2 max-w-[12ch] self-center text-[11px] leading-tight capitalize text-white/65">
                        {day.condition}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zone 2 — 2×3 stats grid filling the middle gap */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            <Stat
              icon={Thermometer}
              label="Feels"
              value={formatTemp(data.current.feelslike_c)}
              gradient={GAUGE.feels}
              fraction={(data.current.feelslike_c + 10) / 60}
            />
            <Stat
              icon={Droplets}
              label="Humidity"
              value={`${data.current.humidity}%`}
              gradient={GAUGE.humidity}
              fraction={data.current.humidity / 100}
            />
            <Stat
              icon={Wind}
              label="Wind"
              value={`${Math.round(data.current.wind_kph)} km/h`}
              gradient={GAUGE.wind}
              fraction={data.current.wind_kph / 100}
            />
            <Stat
              icon={Sun}
              label="UV"
              value={`${Math.round(data.current.uv)}`}
              gradient={GAUGE.uv}
              fraction={Math.min(data.current.uv, 11) / 11}
            />
            <Stat
              icon={Eye}
              label="Visibility"
              value={`${Math.round(data.current.vis_km)} km`}
              gradient={GAUGE.visibility}
              fraction={Math.min(data.current.vis_km, 20) / 20}
            />
            <Stat
              icon={Leaf}
              label="AQI"
              value={aqiLabel(data.current.air_quality_index)}
              color={aqiColor(data.current.air_quality_index)}
              gradient={GAUGE.aqi}
              fraction={
                Math.min(aqiGaugeValue(data.current.air_quality_index), 200) / 200
              }
            />
          </div>

          {/* Zone 3 — current conditions; AQI tucked under the temp/label */}
          <div className="flex items-center gap-2.5 self-center">
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.13 195 / 0.18) 0%, oklch(0.72 0.18 250 / 0.12) 100%)",
                boxShadow:
                  "inset 0 1px 0 0 oklch(1 0 0 / 0.1), inset 0 0 0 0.5px oklch(1 0 0 / 0.08)",
              }}
            >
              <div
                className="absolute -inset-2 rounded-2xl opacity-60 blur-2xl"
                style={{
                  background:
                    "radial-gradient(closest-side, oklch(0.82 0.13 195 / 0.35), transparent 70%)",
                }}
                aria-hidden
              />
              {createElement(currentIcon, {
                className: "relative h-6 w-6 text-[color:var(--accent-2)]",
                strokeWidth: 1.5,
              })}
            </div>
            <div>
              <div
                className="font-mono text-[44px] font-light leading-none text-white num-tabular"
                style={{ letterSpacing: "-0.05em" }}
              >
                {formatTemp(data.current.temp_c)}
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-white/70">
                {data.current.condition}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
