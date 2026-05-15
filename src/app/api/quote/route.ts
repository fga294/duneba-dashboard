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

const API_HISTORY_MAX = 50;
const API_RETRY = 2;

const apiHistory: string[] = [];
const staticHistory: string[] = [];

function keyOf(q: { text: string; author: string }): string {
  return `${q.author}|${q.text}`;
}

function trim(buf: string[], max: number): void {
  while (buf.length > max) buf.shift();
}

async function readStaticQuotes(): Promise<StaticQuote[]> {
  const raw = await fs.readFile(STATIC_QUOTES_PATH, "utf8");
  return JSON.parse(raw) as StaticQuote[];
}

function pickStatic(quotes: StaticQuote[]): QuoteData {
  const blocked = new Set(staticHistory);
  const available = quotes.filter(
    (q) => !blocked.has(keyOf({ text: q.q, author: q.a })),
  );
  const pool = available.length > 0 ? available : quotes;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const result: QuoteData = { text: pick.q, author: pick.a, source: "static" };
  staticHistory.push(keyOf(result));
  trim(staticHistory, Math.max(0, quotes.length - 1));
  return result;
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = req.nextUrl.searchParams.get("source");
  const staticQuotes = await readStaticQuotes();

  if (source === "static") {
    return NextResponse.json(pickStatic(staticQuotes));
  }

  const apiQuote = await pickApi();
  return NextResponse.json(apiQuote ?? pickStatic(staticQuotes));
}
