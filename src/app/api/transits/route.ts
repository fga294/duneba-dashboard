import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ephemeris from "ephemeris";
import { TRANSIT_BODIES, longitudeToZodiac } from "@/lib/zodiac";
import type { TransitBody } from "@/types/dashboard";

export const dynamic = "force-dynamic";

// Observer reference: Sydney. Geocentric apparent ecliptic longitude is what
// drives the zodiac sign, and that is effectively observer-independent — but we
// pass real coordinates for correctness rather than 0,0.
const SYDNEY = { lon: 151.2093, lat: -33.8688, height: 0 };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Current instant — positions are computed from the absolute UTC moment, so
    // the display timezone is irrelevant to the result.
    const now = new Date();
    const later = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const { observed } = ephemeris.getAllPlanets(
      now,
      SYDNEY.lon,
      SYDNEY.lat,
      SYDNEY.height
    );
    // The package's own is_retrograde flag is wrong (it marks bodies near max
    // elongation, where retrograde motion is impossible), so derive motion from
    // the longitude change over 6h — long enough to swamp numerical noise,
    // short enough to catch stations within hours.
    const { observed: observedLater } = ephemeris.getAllPlanets(
      later,
      SYDNEY.lon,
      SYDNEY.lat,
      SYDNEY.height
    );

    const transits: TransitBody[] = TRANSIT_BODIES.map(({ key, name, symbol }) => {
      const body = observed[key];
      const { sign, degree } = longitudeToZodiac(body.apparentLongitudeDd);
      // Wrap-safe signed delta in (-180, 180]: negative = retrograde.
      const delta =
        ((observedLater[key].apparentLongitudeDd -
          body.apparentLongitudeDd +
          540) %
          360) -
        180;
      return { name, symbol, sign, degree, retrograde: delta < 0 };
    });

    return NextResponse.json(transits);
  } catch (err) {
    console.error("Transits API error:", err);
    return NextResponse.json({ error: "transits-failed" }, { status: 500 });
  }
}
