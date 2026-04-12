"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, MapPin } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { formatEventTime } from "@/lib/utils";
import type { CalendarEvent } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EVENT_COLORS: Record<string, string> = {
  default: "bg-blue-500",
  "1": "bg-blue-300",
  "2": "bg-green-500",
  "3": "bg-purple-500",
  "4": "bg-red-400",
  "5": "bg-yellow-500",
  "6": "bg-orange-500",
  "7": "bg-teal-500",
  "8": "bg-gray-500",
  "9": "bg-indigo-500",
  "10": "bg-emerald-500",
  "11": "bg-rose-500",
};

function dayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
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
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Calendar unavailable
        </CardContent>
      </Card>
    );
  }

  const events = data || [];
  const grouped = groupByDay(events);

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Calendar — Next 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-3">
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No upcoming events
            </div>
          ) : (
            Object.entries(grouped).map(
              ([dateKey, dayEvents], groupIndex) => (
                <div key={dateKey}>
                  {groupIndex > 0 && <Separator className="my-3" />}
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {dayLabel(dayEvents[0].start)}
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                      >
                        <div
                          className={`mt-1.5 h-2 w-2 rounded-full ${EVENT_COLORS[event.color] || EVENT_COLORS.default}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {event.summary}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatEventTime(event.start, event.allDay)}
                            {!event.allDay &&
                              ` — ${formatEventTime(event.end, false)}`}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              <span className="truncate">
                                {event.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
