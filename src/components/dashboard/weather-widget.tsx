"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
      <Card className="col-span-1 lg:col-span-2">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
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
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Weather — {data.location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current conditions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CurrentIcon className="h-12 w-12 text-yellow-400" />
            <div>
              <div className="text-4xl font-bold">
                {formatTemp(data.current.temp_c)}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.current.condition}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              Feels {formatTemp(data.current.feelslike_c)}
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              {data.current.humidity}%
            </div>
            <div className="flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {Math.round(data.current.wind_kph)} km/h
            </div>
          </div>
        </div>

        {/* 3-day forecast */}
        <div className="grid grid-cols-3 gap-2">
          {data.forecast.map((day) => {
            const DayIcon = getWeatherIcon(day.condition_code, true);
            return (
              <div
                key={day.date}
                className="flex flex-col items-center rounded-lg bg-secondary/50 p-3"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {format(parseISO(day.date), "EEE")}
                </span>
                <DayIcon className="my-1.5 h-6 w-6" />
                <div className="flex gap-1 text-xs">
                  <span className="font-medium">
                    {formatTemp(day.maxtemp_c)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTemp(day.mintemp_c)}
                  </span>
                </div>
                {day.chance_of_rain > 0 && (
                  <Badge
                    variant="secondary"
                    className="mt-1 text-[10px] px-1.5 py-0"
                  >
                    <Droplets className="mr-0.5 h-2.5 w-2.5" />
                    {day.chance_of_rain}%
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
