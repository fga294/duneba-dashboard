"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactCountryFlag from "react-country-flag";
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
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
        <ReactCountryFlag
          countryCode={countryCode}
          svg
          style={{ width: "1.3em", height: "1.3em" }}
          aria-label={currency}
        />
      </div>
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">
        {currency}
      </span>
      <div
        className="font-mono text-[16px] font-medium text-[color:var(--accent-1)] num-tabular"
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
        <CardContent className="flex h-full items-center justify-around gap-2 px-3 py-3">
          <Skeleton className="h-6 w-16 rounded-full bg-white/[0.04]" />
          <Skeleton className="h-6 w-16 rounded-full bg-white/[0.04]" />
          <Skeleton className="h-6 w-16 rounded-full bg-white/[0.04]" />
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
      <CardContent className="flex h-full items-center justify-around gap-2 px-3 py-3">
        <RateRow countryCode="BR" currency="BRL" rate={data.rates.BRL} />
        <RateRow countryCode="US" currency="USD" rate={data.rates.USD} />
        <RateRow countryCode="EU" currency="EUR" rate={data.rates.EUR} />
      </CardContent>
    </Card>
  );
}
