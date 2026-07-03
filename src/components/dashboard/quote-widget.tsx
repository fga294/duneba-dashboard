"use client";

import { useLayoutEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import type { QuoteData } from "@/types/dashboard";

const MAX_FONT_PX = 18;
const MIN_FONT_PX = 12;
const REFRESH_MS = 3_600_000; // 60 minutes

const fetcher = async (url: string): Promise<QuoteData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch quote");
  return res.json();
};

export function QuoteWidget() {
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const [fontPx, setFontPx] = useState(MAX_FONT_PX);

  const { data } = useSWR<QuoteData>("/api/quote", fetcher, {
    refreshInterval: REFRESH_MS,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const quote = data ?? {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
  };

  useLayoutEffect(() => {
    const el = quoteRef.current;
    if (!el) return;

    const fit = () => {
      let size = MAX_FONT_PX;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_PX) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setFontPx(size);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [quote.text]);

  const quoteMarkPx = Math.round(fontPx * 1.15);

  return (
    <Card>
      <CardContent className="py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Quote
              className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
              strokeWidth={1.75}
            />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
              Quote
            </p>
          </div>

          <span
            className="h-px flex-shrink-0 w-6"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.72 0.18 250 / 0.5), transparent)",
            }}
            aria-hidden
          />

          <blockquote
            ref={quoteRef}
            className="min-w-0 flex-1 truncate font-light italic tracking-tight text-white/85"
            style={{ fontSize: `${fontPx}px`, lineHeight: "16px" }}
            title={`"${quote.text}" — ${quote.author}`}
          >
            <span
              aria-hidden
              className="mr-0.5 font-serif leading-none text-[color:var(--accent-2)]"
              style={{ fontSize: `${quoteMarkPx}px` }}
            >
              &ldquo;
            </span>
            {quote.text}
            <span
              aria-hidden
              className="ml-0.5 font-serif leading-none text-[color:var(--accent-2)]"
              style={{ fontSize: `${quoteMarkPx}px` }}
            >
              &rdquo;
            </span>
          </blockquote>

          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--accent-1)]">
            {quote.author}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
