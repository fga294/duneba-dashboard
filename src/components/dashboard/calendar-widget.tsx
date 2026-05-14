"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, MapPin } from "lucide-react";
import { format, isToday, parseISO, startOfDay, addDays } from "date-fns";
import type { CalendarEvent } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// Google Calendar's 11 color IDs, retuned for dark glass.
const EVENT_COLORS: Record<string, string> = {
  default: "oklch(0.72 0.18 250)",
  "1": "oklch(0.75 0.14 300)",
  "2": "oklch(0.78 0.12 150)",
  "3": "oklch(0.68 0.20 310)",
  "4": "oklch(0.76 0.17 15)",
  "5": "oklch(0.85 0.15 90)",
  "6": "oklch(0.78 0.18 55)",
  "7": "oklch(0.78 0.13 215)",
  "8": "oklch(0.7 0.02 265)",
  "9": "oklch(0.72 0.18 250)",
  "10": "oklch(0.72 0.15 155)",
  "11": "oklch(0.72 0.22 25)",
};

function eventColor(colorId: string): string {
  return EVENT_COLORS[colorId] ?? EVENT_COLORS.default;
}

function dayHeader(date: Date): { label: string; sub: string; isToday: boolean } {
  return {
    label: isToday(date) ? "Today" : format(date, "EEE"),
    sub: format(date, "MMM d"),
    isToday: isToday(date),
  };
}

export function CalendarWidget() {
  const { data, isLoading, error } = useSWR<CalendarEvent[]>(
    "/api/calendar",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card className="lg:flex-1">
        <CardContent className="flex flex-1 flex-col py-2">
          <Skeleton className="h-full w-full rounded-2xl bg-white/[0.04]" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="lg:flex-1">
        <CardContent className="flex items-center justify-center py-10 text-white/50">
          Calendar unavailable
        </CardContent>
      </Card>
    );
  }

  const events = data || [];
  const today = startOfDay(new Date());
  const daySlots = Array.from({ length: 5 }, (_, i) => addDays(today, i));

  // Partition events for each day; sort timed events ascending by start.
  const eventsByDay = daySlots.map((day) => {
    const next = addDays(day, 1);
    const dayEvents = events.filter((e) => {
      const start = parseISO(e.start);
      return start >= day && start < next;
    });
    const timed = dayEvents
      .filter((e) => !e.allDay)
      .sort(
        (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()
      );
    return {
      day,
      timed,
      allDay: dayEvents.filter((e) => e.allDay),
    };
  });

  return (
    <Card className="lg:flex-1">
      <CardContent className="flex flex-1 flex-col py-2">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Calendar · Next 5 days
          </p>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-5 gap-1.5">
          {daySlots.map((day) => {
            const h = dayHeader(day);
            return (
              <div
                key={day.toISOString()}
                className="flex items-baseline justify-between px-1"
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    h.isToday
                      ? "text-[color:var(--accent-1)]"
                      : "text-white/80"
                  }`}
                  style={
                    h.isToday
                      ? { textShadow: "0 0 12px oklch(0.72 0.18 250 / 0.5)" }
                      : undefined
                  }
                >
                  {h.label}
                </span>
                <span className="text-[10px] text-white/40 num-tabular">
                  {h.sub}
                </span>
              </div>
            );
          })}
        </div>

        {/* Day columns: events stacked top-down, earliest first */}
        <div className="grid flex-1 grid-cols-5 gap-1.5">
          {eventsByDay.map(({ day, timed, allDay }) => (
            <div
              key={day.toISOString()}
              className="flex flex-col gap-2 overflow-hidden rounded-lg bg-white/[0.015] p-2 ring-1 ring-white/[0.04]"
            >
              {allDay.map((event) => {
                const color = eventColor(event.color);
                return (
                  <div
                    key={event.id}
                    className="relative flex min-h-[96px] flex-col justify-center overflow-hidden rounded-lg px-3 py-4 ring-1 ring-white/[0.08]"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in oklch, ${color} 22%, oklch(0.14 0.02 265)) 0%, color-mix(in oklch, ${color} 8%, oklch(0.14 0.02 265)) 100%)`,
                      boxShadow: `inset 2px 0 0 0 ${color}`,
                    }}
                    title={`${event.summary} · All day`}
                  >
                    <div className="line-clamp-3 pl-1.5 text-[15px] font-semibold leading-snug text-white">
                      {event.summary}
                    </div>
                    {event.location && (
                      <div className="mt-1 flex items-center gap-1 pl-1.5 text-white/60">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        <span className="truncate text-[11px]" title={event.location}>
                          {event.location}
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 pl-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                      All day
                    </div>
                  </div>
                );
              })}

              {timed.map((event) => {
                const color = eventColor(event.color);
                const start = parseISO(event.start);
                const end = parseISO(event.end);
                return (
                  <div
                    key={event.id}
                    className="group relative overflow-hidden rounded-lg ring-1 ring-white/[0.08] transition-all duration-300 hover:ring-white/[0.18]"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in oklch, ${color} 22%, oklch(0.14 0.02 265)) 0%, color-mix(in oklch, ${color} 8%, oklch(0.14 0.02 265)) 100%)`,
                      boxShadow: `inset 2px 0 0 0 ${color}`,
                    }}
                    title={`${event.summary} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`}
                  >
                    <div className="flex min-h-[96px] flex-col justify-center px-3 py-4">
                      <div className="line-clamp-3 pl-1.5 text-[15px] font-semibold leading-snug text-white">
                        {event.summary}
                      </div>
                      {event.location && (
                        <div className="mt-1 flex items-center gap-1 pl-1.5 text-white/60">
                          <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          <span className="truncate text-[11px]" title={event.location}>
                            {event.location}
                          </span>
                        </div>
                      )}
                      <div className="mt-1.5 pl-1.5 truncate font-mono text-[11px] text-white/60 num-tabular">
                        {format(start, "h:mm a")} – {format(end, "h:mm a")}
                      </div>
                    </div>
                  </div>
                );
              })}

              {timed.length === 0 && allDay.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-[10px] text-white/25">
                  —
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
