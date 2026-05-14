import { promises as fs } from "node:fs";
import { format } from "date-fns";
import exifr from "exifr";

export interface PhotoMeta {
  date: string;
  location: string | null;
}

interface RawMeta {
  date: string;
  lat: number | null;
  lon: number | null;
}

interface ExifResult {
  DateTimeOriginal?: Date;
  CreateDate?: Date;
  latitude?: number;
  longitude?: number;
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
const inflightGeo = new Set<string>();

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

async function geocode(lat: number, lon: number, key: string): Promise<void> {
  if (inflightGeo.has(key)) return;
  inflightGeo.add(key);
  try {
    const wait = NOMINATIM_RATE_MS - (Date.now() - lastNominatim);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatim = Date.now();

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "duneba-dashboard (personal use)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      geoCache.set(key, null);
      return;
    }
    const data = (await res.json()) as NominatimResponse;
    const addr = data.address ?? {};
    const place =
      addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? addr.state;
    const cc = addr.country_code?.toUpperCase() ?? addr.country ?? null;
    const formatted = place && cc ? `${place}, ${cc}` : (place ?? cc ?? null);
    geoCache.set(key, formatted);
  } catch (err) {
    console.error("Geocode failed:", err);
    geoCache.set(key, null);
  } finally {
    inflightGeo.delete(key);
  }
}

export async function getPhotoMeta(absPath: string): Promise<PhotoMeta> {
  const stat = await fs.stat(absPath);
  const rawKey = `${absPath}::${stat.mtimeMs}`;

  let raw = rawCache.get(rawKey);
  if (!raw) {
    let exif: ExifResult | null = null;
    try {
      exif = (await exifr.parse(absPath, { gps: true })) as ExifResult | null;
    } catch {
      // File has no EXIF, or parser failed — both fine, we have fallbacks.
    }
    const date = extractDate(exif, absPath, stat.mtimeMs);
    raw = {
      date: format(date, "dd-MMM-yyyy"),
      lat: typeof exif?.latitude === "number" ? exif.latitude : null,
      lon: typeof exif?.longitude === "number" ? exif.longitude : null,
    };
    rawCache.set(rawKey, raw);
  }

  let location: string | null = null;
  if (raw.lat !== null && raw.lon !== null) {
    const geoKey = `${raw.lat.toFixed(3)},${raw.lon.toFixed(3)}`;
    if (geoCache.has(geoKey)) {
      location = geoCache.get(geoKey) ?? null;
    } else {
      // Fire-and-forget so the first photo at a new location isn't delayed.
      // The result populates the cache for subsequent photos near the same spot.
      void geocode(raw.lat, raw.lon, geoKey);
    }
  }

  return { date: raw.date, location };
}
