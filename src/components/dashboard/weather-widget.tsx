"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Wind, Thermometer, CloudSun, Sun, Gauge, Eye, Leaf } from "lucide-react";
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

  const CurrentIcon = getWeatherIcon(
    data.current.condition_code,
    data.current.is_day
  );

  return (
    <Card>
      <CardContent className="flex flex-1 flex-col py-1">
        <div className="mb-1.5 flex items-center gap-2">
          <CloudSun
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Weather · {data.location}
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-1 items-center justify-start gap-2.5 px-2">
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

            <div className="ml-2 flex items-center gap-2.5 self-center">
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
                <CurrentIcon
                  className="relative h-6 w-6 text-[color:var(--accent-2)]"
                  strokeWidth={1.5}
                />
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

          <div className="flex items-center justify-around gap-2 rounded-lg border-t border-white/[0.06] pt-2 text-xs text-white/65">
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4" strokeWidth={1.5} />
              <span>
                Feels{" "}
                <span className="font-mono text-white/85 num-tabular">
                  {formatTemp(data.current.feelslike_c)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/85 num-tabular">
                  {data.current.humidity}%
                </span>{" "}
                humidity
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/85 num-tabular">
                  {Math.round(data.current.wind_kph)}
                </span>{" "}
                km/h
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sun className="h-4 w-4" strokeWidth={1.5} />
              <span>
                UV{" "}
                <span className="font-mono text-white/85 num-tabular">
                  {Math.round(data.current.uv)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/85 num-tabular">
                  {Math.round(data.current.pressure_mb)}
                </span>{" "}
                hPa
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/85 num-tabular">
                  {Math.round(data.current.vis_km)}
                </span>{" "}
                km
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Leaf
                className="h-4 w-4"
                strokeWidth={1.5}
                style={{ color: aqiColor(data.current.air_quality_index) }}
              />
              <span>
                AQI{" "}
                <span
                  className="font-mono num-tabular"
                  style={{ color: aqiColor(data.current.air_quality_index) }}
                >
                  {aqiLabel(data.current.air_quality_index)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
