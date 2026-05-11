"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, MapPin } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { formatEventTime } from "@/lib/utils";
import type { CalendarEvent } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// Google Calendar's 11 color IDs, retuned in oklch at higher lightness
// so they pop against the dark glass surface without losing identity.
const EVENT_COLORS: Record<string, string> = {
  default: "oklch(0.72 0.18 250)", // electric blue (accent-1)
  "1": "oklch(0.75 0.14 300)",  // Lavender
  "2": "oklch(0.78 0.12 150)",  // Sage
  "3": "oklch(0.68 0.20 310)",  // Grape
  "4": "oklch(0.76 0.17 15)",   // Flamingo
  "5": "oklch(0.85 0.15 90)",   // Banana
  "6": "oklch(0.78 0.18 55)",   // Tangerine
  "7": "oklch(0.78 0.13 215)",  // Peacock
  "8": "oklch(0.7 0.02 265)",   // Graphite
  "9": "oklch(0.72 0.18 250)",  // Blueberry
  "10": "oklch(0.72 0.15 155)", // Basil
  "11": "oklch(0.72 0.22 25)",  // Tomato
};

function eventColor(colorId: string): string {
  return EVENT_COLORS[colorId] ?? EVENT_COLORS.default;
}

function dayHeader(dateStr: string): { label: string; sub: string } {
  const date = parseISO(dateStr);
  if (isToday(date)) return { label: "Today", sub: format(date, "MMM d") };
  if (isTomorrow(date))
    return { label: "Tomorrow", sub: format(date, "MMM d") };
  return { label: format(date, "EEEE"), sub: format(date, "MMM d") };
}

function groupByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dateKey = event.start.split("T")[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return groups;
}

export function CalendarWidget() {
  const { data, isLoading, error } = useSWR<CalendarEvent[]>(
    "/api/calendar",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-2">
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[280px] w-[240px] flex-shrink-0 rounded-2xl bg-white/[0.04]"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-white/50">
          Calendar unavailable
        </CardContent>
      </Card>
    );
  }

  const events = data || [];
  const grouped = groupByDay(events);
  const days = Object.entries(grouped);

  return (
    <Card>
      <CardContent className="py-2">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Calendar · Next 5 days
          </p>
        </div>

        {days.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-white/50">
            No upcoming events
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {days.slice(0, 5).map(([dateKey, dayEvents]) => {
              const isDayToday = isToday(parseISO(dayEvents[0].start));
              const header = dayHeader(dayEvents[0].start);
              return (
                <div
                  key={dateKey}
                  className="flex min-w-0 flex-col gap-3"
                >
                    <div className="flex items-baseline justify-between px-1">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                          isDayToday
                            ? "text-[color:var(--accent-1)]"
                            : "text-white/75"
                        }`}
                        style={
                          isDayToday
                            ? {
                                textShadow:
                                  "0 0 12px oklch(0.72 0.18 250 / 0.5)",
                              }
                            : undefined
                        }
                      >
                        {header.label}
                      </span>
                      <span className="text-[10px] text-white/40 num-tabular">
                        {header.sub}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {dayEvents.map((event) => {
                        const color = eventColor(event.color);
                        return (
                          <div
                            key={event.id}
                            className="group relative min-w-0 overflow-hidden rounded-xl px-2.5 py-2 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:ring-white/[0.12]"
                            style={{
                              background: `linear-gradient(135deg, color-mix(in oklch, ${color} 10%, oklch(1 0 0 / 0.03)) 0%, oklch(1 0 0 / 0.03) 100%)`,
                            }}
                          >
                            <div
                              className="absolute inset-y-1.5 left-0 w-[2px] rounded-full"
                              style={{
                                background: color,
                                boxShadow: `0 0 10px ${color}`,
                              }}
                              aria-hidden
                            />
                            <div className="min-w-0 pl-2">
                              <div className="line-clamp-2 text-[12px] font-medium leading-snug text-white">
                                {event.summary}
                              </div>
                              <div className="mt-0.5 truncate text-[10px] text-white/50 num-tabular font-mono">
                                {formatEventTime(event.start, event.allDay)}
                              </div>
                              {event.location && (
                                <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-white/40">
                                  <MapPin
                                    className="h-2.5 w-2.5 flex-shrink-0"
                                    strokeWidth={1.5}
                                  />
                                  <span className="truncate">
                                    {event.location}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
