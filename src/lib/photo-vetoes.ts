import path from "node:path";
import { getPhotosDir } from "@/lib/photo-index";

// Synology Photos keeps manually-applied tags (like "veto") in its own database
// — they are never written into the image files' EXIF/XMP/IPTC. This module
// pulls the set of veto-tagged photos via the Synology Photos Web API and maps
// them to absolute paths under PHOTOS_DIR, so the random route can skip them.
//
// Fail-open by design: if the env vars are missing or the NAS is unreachable,
// the dashboard serves photos unfiltered rather than blanking the frame.

const SYNO_URL = process.env.SYNO_PHOTOS_URL;
const SYNO_USER = process.env.SYNO_PHOTOS_USER;
const SYNO_PASSWORD = process.env.SYNO_PHOTOS_PASSWORD;

const VETO_TAG = "veto";
const TTL_MS = 6 * 60 * 60 * 1000;
// After a failed sync, retry sooner than the full TTL (but not per-request).
const RETRY_MS = 5 * 60 * 1000;
const PAGE = 100;
const TIMEOUT_MS = 10_000;

const EMPTY: ReadonlySet<string> = new Set<string>();

let cache: { set: ReadonlySet<string>; loadedAt: number } | null = null;
let inflight: Promise<ReadonlySet<string>> | null = null;

interface SynoEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: number };
}

async function syno<T>(
  baseUrl: string,
  params: Record<string, string>
): Promise<T> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${baseUrl}/webapi/entry.cgi?${qs}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`DSM HTTP ${res.status}`);
  const json = (await res.json()) as SynoEnvelope<T>;
  if (!json.success || json.data === undefined) {
    throw new Error(`DSM API error ${json.error?.code ?? "unknown"}`);
  }
  return json.data;
}

async function fetchVetoSet(
  baseUrl: string,
  account: string,
  passwd: string
): Promise<Set<string>> {
  const { sid } = await syno<{ sid: string }>(baseUrl, {
    api: "SYNO.API.Auth",
    version: "6",
    method: "login",
    account,
    passwd,
    format: "sid",
  });

  try {
    const { list: tags } = await syno<{ list: { id: number; name: string }[] }>(
      baseUrl,
      {
        api: "SYNO.Foto.Browse.GeneralTag",
        version: "1",
        method: "list",
        offset: "0",
        limit: "500",
        _sid: sid,
      }
    );
    const veto = tags.find((t) => t.name.toLowerCase() === VETO_TAG);
    if (!veto) return new Set();

    // Page through every item carrying the tag.
    const items: { filename: string; folder_id: number }[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const { list } = await syno<{
        list: { filename: string; folder_id: number }[];
      }>(baseUrl, {
        api: "SYNO.Foto.Browse.Item",
        version: "1",
        method: "list",
        offset: String(offset),
        limit: String(PAGE),
        general_tag_id: String(veto.id),
        _sid: sid,
      });
      items.push(...list);
      if (list.length < PAGE) break;
    }

    // Resolve folder ids to names ("/PhotoLibrary/2026/02") — one call per
    // unique folder, typically a handful.
    const folderNames = new Map<number, string>();
    for (const id of new Set(items.map((i) => i.folder_id))) {
      const { folder } = await syno<{ folder: { name: string } }>(baseUrl, {
        api: "SYNO.Foto.Browse.Folder",
        version: "1",
        method: "get",
        id: String(id),
        _sid: sid,
      });
      folderNames.set(id, folder.name);
    }

    // Folder names are relative to the Synology Photos personal-space root —
    // the PARENT of PhotoLibrary in this setup (verified: folder "/PhotoLibrary/
    // 2026/02" + filename lands at <space-root>/PhotoLibrary/2026/02/<file>).
    // Try both candidate roots and keep whichever lands inside PHOTOS_DIR, so
    // a PHOTOS_DIR pointed directly at the space root still maps correctly.
    const photosDir = path.resolve(getPhotosDir());
    const roots = [path.dirname(photosDir), photosDir];
    const set = new Set<string>();
    for (const it of items) {
      const folder = folderNames.get(it.folder_id);
      if (!folder) continue;
      for (const root of roots) {
        const abs = path.resolve(path.join(root, folder, it.filename));
        if (abs.startsWith(photosDir + path.sep)) {
          set.add(abs);
          break;
        }
      }
    }
    return set;
  } finally {
    void syno<Record<string, never>>(baseUrl, {
      api: "SYNO.API.Auth",
      version: "6",
      method: "logout",
      _sid: sid,
    }).catch(() => {});
  }
}

// Cached set of absolute paths for veto-tagged photos. Never throws.
export async function getVetoSet(): Promise<ReadonlySet<string>> {
  if (!SYNO_URL || !SYNO_USER || !SYNO_PASSWORD) return EMPTY;
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.set;
  if (inflight) return inflight;

  const baseUrl = SYNO_URL;
  const user = SYNO_USER;
  const pass = SYNO_PASSWORD;
  inflight = fetchVetoSet(baseUrl, user, pass)
    .then((set) => {
      cache = { set, loadedAt: Date.now() };
      console.log(
        `photo-vetoes: ${set.size} veto-tagged photos loaded from Synology Photos`
      );
      return set as ReadonlySet<string>;
    })
    .catch((err) => {
      // Keep serving the previous set (stale beats none); retry in RETRY_MS.
      console.warn(
        "photo-vetoes: sync failed, serving previous/unfiltered:",
        err instanceof Error ? err.message : err
      );
      const prev = cache?.set ?? EMPTY;
      cache = { set: prev, loadedAt: Date.now() - TTL_MS + RETRY_MS };
      return prev;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
