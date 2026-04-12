import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { CurrencyRates } from "@/types/dashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    "https://api.frankfurter.app/latest?from=AUD&to=BRL,USD"
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Currency API error" }, { status: 502 });
  }

  const data = await res.json();

  const rates: CurrencyRates = {
    base: data.base,
    date: data.date,
    rates: {
      BRL: data.rates.BRL,
      USD: data.rates.USD,
    },
  };

  return NextResponse.json(rates);
}
