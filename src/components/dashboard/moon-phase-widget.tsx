"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sunrise, Sunset } from "lucide-react";
import { getMoonEmoji } from "@/lib/weather-icons";
import type { WeatherData } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MoonPhaseWidget() {
  const { data, isLoading } = useSWR<WeatherData>("/api/weather", fetcher, {
    refreshInterval: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardContent className="p-6">
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { astronomy } = data;

  return (
    <Card className="col-span-1">
      <CardContent className="flex flex-col items-center justify-center p-6">
        <span
          className="text-5xl"
          role="img"
          aria-label={astronomy.moon_phase}
        >
          {getMoonEmoji(astronomy.moon_phase)}
        </span>
        <div className="mt-2 text-sm font-medium">{astronomy.moon_phase}</div>
        <div className="text-xs text-muted-foreground">
          {astronomy.moon_illumination}% illumination
        </div>
        <div className="mt-3 flex w-full justify-around text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Sunrise className="h-3.5 w-3.5 text-amber-400" />
            {astronomy.sunrise}
          </div>
          <div className="flex items-center gap-1">
            <Sunset className="h-3.5 w-3.5 text-orange-400" />
            {astronomy.sunset}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
