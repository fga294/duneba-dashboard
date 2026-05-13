"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const QUOTE = {
  text: "The only way to do great work is to love what you do.",
  author: "Steve Jobs",
};

export function QuoteWidget() {
  return (
    <Card>
      <CardContent className="flex h-full flex-col py-2">
        <div className="mb-4 flex items-center gap-2">
          <Quote
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Quote of the Day
          </p>
        </div>

        <figure className="flex flex-1 flex-col justify-center gap-3">
          <blockquote
            className="text-[18px] font-light leading-snug tracking-tight text-white/90"
            style={{ textWrap: "balance" }}
          >
            <span
              aria-hidden
              className="mr-1 font-serif text-[28px] leading-none text-[color:var(--accent-2)]"
              style={{
                filter: "drop-shadow(0 0 12px oklch(0.82 0.13 195 / 0.4))",
              }}
            >
              &ldquo;
            </span>
            {QUOTE.text}
            <span
              aria-hidden
              className="ml-1 font-serif text-[28px] leading-none text-[color:var(--accent-2)]"
            >
              &rdquo;
            </span>
          </blockquote>
          <figcaption className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
            <span
              className="h-px w-6"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.72 0.18 250 / 0.6), transparent)",
              }}
              aria-hidden
            />
            <span className="font-medium text-[color:var(--accent-1)]">
              {QUOTE.author}
            </span>
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}
