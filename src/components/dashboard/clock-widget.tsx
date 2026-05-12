"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { sydneyTime } from "@/lib/utils";
import { MapPin } from "lucide-react";

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(sydneyTime());
    const interval = setInterval(() => setNow(sydneyTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            <MapPin
              className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
              strokeWidth={1.75}
            />
            <span>Sydney · AEST</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--accent-1)] opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--accent-1)]" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
              Live
            </span>
          </div>
        </div>
        <div className="my-5 flex items-baseline gap-1.5">
          <span
            className="font-mono text-[64px] font-medium leading-none text-white num-tabular"
            style={{ letterSpacing: "-0.04em" }}
          >
            {format(now, "HH:mm")}
          </span>
          <span className="font-mono text-2xl font-light text-white/45 num-tabular">
            {format(now, "ss")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white/70">
            {format(now, "EEEE")}
          </div>
          <div className="text-sm text-white/45 num-tabular">
            {format(now, "d MMM yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
