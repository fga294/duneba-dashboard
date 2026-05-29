// Pure zodiac helpers + the canonical transit body list. Deliberately free of
// any ephemeris import so it is safe to use from both the server route and the
// client widget; the heavy astronomy computation lives only in the route.

export const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

/**
 * Map an ecliptic longitude (degrees) to its zodiac sign + whole degree within
 * that sign, using the standard 30°-per-sign division. Longitude is normalised
 * into [0, 360) first, so negative or >360 inputs are handled.
 */
export function longitudeToZodiac(longitude: number): {
  sign: string;
  degree: number;
} {
  const norm = ((longitude % 360) + 360) % 360;
  const index = Math.floor(norm / 30); // 0..11
  const degree = Math.floor(norm % 30); // 0..29
  return { sign: ZODIAC_SIGNS[index], degree };
}

// Order is the display order requested. `key` matches ephemeris' observed-body
// keys; `symbol` is the Unicode astronomical glyph shown in the widget.
export const TRANSIT_BODIES = [
  { key: "sun", name: "Sun", symbol: "☉" },
  { key: "moon", name: "Moon", symbol: "☽" },
  { key: "mercury", name: "Mercury", symbol: "☿" },
  { key: "venus", name: "Venus", symbol: "♀" },
  { key: "mars", name: "Mars", symbol: "♂" },
  { key: "jupiter", name: "Jupiter", symbol: "♃" },
  { key: "saturn", name: "Saturn", symbol: "♄" },
  { key: "uranus", name: "Uranus", symbol: "♅" },
  { key: "neptune", name: "Neptune", symbol: "♆" },
  { key: "pluto", name: "Pluto", symbol: "♇" },
] as const;
