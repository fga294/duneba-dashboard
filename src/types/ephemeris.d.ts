// Minimal ambient types for the `ephemeris` package (ships no type defs).
// Only the fields the transits route actually reads are declared.
declare module "ephemeris" {
  interface ObservedBody {
    name: string;
    apparentLongitudeDd: number;
    is_retrograde: boolean;
    [key: string]: unknown;
  }

  interface EphemerisResult {
    date: unknown;
    observer: unknown;
    observed: Record<string, ObservedBody>;
  }

  const ephemeris: {
    getAllPlanets(
      date: Date,
      longitude: number,
      latitude: number,
      height: number
    ): EphemerisResult;
    getPlanet(
      name: string,
      date: Date,
      longitude: number,
      latitude: number,
      height: number
    ): EphemerisResult;
  };

  export default ephemeris;
}
