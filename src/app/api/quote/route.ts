import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { QuoteData } from "@/types/dashboard";

const API_HISTORY_MAX = 50;
const API_RETRY = 2;

const apiHistory: string[] = [];

function keyOf(q: QuoteData): string {
  return `${q.author}|${q.text}`;
}

function trim(buf: string[], max: number): void {
  while (buf.length > max) buf.shift();
}

async function fetchFromZenQuotes(): Promise<QuoteData | null> {
  try {
    const res = await fetch("https://zenquotes.io/api/random", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ q: string; a: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    return { text: data[0].q, author: data[0].a };
  } catch {
    return null;
  }
}

async function pickApi(): Promise<QuoteData | null> {
  for (let attempt = 0; attempt <= API_RETRY; attempt++) {
    const q = await fetchFromZenQuotes();
    if (!q) return null;
    if (!apiHistory.includes(keyOf(q))) {
      apiHistory.push(keyOf(q));
      trim(apiHistory, API_HISTORY_MAX);
      return q;
    }
  }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quote = await pickApi();
  if (!quote) {
    return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
  }
  return NextResponse.json(quote);
}
