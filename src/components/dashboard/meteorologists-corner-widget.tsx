"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Droplets,
  Wind,
  Thermometer,
  Gauge,
  Sun,
  Eye,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { formatTemp } from "@/lib/utils";
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

// One metric row: icon + label + value over a gradient gauge bar. `icon` arrives
// as a prop (a lucide component), so rendering <Icon/> is a prop render — not a
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
          className="ml-auto font-mono text-white/85 num-tabular"
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

export function MeteorologistsCornerWidget() {
  const { data, isLoading, error } = useSWR<WeatherData>(
    "/api/weather",
    fetcher,
    { refreshInterval: 30 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-2">
          <Skeleton className="h-40 w-full rounded-2xl bg-white/[0.04]" />
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

  const { current } = data;

  return (
    <Card>
      <CardContent className="flex h-full flex-col py-4">
        <div className="mb-2 flex items-center gap-2">
          <Gauge
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Meteorologists Corner
          </p>
        </div>

        {/* Two columns of three — compact instrument panel, reduced height. */}
        <div className="grid flex-1 grid-cols-2 content-center gap-x-6 gap-y-3">
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
      </CardContent>
    </Card>
  );
}
