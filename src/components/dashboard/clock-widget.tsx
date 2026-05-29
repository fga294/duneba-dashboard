"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { sydneyTime } from "@/lib/utils";
import { MapPin } from "lucide-react";

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(sydneyTime());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  return (
    <Card>
      <CardContent className="relative flex h-full items-end justify-center pt-1.5 pb-3">
        <div className="pointer-events-none absolute inset-x-6 top-2 flex items-center justify-between">
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
        <div className="flex w-full items-center">
          <div className="flex w-full flex-col items-center gap-1">
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-[90px] font-medium leading-none text-white num-tabular"
                style={{ letterSpacing: "-0.04em" }}
              >
                {format(now, "HH:mm")}
              </span>
              <span className="font-mono text-[28px] font-light leading-none text-white/45 num-tabular">
                {format(now, "ss")}
              </span>
            </div>
            <div className="whitespace-nowrap text-base font-medium text-white/65 num-tabular">
              {format(now, "EEEE d MMMM yyyy")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
