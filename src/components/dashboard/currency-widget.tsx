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
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
        <ReactCountryFlag
          countryCode={countryCode}
          svg
          style={{ width: "1.5em", height: "1.5em" }}
          aria-label={currency}
        />
      </div>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
        {currency}
      </span>
      <div
        className="ml-auto font-mono text-xl font-medium text-[color:var(--accent-1)] num-tabular"
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
        <CardContent className="space-y-2 py-1.5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft
              className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
              strokeWidth={1.75}
            />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
              Exchange
            </p>
          </div>
          <Skeleton className="h-7 w-full rounded-full bg-white/[0.04]" />
          <Skeleton className="h-7 w-full rounded-full bg-white/[0.04]" />
          <Skeleton className="h-7 w-full rounded-full bg-white/[0.04]" />
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
      <CardContent className="flex flex-col py-1.5">
        <div className="mb-2 flex items-center gap-2">
          <ArrowRightLeft
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Exchange
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2.5">
          <RateRow countryCode="BR" currency="BRL" rate={data.rates.BRL} />
          <RateRow countryCode="US" currency="USD" rate={data.rates.USD} />
          <RateRow countryCode="EU" currency="EUR" rate={data.rates.EUR} />
        </div>
      </CardContent>
    </Card>
  );
}
