import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPhotoIndex } from "@/lib/photo-index";
import { getPhotoMeta, type PhotoMeta } from "@/lib/photo-meta";
import { getVetoSet } from "@/lib/photo-vetoes";

export const dynamic = "force-dynamic";

// Cap on random re-picks when skipping vetoed photos — bounds the per-request
// EXIF reads so a few vetoed hits never stall the carousel.
const MAX_PICK_TRIES = 15;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.error) {
    return NextResponse.json(
      { error: session?.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const paths = await getPhotoIndex();
    if (paths.length === 0) {
      return NextResponse.json(
        { error: "no-photos-found" },
        { status: 503 }
      );
    }
    // Pick a random photo, skipping any tagged "veto". Two veto sources:
    // the Synology Photos DB tag (synced set — checked first, no file I/O)
    // and embedded XMP/IPTC keywords (checked via the EXIF parse we need for
    // date/location anyway). Track tried indices so we never re-test the same
    // photo and can stop once the pool is exhausted.
    const vetoSet = await getVetoSet();
    const tried = new Set<number>();
    let chosen: { pick: string; meta: PhotoMeta } | null = null;
    for (
      let attempt = 0;
      attempt < MAX_PICK_TRIES && tried.size < paths.length;
      attempt++
    ) {
      const idx = Math.floor(Math.random() * paths.length);
      if (tried.has(idx)) continue;
      tried.add(idx);
      const pick = paths[idx];
      if (vetoSet.has(pick)) continue;
      const meta = await getPhotoMeta(pick);
      if (meta.veto) continue;
      chosen = { pick, meta };
      break;
    }

    if (!chosen) {
      // Every try landed on a vetoed photo — SWR keeps the last good photo on
      // error, so the carousel simply holds its current frame.
      return NextResponse.json({ error: "all-vetoed" }, { status: 503 });
    }

    const id = Buffer.from(chosen.pick, "utf8").toString("base64url");
    return NextResponse.json({
      id,
      date: chosen.meta.date,
      location: chosen.meta.location,
    });
  } catch (err) {
    console.error("Photo index error:", err);
    return NextResponse.json(
      { error: "photos-dir-unavailable" },
      { status: 503 }
    );
  }
}
