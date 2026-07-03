"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClockWidget } from "@/components/dashboard/clock-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { FamilyPhotosWidget } from "@/components/dashboard/family-photos-widget";
import { MeteorologistsCornerWidget } from "@/components/dashboard/meteorologists-corner-widget";
import { QuoteWidget } from "@/components/dashboard/quote-widget";
import { DataTrackerWidget } from "@/components/dashboard/data-tracker-widget";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[color:var(--accent-1)] [animation-duration:0.9s]" />
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
      <div className="w-full">
        <div className="grid gap-3 lg:grid-cols-[var(--side-card-w)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-4 lg:min-h-[calc(100dvh-6rem)]">
          <ClockWidget />
          {/* The outer left column uses --side-card-w too, so it matches the
              right rail (column 1 === column 3). Weather shares Calendar's grid
              template, so the main cells are identical 1fr widths of the same
              column — Weather === Calendar width. Meteorologists Corner snaps to
              --side-card-w, aligning with Data Tracker below it. */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_var(--side-card-w)] lg:gap-4">
            <WeatherWidget />
            <MeteorologistsCornerWidget />
          </div>
          {/* Family Photos now owns the whole cell — it expands to fill the
              height the Exchange Rate card used to occupy below it. */}
          <div className="flex flex-col gap-3 lg:gap-4">
            <FamilyPhotosWidget />
          </div>
          {/* Left cell: Calendar (grows) over Quote. Right cell: Data Tracker —
              the consolidation hub — as one full-height cell. */}
          <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_var(--side-card-w)] lg:gap-4">
            <div className="flex min-h-0 flex-col gap-3 lg:gap-4">
              <CalendarWidget />
              <QuoteWidget />
            </div>
            <DataTrackerWidget />
          </div>
        </div>
      </div>
    </main>
  );
}
