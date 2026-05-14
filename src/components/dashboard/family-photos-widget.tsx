"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import type { RandomPhotoResponse } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface Layer {
  id: string;
  date: string;
  location: string | null;
  loaded: boolean;
}

export function FamilyPhotosWidget() {
  const { data, error } = useSWR<RandomPhotoResponse>(
    "/api/photos/random",
    fetcher,
    { refreshInterval: 8_000, revalidateOnFocus: false }
  );

  const [front, setFront] = useState<Layer | null>(null);
  const [back, setBack] = useState<Layer | null>(null);
  const [showFront, setShowFront] = useState(true);

  useEffect(() => {
    if (!data?.id) return;
    const visible = showFront ? front : back;
    const hidden = showFront ? back : front;
    if (visible?.id === data.id) return;
    if (hidden?.id === data.id) return;
    const next: Layer = {
      id: data.id,
      date: data.date,
      location: data.location,
      loaded: false,
    };
    // setState inside effect is intentional: syncing hidden layer to latest photo id.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (showFront) {
      setBack(next);
    } else {
      setFront(next);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data?.id, data?.date, data?.location, front, back, showFront]);

  const handleLoad = (which: "front" | "back") => {
    if (which === "front") {
      setFront((f) => (f ? { ...f, loaded: true } : f));
      if (!showFront) setShowFront(true);
    } else {
      setBack((b) => (b ? { ...b, loaded: true } : b));
      if (showFront) setShowFront(false);
    }
  };

  const hasAnyPhoto = Boolean(front || back);

  return (
    <Card className="flex-1">
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
          className="relative flex-1 min-h-[400px] overflow-hidden rounded-xl ring-1 ring-white/[0.08]"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 250 / 0.18) 0%, oklch(0.82 0.13 195 / 0.12) 50%, oklch(0.75 0.14 300 / 0.18) 100%)",
            boxShadow: "inset 0 1px 0 0 oklch(1 0 0 / 0.08)",
          }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.06) 0%, transparent 50%), radial-gradient(circle at 70% 70%, oklch(0.72 0.18 250 / 0.15) 0%, transparent 50%)",
            }}
            aria-hidden
          />

          {/* eslint-disable @next/next/no-img-element */}
          {front && (
            <>
              <img
                key={`front-img-${front.id}`}
                src={`/api/photos/file?id=${front.id}`}
                alt=""
                onLoad={() => handleLoad("front")}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms]"
                style={{ opacity: showFront && front.loaded ? 1 : 0 }}
              />
              <PhotoMetaOverlay
                layer={front}
                visible={showFront && front.loaded}
              />
            </>
          )}
          {back && (
            <>
              <img
                key={`back-img-${back.id}`}
                src={`/api/photos/file?id=${back.id}`}
                alt=""
                onLoad={() => handleLoad("back")}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms]"
                style={{ opacity: !showFront && back.loaded ? 1 : 0 }}
              />
              <PhotoMetaOverlay
                layer={back}
                visible={!showFront && back.loaded}
              />
            </>
          )}
          {/* eslint-enable @next/next/no-img-element */}

          {!hasAnyPhoto && !error && (
            <div className="relative flex h-full items-center justify-center">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
                <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[color:var(--accent-1)] [animation-duration:0.9s]" />
              </div>
            </div>
          )}

          {error && !hasAnyPhoto && (
            <div className="relative flex h-full flex-col items-center justify-center gap-2 text-white/55">
              <ImageIcon
                className="h-10 w-10 text-[color:var(--accent-2)]"
                strokeWidth={1.25}
              />
              <span className="text-[11px] font-medium tracking-tight">
                Photos unavailable
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoMetaOverlay({
  layer,
  visible,
}: {
  layer: Layer;
  visible: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 transition-opacity duration-[600ms]"
      style={{
        opacity: visible ? 1 : 0,
        background:
          "linear-gradient(to top, oklch(0 0 0 / 0.7) 0%, oklch(0 0 0 / 0.35) 45%, transparent 100%)",
      }}
    >
      <div
        className="flex items-baseline gap-2 text-white"
        style={{ textShadow: "0 1px 2px oklch(0 0 0 / 0.6)" }}
      >
        <span className="text-sm font-medium tracking-tight num-tabular">
          {layer.date}
        </span>
        {layer.location && (
          <span className="text-sm font-light text-white/80">
            · {layer.location}
          </span>
        )}
      </div>
    </div>
  );
}
