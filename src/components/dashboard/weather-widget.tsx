"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Wind, Thermometer, Sunrise, Sunset, CloudSun } from "lucide-react";
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

  const CurrentIcon = getWeatherIcon(
    data.current.condition_code,
    data.current.is_day
  );

  const { astronomy } = data;
  const isWaning = /waning|last quarter/i.test(astronomy.moon_phase);
  const lit = Math.max(0, Math.min(100, astronomy.moon_illumination)) / 100;
  const terminator = (1 - lit) * 100;

  return (
    <Card>
      <CardContent className="py-1">
        <div className="mb-1.5 flex items-center gap-2">
          <CloudSun
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Weather · {data.location}
          </p>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-center justify-center gap-3 px-2">
            {data.forecast.map((day) => {
              const DayIcon = getWeatherIcon(day.condition_code, true);
              return (
                <div
                  key={day.date}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-white/[0.03] px-2.5 py-2 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-white/[0.05] hover:ring-white/[0.1]"
                >
                  <DayIcon
                    className="h-12 w-12 shrink-0 text-[color:var(--accent-1)]"
                    strokeWidth={1.5}
                    style={{
                      filter:
                        "drop-shadow(0 0 16px oklch(0.72 0.18 250 / 0.6))",
                    }}
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                      {format(parseISO(day.date), "EEE")}
                    </span>
                    <div className="flex flex-col gap-0.5 font-mono num-tabular leading-tight">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="text-[9px] uppercase tracking-[0.18em]"
                          style={{
                            color: tempColor(day.mintemp_c),
                            opacity: 0.7,
                          }}
                        >
                          Low
                        </span>
                        <span
                          className="text-[13px] font-medium"
                          style={{
                            color: tempColor(day.mintemp_c),
                            textShadow: `0 0 10px ${tempColor(day.mintemp_c)}40`,
                          }}
                        >
                          {formatTemp(day.mintemp_c)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="text-[9px] uppercase tracking-[0.18em]"
                          style={{
                            color: tempColor(day.maxtemp_c),
                            opacity: 0.7,
                          }}
                        >
                          High
                        </span>
                        <span
                          className="text-[15px] font-semibold"
                          style={{
                            color: tempColor(day.maxtemp_c),
                            textShadow: `0 0 14px ${tempColor(day.maxtemp_c)}55`,
                          }}
                        >
                          {formatTemp(day.maxtemp_c)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ml-3 flex items-center gap-3 self-center border-l border-white/[0.06] pl-3">
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
                className="font-mono text-[48px] font-light leading-none text-white num-tabular"
                style={{ letterSpacing: "-0.05em" }}
              >
                {formatTemp(data.current.temp_c)}
              </div>
              <div className="mt-1 text-[14px] font-medium text-white/70">
                {data.current.condition}
              </div>
            </div>
          </div>

          <div className="ml-4 flex flex-col gap-2.5 self-center border-l border-white/[0.06] pl-4 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" strokeWidth={1.5} />
              <span>
                Feels{" "}
                <span className="font-mono text-white/80 num-tabular">
                  {formatTemp(data.current.feelslike_c)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/80 num-tabular">
                  {data.current.humidity}%
                </span>{" "}
                humidity
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <span className="font-mono text-white/80 num-tabular">
                  {Math.round(data.current.wind_kph)}
                </span>{" "}
                km/h
              </span>
            </div>
          </div>

          {/* Moon phase + sunrise/sunset */}
          <div className="ml-4 flex flex-col items-center gap-2 border-l border-white/[0.06] pl-4">
            <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-full opacity-60 blur-lg"
                style={{
                  background:
                    "radial-gradient(closest-side, oklch(0.78 0.12 195 / 0.3), transparent 70%)",
                }}
                aria-hidden
              />
              <div
                role="img"
                aria-label={`${astronomy.moon_phase}, ${astronomy.moon_illumination}% illuminated`}
                className="relative h-10 w-10 overflow-hidden rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, oklch(0.95 0.01 250) 0%, oklch(0.78 0.02 250) 55%, oklch(0.55 0.02 250) 100%)",
                  boxShadow:
                    "inset 0 0 12px oklch(0 0 0 / 0.35), 0 4px 12px oklch(0 0 0 / 0.4)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute h-1 w-1 rounded-full opacity-30"
                  style={{ top: "32%", left: "40%", background: "oklch(0 0 0)" }}
                />
                <span
                  aria-hidden
                  className="absolute h-[3px] w-[3px] rounded-full opacity-25"
                  style={{ top: "55%", left: "30%", background: "oklch(0 0 0)" }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "oklch(0.08 0.01 265)",
                    transform: isWaning
                      ? `translateX(-${terminator}%)`
                      : `translateX(${terminator}%)`,
                    transition: "transform 600ms cubic-bezier(0.2,0.8,0.2,1)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: "inset 0 0 0 0.5px oklch(1 0 0 / 0.18)" }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[13px] text-white/60">
              <div className="flex items-center gap-2">
                <Sunrise
                  className="h-4 w-4 text-[color:var(--accent-2)]"
                  strokeWidth={1.5}
                />
                <span className="num-tabular">{astronomy.sunrise}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sunset
                  className="h-4 w-4 text-[color:var(--accent-1)]"
                  strokeWidth={1.5}
                />
                <span className="num-tabular">{astronomy.sunset}</span>
              </div>
            </div>
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/65">
              {astronomy.moon_phase}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
