"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ClockWidget } from "@/components/dashboard/clock-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { MoonPhaseWidget } from "@/components/dashboard/moon-phase-widget";
import { CurrencyWidget } from "@/components/dashboard/currency-widget";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { TasksWidget } from "@/components/dashboard/tasks-widget";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Duneba Dashboard
          </h1>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Widget Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* Row 1: Clock (1) + Weather (2) + Moon (1) */}
          <ClockWidget />
          <WeatherWidget />
          <MoonPhaseWidget />

          {/* Row 2: Currency (1) fills remaining space */}
          <CurrencyWidget />

          {/* Row 3: Calendar (2) + Tasks (2) */}
          <CalendarWidget />
          <TasksWidget />
        </div>
      </div>
    </main>
  );
}
