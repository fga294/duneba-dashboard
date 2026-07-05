"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClockWidget } from "@/components/dashboard/clock-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { FamilyPhotosWidget } from "@/components/dashboard/family-photos-widget";
import { AlmanacDeckWidget } from "@/components/dashboard/almanac-deck-widget";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border border-white/[0.1]" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[color:var(--accent-1)] [animation-duration:0.9s]" />
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-6 md:px-8 md:py-7 lg:px-10 lg:py-8">
      {/* Album Spread layout: a fixtures strip (Clock · slim Weather) above two
          heroes — Family Photos (37.5%) beside Calendar-5-day stacked over the
          rotating Almanac Deck (62.5%). Both rows share the same 3fr/5fr
          template and gaps, so Clock aligns with Photos and Weather with
          Calendar in lockstep. */}
      <div className="flex w-full flex-col gap-3 lg:h-[calc(100dvh-4rem)] lg:gap-4">
        <div className="grid shrink-0 gap-3 lg:grid-cols-[3fr_5fr] lg:gap-4">
          <ClockWidget />
          <WeatherWidget />
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[3fr_5fr] lg:gap-4">
          <FamilyPhotosWidget />
          <div className="flex min-h-0 flex-col gap-3 lg:gap-4">
            <CalendarWidget />
            <AlmanacDeckWidget />
          </div>
        </div>
      </div>
    </main>
  );
}
