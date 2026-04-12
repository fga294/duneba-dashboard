"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactCountryFlag from "react-country-flag";
import { ArrowRightLeft } from "lucide-react";
import type { CurrencyRates } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RateRowProps {
  countryCode: string;
  currency: string;
  rate: number;
}

function RateRow({ countryCode, currency, rate }: RateRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <ReactCountryFlag
          countryCode={countryCode}
          svg
          style={{ width: "1.5em", height: "1.5em" }}
          aria-label={currency}
        />
        <div>
          <div className="text-sm font-medium">AUD → {currency}</div>
          <div className="text-xs text-muted-foreground">
            1 AUD = {rate.toFixed(4)} {currency}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold tabular-nums">{rate.toFixed(2)}</div>
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
      <Card className="col-span-1">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-1">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Rates unavailable
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" />
          Exchange Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <RateRow countryCode="BR" currency="BRL" rate={data.rates.BRL} />
        <RateRow countryCode="US" currency="USD" rate={data.rates.USD} />
        <div className="pt-1 text-[10px] text-muted-foreground text-center">
          Updated {data.date}
        </div>
      </CardContent>
    </Card>
  );
}
