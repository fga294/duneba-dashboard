import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { QuoteData } from "@/types/dashboard";

interface StaticQuote {
  q: string;
  a: string;
  h: string;
}

const STATIC_QUOTES_PATH = path.join(
  process.cwd(),
  "src",
  "app",
  "our-quotes.json",
);

async function readStaticQuotes(): Promise<StaticQuote[]> {
  const raw = await fs.readFile(STATIC_QUOTES_PATH, "utf8");
  return JSON.parse(raw) as StaticQuote[];
}

function pickRandomStatic(quotes: StaticQuote[]): QuoteData {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  return { text: q.q, author: q.a, source: "static" };
}

async function fetchFromZenQuotes(): Promise<QuoteData | null> {
  try {
    const res = await fetch("https://zenquotes.io/api/random", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ q: string; a: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    return { text: data[0].q, author: data[0].a, source: "api" };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = req.nextUrl.searchParams.get("source");
  const staticQuotes = await readStaticQuotes();

  if (source === "static") {
    return NextResponse.json(pickRandomStatic(staticQuotes));
  }

  const apiQuote = await fetchFromZenQuotes();
  return NextResponse.json(apiQuote ?? pickRandomStatic(staticQuotes));
}
