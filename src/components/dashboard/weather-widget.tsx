"use client";

import { createElement } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CloudSun } from "lucide-react";
import { getWeatherIcon } from "@/lib/weather-icons";
import { formatTemp, tempColor } from "@/lib/utils";
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

        {/* Two vertically-centred zones: 3-day forecast · current conditions. */}
        <div className="flex flex-1 items-center justify-between gap-4 px-1">
          {/* Zone 1 — 3-day forecast */}
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

          {/* Zone 2 — current conditions: icon + temperature + condition label */}
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
