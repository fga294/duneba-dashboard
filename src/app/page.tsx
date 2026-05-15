"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClockWidget } from "@/components/dashboard/clock-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { CurrencyWidget } from "@/components/dashboard/currency-widget";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { FamilyPhotosWidget } from "@/components/dashboard/family-photos-widget";
import { QuoteWidget } from "@/components/dashboard/quote-widget";

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
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.7fr)] lg:grid-rows-[auto_1fr] lg:gap-6 lg:min-h-[calc(100dvh-6rem)]">
          <ClockWidget />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,1fr)] lg:gap-6">
            <WeatherWidget />
            <CurrencyWidget />
          </div>
          <FamilyPhotosWidget />
          <div className="flex flex-col gap-5 lg:gap-6">
            <CalendarWidget />
            <QuoteWidget />
          </div>
        </div>
      </div>
    </main>
  );
}
