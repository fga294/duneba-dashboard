import { promises as fs } from "node:fs";
import { format } from "date-fns";
import exifr from "exifr";

export interface PhotoMeta {
  date: string;
  location: string | null;
  veto: boolean;
}

interface RawMeta {
  date: string;
  lat: number | null;
  lon: number | null;
  veto: boolean;
}

interface ExifResult {
  DateTimeOriginal?: Date;
  CreateDate?: Date;
  latitude?: number;
  longitude?: number;
  // Keyword/tag fields across XMP (dc:subject, lr:hierarchicalSubject) and IPTC.
  subject?: string | string[];
  Subject?: string | string[];
  Keywords?: string | string[];
  HierarchicalSubject?: string | string[];
}

const VETO_KEYWORD = "veto";

// True if any XMP/IPTC keyword equals "veto" (case-insensitive). Hierarchical
// tags like "Family|veto" are split on common separators so the leaf matches.
function hasVetoKeyword(exif: ExifResult | null): boolean {
  if (!exif) return false;
  const tags = [exif.subject, exif.Subject, exif.Keywords, exif.HierarchicalSubject].flatMap(
    (f) => (Array.isArray(f) ? f : f ? [f] : [])
  );
  return tags.some(
    (v) =>
      typeof v === "string" &&
      v
        .toLowerCase()
        .split(/[|>/,]/)
        .some((token) => token.trim() === VETO_KEYWORD)
  );
}

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

const rawCache = new Map<string, RawMeta>();
const geoCache = new Map<string, string | null>();
const inflightGeo = new Map<string, Promise<string | null>>();

const NOMINATIM_RATE_MS = 1100;
let lastNominatim = 0;

const FOLDER_DATE_RE = /\/(\d{4})\/(\d{2})\//;

function extractDate(exif: ExifResult | null, absPath: string, mtimeMs: number): Date {
  const dt = exif?.DateTimeOriginal ?? exif?.CreateDate;
  if (dt instanceof Date && !isNaN(dt.getTime())) return dt;

  // Fall back to folder structure YYYY/MM/...
  const m = absPath.match(FOLDER_DATE_RE);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (year >= 1970 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }

  return new Date(mtimeMs);
}

async function geocode(lat: number, lon: number, key: string): Promise<string | null> {
  try {
    const wait = NOMINATIM_RATE_MS - (Date.now() - lastNominatim);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatim = Date.now();

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "duneba-dashboard (personal use)" },
      // Cold requests from the kiosk's network were observed at ~5s.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    const addr = data.address ?? {};
    const place =
      addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? addr.state;
    const cc = addr.country_code?.toUpperCase() ?? addr.country ?? null;
    const formatted = place && cc ? `${place}, ${cc}` : (place ?? cc ?? null);
    geoCache.set(key, formatted);
    return formatted;
  } catch (err) {
    // Failures are deliberately not cached — a later request retries.
    console.error("Geocode failed:", err);
    return null;
  }
}

export async function getPhotoMeta(absPath: string): Promise<PhotoMeta> {
  const stat = await fs.stat(absPath);
  const rawKey = `${absPath}::${stat.mtimeMs}`;

  let raw = rawCache.get(rawKey);
  if (!raw) {
    let exif: ExifResult | null = null;
    try {
      exif = (await exifr.parse(absPath, {
        gps: true,
        xmp: true,
        iptc: true,
      })) as ExifResult | null;
    } catch (err) {
      // Fallbacks cover missing EXIF, but log it — a broken parser must not
      // be indistinguishable from "file has no metadata".
      console.warn(
        `EXIF parse failed for ${absPath}:`,
        err instanceof Error ? err.message : err
      );
    }
    const date = extractDate(exif, absPath, stat.mtimeMs);
    raw = {
      date: format(date, "dd-MMM-yyyy"),
      lat: typeof exif?.latitude === "number" ? exif.latitude : null,
      lon: typeof exif?.longitude === "number" ? exif.longitude : null,
      veto: hasVetoKeyword(exif),
    };
    rawCache.set(rawKey, raw);
  }

  let location: string | null = null;
  if (raw.lat !== null && raw.lon !== null) {
    const geoKey = `${raw.lat.toFixed(3)},${raw.lon.toFixed(3)}`;
    if (geoCache.has(geoKey)) {
      location = geoCache.get(geoKey) ?? null;
    } else {
      let pending = inflightGeo.get(geoKey);
      if (!pending) {
        pending = geocode(raw.lat, raw.lon, geoKey);
        inflightGeo.set(geoKey, pending);
        void pending.finally(() => inflightGeo.delete(geoKey));
      }
      location = await pending;
    }
  }

  return { date: raw.date, location, veto: raw.veto };
}
