"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
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

const DEFAULT_START_HOUR = 6; // 6 AM
const DEFAULT_END_HOUR = 22; // 10 PM

function minutesIntoGrid(date: Date, startHour: number): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return (hours - startHour) * 60 + minutes;
}

function eventPosition(
  start: Date,
  end: Date,
  startHour: number,
  hours: number
) {
  const totalMin = hours * 60;
  const startMin = Math.max(0, minutesIntoGrid(start, startHour));
  const endMin = Math.min(totalMin, minutesIntoGrid(end, startHour));
  const top = (startMin / totalMin) * 100;
  const height = Math.max(2, ((endMin - startMin) / totalMin) * 100);
  return { top: `${top}%`, height: `${height}%` };
}

function formatHourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
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

  // Partition events for each day into timed vs all-day
  const eventsByDay = daySlots.map((day) => {
    const next = addDays(day, 1);
    const dayEvents = events.filter((e) => {
      const start = parseISO(e.start);
      return start >= day && start < next;
    });
    return {
      day,
      timed: dayEvents.filter((e) => !e.allDay),
      allDay: dayEvents.filter((e) => e.allDay),
    };
  });

  // Dynamic time range: extend the default 6 AM – 10 PM window to cover
  // any earlier or later event in the visible 5 days.
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const { timed } of eventsByDay) {
    for (const event of timed) {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      const startH = start.getHours() + start.getMinutes() / 60;
      const endH = end.getHours() + end.getMinutes() / 60;
      // Treat an event ending exactly at midnight as ending at 24, not 0
      const effectiveEnd =
        endH === 0 && end.getDate() !== start.getDate() ? 24 : endH;
      startHour = Math.min(startHour, Math.floor(startH));
      // Reserve a 1-hour buffer below the latest event so its bottom edge
      // isn't pressed flush against the grid (and visually clipped).
      endHour = Math.max(endHour, Math.ceil(effectiveEnd) + 1);
    }
  }
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, endHour);
  const hours = endHour - startHour;
  // Hour labels: every 2 hours, including the start/end edges
  const hourLabels = Array.from(
    { length: Math.floor(hours / 2) + 1 },
    (_, i) => startHour + i * 2
  );

  const maxAllDay = Math.max(0, ...eventsByDay.map((d) => d.allDay.length));

  return (
    <Card className="lg:flex-1">
      <CardContent className="flex flex-1 flex-col py-2">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Calendar · Next 5 days
          </p>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-[36px_repeat(5,minmax(0,1fr))] gap-1.5">
          <div />
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

        {/* All-day strip (only if any day has an all-day event) */}
        {maxAllDay > 0 && (
          <div
            className="mb-2 grid grid-cols-[36px_repeat(5,minmax(0,1fr))] gap-1.5 border-b border-white/[0.06] pb-2"
          >
            <div className="flex items-start justify-end pr-1 pt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-white/35">
              All
            </div>
            {eventsByDay.map(({ day, allDay }) => (
              <div key={day.toISOString()} className="flex flex-col gap-1">
                {allDay.map((event) => {
                  const color = eventColor(event.color);
                  return (
                    <div
                      key={event.id}
                      className="relative overflow-hidden rounded-md px-2 py-1 text-[11px] font-medium text-white ring-1 ring-white/[0.06]"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in oklch, ${color} 14%, oklch(1 0 0 / 0.04)) 0%, oklch(1 0 0 / 0.04) 100%)`,
                      }}
                    >
                      <div
                        className="absolute inset-y-1 left-0 w-[2px] rounded-full"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                        aria-hidden
                      />
                      <span className="block truncate pl-1.5">
                        {event.summary}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="relative grid flex-1 grid-cols-[36px_repeat(5,minmax(0,1fr))] gap-1.5">
          {/* Time axis */}
          <div className="relative">
            {hourLabels.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 font-mono text-[10px] text-white/35 num-tabular"
                style={{ top: `${((h - startHour) / hours) * 100}%` }}
              >
                {formatHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {eventsByDay.map(({ day, timed }) => (
            <div
              key={day.toISOString()}
              className="relative overflow-hidden rounded-lg bg-white/[0.015] ring-1 ring-white/[0.04]"
            >
              {/* Horizontal hour gridlines (every 2 hours, matching labels) */}
              {hourLabels.map((h, i) => (
                <div
                  key={h}
                  className="pointer-events-none absolute inset-x-0 border-t border-white/[0.04]"
                  style={{
                    top: `${((h - startHour) / hours) * 100}%`,
                    opacity: i === 0 || i === hourLabels.length - 1 ? 0 : 1,
                  }}
                  aria-hidden
                />
              ))}

              {/* Today's "now" line */}
              {isToday(day) && (
                <NowLine startHour={startHour} hours={hours} />
              )}

              {/* Events */}
              {timed.map((event) => {
                const color = eventColor(event.color);
                const start = parseISO(event.start);
                const end = parseISO(event.end);
                const pos = eventPosition(start, end, startHour, hours);
                return (
                  <div
                    key={event.id}
                    className="group absolute left-1 right-1 overflow-hidden rounded-md ring-1 ring-white/[0.08] transition-all duration-300 hover:ring-white/[0.18] hover:z-10"
                    style={{
                      ...pos,
                      background: `linear-gradient(135deg, color-mix(in oklch, ${color} 22%, oklch(0.14 0.02 265)) 0%, color-mix(in oklch, ${color} 8%, oklch(0.14 0.02 265)) 100%)`,
                      boxShadow: `inset 2px 0 0 0 ${color}, 0 0 0 0.5px oklch(1 0 0 / 0.04)`,
                    }}
                    title={`${event.summary} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`}
                  >
                    <div className="flex h-full flex-col px-2 py-1.5">
                      <div className="line-clamp-2 text-[11px] font-medium leading-tight text-white">
                        {event.summary}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-white/55 num-tabular">
                        {format(start, "h:mm a")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NowLine({ startHour, hours }: { startHour: number; hours: number }) {
  const now = new Date();
  const minutes = minutesIntoGrid(now, startHour);
  const total = hours * 60;
  if (minutes < 0 || minutes > total) return null;
  const top = (minutes / total) * 100;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[5]"
      style={{ top: `${top}%` }}
      aria-hidden
    >
      <div
        className="absolute -left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
        style={{
          background: "oklch(0.72 0.18 250)",
          boxShadow: "0 0 8px oklch(0.72 0.18 250)",
        }}
      />
      <div
        className="h-[1.5px] w-full"
        style={{
          background:
            "linear-gradient(90deg, oklch(0.72 0.18 250) 0%, oklch(0.72 0.18 250 / 0.4) 100%)",
          boxShadow: "0 0 8px oklch(0.72 0.18 250 / 0.6)",
        }}
      />
    </div>
  );
}
