"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

export function FamilyPhotosWidget() {
  return (
    <Card>
      <CardContent className="flex h-full flex-col py-2">
        <div className="mb-3 flex items-center gap-2">
          <ImageIcon
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Family Photos
          </p>
        </div>

        <div
          className="relative flex-1 overflow-hidden rounded-xl ring-1 ring-white/[0.08]"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 250 / 0.18) 0%, oklch(0.82 0.13 195 / 0.12) 50%, oklch(0.75 0.14 300 / 0.18) 100%)",
            boxShadow: "inset 0 1px 0 0 oklch(1 0 0 / 0.08)",
          }}
          aria-label="Family photo placeholder"
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.06) 0%, transparent 50%), radial-gradient(circle at 70% 70%, oklch(0.72 0.18 250 / 0.15) 0%, transparent 50%)",
            }}
            aria-hidden
          />
          <div className="relative flex h-full flex-col items-center justify-center gap-2 text-white/55">
            <ImageIcon
              className="h-10 w-10 text-[color:var(--accent-2)]"
              strokeWidth={1.25}
              style={{
                filter: "drop-shadow(0 0 12px oklch(0.82 0.13 195 / 0.45))",
              }}
            />
            <span className="text-[11px] font-medium tracking-tight">
              Placeholder
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
