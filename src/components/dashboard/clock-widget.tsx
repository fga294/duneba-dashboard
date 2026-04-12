"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { sydneyTime } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(sydneyTime());
    const interval = setInterval(() => setNow(sydneyTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  return (
    <Card className="col-span-1">
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span>Sydney, Australia</span>
        </div>
        <div className="text-5xl font-bold tabular-nums tracking-tight">
          {format(now, "HH:mm")}
        </div>
        <div className="text-2xl font-light tabular-nums text-muted-foreground">
          {format(now, "ss")}
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          {format(now, "EEEE, d MMMM yyyy")}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          <span>AEST</span>
        </div>
      </CardContent>
    </Card>
  );
}
