import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_ENTRIES = 30;

const cache = new Map<string, Buffer>();

export async function getTranscodedHeic(absPath: string): Promise<Buffer> {
  const stat = await fs.stat(absPath);
  const key = `${absPath}::${stat.mtimeMs}`;

  const hit = cache.get(key);
  if (hit) {
    // Refresh insertion order so frequent hits stay alive longer.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const tmp = path.join(
    tmpdir(),
    `heic-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  );

  try {
    await execFileAsync("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", "85",
      absPath,
      "--out", tmp,
    ]);
    const bytes = await fs.readFile(tmp);
    cache.set(key, bytes);
    if (cache.size > MAX_ENTRIES) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    return bytes;
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}
