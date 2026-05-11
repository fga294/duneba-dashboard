"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactCountryFlag from "react-country-flag";
import { ArrowRightLeft } from "lucide-react";
import type { CurrencyRates } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface RateRowProps {
  countryCode: string;
  currency: string;
  rate: number;
}

function RateRow({ countryCode, currency, rate }: RateRowProps) {
  return (
    <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-white/[0.05] hover:ring-white/[0.1]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
          <ReactCountryFlag
            countryCode={countryCode}
            svg
            style={{ width: "1.75em", height: "1.75em" }}
            aria-label={currency}
          />
        </div>
        <div>
          <div className="text-sm font-medium text-white">
            AUD → {currency}
          </div>
          <div className="text-[11px] text-white/45 num-tabular font-mono">
            1 AUD = {rate.toFixed(4)}
          </div>
        </div>
      </div>
      <div
        className="font-mono text-xl font-medium text-[color:var(--accent-1)] num-tabular"
        style={{
          textShadow: "0 0 24px oklch(0.72 0.18 250 / 0.4)",
          letterSpacing: "-0.02em",
        }}
      >
        {rate.toFixed(2)}
      </div>
    </div>
  );
}

export function CurrencyWidget() {
  const { data, isLoading, error } = useSWR<CurrencyRates>(
    "/api/currency",
    fetcher,
    { refreshInterval: 60 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-2">
          <Skeleton className="h-16 w-full rounded-2xl bg-white/[0.04]" />
          <Skeleton className="h-16 w-full rounded-2xl bg-white/[0.04]" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-white/50">
          Rates unavailable
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex h-full flex-col py-2">
        <div className="mb-4 flex items-center gap-2">
          <ArrowRightLeft
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Exchange
          </p>
        </div>
        <div className="flex-1 space-y-2.5">
          <RateRow countryCode="BR" currency="BRL" rate={data.rates.BRL} />
          <RateRow countryCode="US" currency="USD" rate={data.rates.USD} />
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/35 num-tabular">
          Updated {data.date}
        </div>
      </CardContent>
    </Card>
  );
}
