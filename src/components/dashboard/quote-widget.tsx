"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const QUOTE = {
  text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  author: "Aristotle",
};

export function QuoteWidget() {
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
            className="min-w-0 flex-1 truncate text-[13px] font-light italic leading-tight tracking-tight text-white/85"
            title={`"${QUOTE.text}" — ${QUOTE.author}`}
          >
            <span
              aria-hidden
              className="mr-0.5 font-serif text-[15px] leading-none text-[color:var(--accent-2)]"
            >
              &ldquo;
            </span>
            {QUOTE.text}
            <span
              aria-hidden
              className="ml-0.5 font-serif text-[15px] leading-none text-[color:var(--accent-2)]"
            >
              &rdquo;
            </span>
          </blockquote>

          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--accent-1)]">
            {QUOTE.author}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
