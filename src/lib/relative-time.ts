import { differenceInCalendarDays } from "date-fns";

/**
 * Pure date helpers for the Relative Time widget. Every function takes an
 * explicit `today` (the caller passes `startOfDay(sydneyTime())`) so the maths
 * is deterministic and easy to reason about — no hidden `new Date()` calls.
 *
 * All distances are measured in *calendar* days (via date-fns
 * `differenceInCalendarDays`), so DST transitions and the time-of-day of the
 * birthdate never skew the count.
 */

/** Whole calendar days between a past date and today (e.g. days on Earth). */
export function daysSince(from: Date, today: Date): number {
  return differenceInCalendarDays(today, from);
}

/** Whole calendar days from today until a future target. */
export function daysUntil(target: Date, today: Date): number {
  return differenceInCalendarDays(target, today);
}

/**
 * The next occurrence of a recurring month/day anniversary on or after today.
 * `month` is 1-12 (human form). If this year's date has already passed, returns
 * next year's — so a 25 Dec lookup on 26 Dec correctly rolls to next December.
 */
export function nextAnniversary(month: number, day: number, today: Date): Date {
  const candidate = new Date(today.getFullYear(), month - 1, day);
  if (differenceInCalendarDays(candidate, today) < 0) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Seasons (Southern Hemisphere — the dashboard is Sydney-based)
// ---------------------------------------------------------------------------

export type Season = "Summer" | "Autumn" | "Winter" | "Spring";

export interface SeasonInfo {
  season: Season;
  emoji: string;
}

export interface UpcomingSeason {
  season: Season;
  emoji: string;
  days: number;
}

/**
 * Each Southern-Hemisphere season keyed by the month (1-12) it BEGINS on the
 * 1st. Summer: Dec 1 – Feb, Autumn: Mar 1 – May, Winter: Jun 1 – Aug,
 * Spring: Sep 1 – Nov. Ordered by start month for convenience.
 */
export const SEASON_STARTS: ReadonlyArray<{
  month: number;
  season: Season;
  emoji: string;
}> = [
  { month: 3, season: "Autumn", emoji: "🍂" },
  { month: 6, season: "Winter", emoji: "❄️" },
  { month: 9, season: "Spring", emoji: "🌷" },
  { month: 12, season: "Summer", emoji: "☀️" },
];

/**
 * The current Southern-Hemisphere season for `today`. Picks the latest season
 * whose start month (1-12) is at or before the current month; Jan/Feb fall
 * before March's entry and so wrap back to December's Summer.
 */
export function currentSeason(today: Date): SeasonInfo {
  const month = today.getMonth() + 1; // 1-12
  const match =
    [...SEASON_STARTS].reverse().find((s) => s.month <= month) ??
    SEASON_STARTS[SEASON_STARTS.length - 1]; // Jan/Feb -> Summer (Dec)
  return { season: match.season, emoji: match.emoji };
}

/**
 * All four upcoming season starts, soonest first. Each season's start date is
 * built for this year; any start that is today-or-past rolls to next year, so
 * every entry is strictly in the future (a season starting *today* is treated
 * as already begun). Entry 0 is the next season to arrive; the rest complete
 * the year's cycle in order.
 */
export function upcomingSeasons(today: Date): UpcomingSeason[] {
  const upcoming = SEASON_STARTS.map(({ month, season, emoji }) => {
    const start = new Date(today.getFullYear(), month - 1, 1);
    if (differenceInCalendarDays(start, today) <= 0) {
      start.setFullYear(start.getFullYear() + 1);
    }
    return { season, emoji, days: daysUntil(start, today) };
  });
  upcoming.sort((a, b) => a.days - b.days);
  return upcoming;
}
