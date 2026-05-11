"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sunrise, Sunset } from "lucide-react";
import type { WeatherData } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface MoonProps {
  phase: string;
  illumination: number;
}

function MoonDisc({ phase, illumination }: MoonProps) {
  // 0 = New (fully dark), 100 = Full (fully bright).
  // Waning phases need the shadow on the LEFT side, waxing on the RIGHT.
  const isWaning = /waning|last quarter|waning gibbous|waning crescent/i.test(phase);
  const lit = Math.max(0, Math.min(100, illumination)) / 100;

  // Compute terminator offset: full = 0, new = 100% of radius
  const terminator = (1 - lit) * 100;

  return (
    <div className="relative">
      {/* Outer glow */}
      <div
        className="absolute -inset-6 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.78 0.12 195 / 0.35), transparent 70%)",
        }}
        aria-hidden
      />
      {/* Moon disc */}
      <div
        role="img"
        aria-label={`${phase}, ${illumination}% illuminated`}
        className="relative h-28 w-28 overflow-hidden rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.95 0.01 250) 0%, oklch(0.78 0.02 250) 55%, oklch(0.55 0.02 250) 100%)",
          boxShadow:
            "inset 0 0 24px oklch(0 0 0 / 0.35), 0 8px 32px oklch(0 0 0 / 0.4)",
        }}
      >
        {/* Crater texture */}
        <span
          aria-hidden
          className="absolute h-3 w-3 rounded-full opacity-30"
          style={{ top: "32%", left: "40%", background: "oklch(0 0 0)" }}
        />
        <span
          aria-hidden
          className="absolute h-2 w-2 rounded-full opacity-25"
          style={{ top: "55%", left: "30%", background: "oklch(0 0 0)" }}
        />
        <span
          aria-hidden
          className="absolute h-1.5 w-1.5 rounded-full opacity-20"
          style={{ top: "45%", left: "55%", background: "oklch(0 0 0)" }}
        />
        {/* Shadow terminator — slides to reveal phase */}
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
        {/* Soft rim light */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: "inset 0 0 0 0.5px oklch(1 0 0 / 0.18)",
          }}
        />
      </div>
    </div>
  );
}

export function MoonPhaseWidget() {
  const { data, isLoading } = useSWR<WeatherData>("/api/weather", fetcher, {
    refreshInterval: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-2">
          <Skeleton className="h-40 w-full rounded-2xl bg-white/[0.04]" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { astronomy } = data;

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between py-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
          Tonight&apos;s Sky
        </p>

        <div className="my-5 flex flex-col items-center">
          <MoonDisc
            phase={astronomy.moon_phase}
            illumination={astronomy.moon_illumination}
          />
          <div className="mt-5 text-base font-medium tracking-tight text-white">
            {astronomy.moon_phase}
          </div>
          <div className="mt-1 text-xs text-white/45 num-tabular">
            {astronomy.moon_illumination}% illuminated
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-white/55">
          <div className="flex items-center gap-1.5">
            <Sunrise
              className="h-3.5 w-3.5 text-[color:var(--accent-2)]"
              strokeWidth={1.5}
            />
            <span className="num-tabular">{astronomy.sunrise}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunset
              className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
              strokeWidth={1.5}
            />
            <span className="num-tabular">{astronomy.sunset}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
