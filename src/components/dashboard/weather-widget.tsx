"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Wind, Thermometer } from "lucide-react";
import { getWeatherIcon } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { WeatherData } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

export function WeatherWidget() {
  const { data, isLoading, error } = useSWR<WeatherData>(
    "/api/weather",
    fetcher,
    { refreshInterval: 30 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 py-2">
          <Skeleton className="h-28 w-full rounded-2xl bg-white/[0.04]" />
          <div className="flex gap-3">
            <Skeleton className="h-28 flex-1 rounded-2xl bg-white/[0.04]" />
            <Skeleton className="h-28 flex-1 rounded-2xl bg-white/[0.04]" />
            <Skeleton className="h-28 flex-1 rounded-2xl bg-white/[0.04]" />
          </div>
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
      <CardContent className="py-2">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
              Weather · {data.location}
            </p>
            <div className="mt-4 flex items-center gap-5">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
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
                  className="relative h-9 w-9 text-[color:var(--accent-2)]"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <div
                  className="font-mono text-[72px] font-light leading-none text-white num-tabular"
                  style={{ letterSpacing: "-0.05em" }}
                >
                  {formatTemp(data.current.temp_c)}
                </div>
                <div className="mt-1.5 text-sm font-medium text-white/65">
                  {data.current.condition}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 text-xs text-white/55">
            <div className="flex items-center gap-2">
              <Thermometer className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                Feels{" "}
                <span className="font-mono text-white/80 num-tabular">
                  {formatTemp(data.current.feelslike_c)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/80 num-tabular">
                  {data.current.humidity}%
                </span>{" "}
                humidity
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/80 num-tabular">
                  {Math.round(data.current.wind_kph)}
                </span>{" "}
                km/h
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {data.forecast.map((day) => {
            const DayIcon = getWeatherIcon(day.condition_code, true);
            return (
              <div
                key={day.date}
                className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl bg-white/[0.03] px-3 py-4 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-white/[0.05] hover:ring-white/[0.1]"
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
                  {format(parseISO(day.date), "EEE")}
                </span>
                <DayIcon
                  className="h-7 w-7 text-[color:var(--accent-1)]"
                  strokeWidth={1.5}
                  style={{
                    filter:
                      "drop-shadow(0 0 12px oklch(0.72 0.18 250 / 0.45))",
                  }}
                />
                <div className="flex items-baseline gap-1.5 font-mono num-tabular">
                  <span className="text-sm font-medium text-white">
                    {formatTemp(day.maxtemp_c)}
                  </span>
                  <span className="text-xs text-white/40">
                    {formatTemp(day.mintemp_c)}
                  </span>
                </div>
                {day.chance_of_rain > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-[color:var(--accent-2)]">
                    <Droplets className="h-2.5 w-2.5" strokeWidth={1.75} />
                    <span className="num-tabular">{day.chance_of_rain}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
