import { promises as fs } from "node:fs";
import path from "node:path";

const PHOTOS_DIR =
  process.env.PHOTOS_DIR ?? "/Volumes/home/Photos/PhotoLibrary";
const TTL_MS = 60 * 60 * 1000;
const ALLOWED_EXT = /\.(jpe?g|heic)$/i;

let cache: { paths: string[]; loadedAt: number } | null = null;
let inflight: Promise<string[]> | null = null;

async function scan(): Promise<string[]> {
  const entries = await fs.readdir(PHOTOS_DIR, {
    recursive: true,
    withFileTypes: true,
  });
  const paths: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!ALLOWED_EXT.test(entry.name)) continue;
    paths.push(path.join(entry.parentPath, entry.name));
  }
  return paths;
}

export async function getPhotoIndex(): Promise<string[]> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.paths;
  if (inflight) return inflight;
  inflight = scan()
    .then((paths) => {
      cache = { paths, loadedAt: Date.now() };
      return paths;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function getPhotosDir(): string {
  return PHOTOS_DIR;
}
