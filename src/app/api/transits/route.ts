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
    const { observed } = ephemeris.getAllPlanets(
      new Date(),
      SYDNEY.lon,
      SYDNEY.lat,
      SYDNEY.height
    );

    const transits: TransitBody[] = TRANSIT_BODIES.map(({ key, name, symbol }) => {
      const body = observed[key];
      const { sign, degree } = longitudeToZodiac(body.apparentLongitudeDd);
      return { name, symbol, sign, degree, retrograde: Boolean(body.is_retrograde) };
    });

    return NextResponse.json(transits);
  } catch (err) {
    console.error("Transits API error:", err);
    return NextResponse.json({ error: "transits-failed" }, { status: 500 });
  }
}
