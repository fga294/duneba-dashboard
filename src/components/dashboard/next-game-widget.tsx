"use client";

import ReactCountryFlag from "react-country-flag";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// TODO: connect live data source. Hardcoded placeholder fixture for now.
const FIXTURE = {
  home: { code: "BR", name: "Brazil" },
  away: { code: "MX", name: "Mexico" },
  kickoff: "15 Jun 2026 · 18:00 AEST",
  homeScore: null as number | null,
  awayScore: null as number | null,
};

function FlagRing({ code }: { code: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: "1.5em", height: "1.5em" }}
        aria-label={code}
      />
    </div>
  );
}

function Team({
  code,
  name,
  align,
}: {
  code: string;
  name: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <FlagRing code={code} />
      <span className="truncate text-[13px] font-semibold tracking-tight text-white">
        {name}
      </span>
    </div>
  );
}

export function NextGameWidget() {
  const { home, away, kickoff, homeScore, awayScore } = FIXTURE;
  const score =
    homeScore != null && awayScore != null
      ? `${homeScore} : ${awayScore}`
      : "– : –";

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-center py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <Trophy
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Next Brasil Game
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Team code={home.code} name={home.name} align="left" />
          <span
            className="shrink-0 font-mono text-[18px] font-medium tracking-wider text-white/90 num-tabular"
            style={{ textShadow: "0 0 18px oklch(0.72 0.18 250 / 0.3)" }}
          >
            {score}
          </span>
          <Team code={away.code} name={away.name} align="right" />
        </div>

        <div className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-white/45 num-tabular">
          {kickoff}
        </div>
      </CardContent>
    </Card>
  );
}
