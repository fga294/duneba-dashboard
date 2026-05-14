import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPhotoIndex, getPhotosDir } from "@/lib/photo-index";
import { getTranscodedHeic } from "@/lib/heic-cache";
import { promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_EXT = /\.(jpe?g|heic)$/i;

/**
 * Validate that `absPath` is safe to serve as a Family Photos image.
 *
 * Two checks the route relies on this function to enforce:
 *   1. PATH SAFETY — `absPath` must live inside `photosDir`. An attacker
 *      who can submit any base64url `id` must not be able to read
 *      `/etc/passwd` or `~/.ssh/id_rsa` by encoding their path.
 *   2. EXTENSION — `absPath` must match `ALLOWED_EXT` (defined above).
 *      Even if path safety passes, we never serve arbitrary files inside
 *      the photo library (e.g. `convert_video.sh` exists in the parent).
 *
 * Three approaches (each ~3–6 lines). Pick one:
 *
 *   A. `path.resolve` + `startsWith` (watch the trailing-separator trap)
 *      ```
 *      const dir = photosDir.endsWith(path.sep) ? photosDir : photosDir + path.sep;
 *      return absPath.startsWith(dir) && ALLOWED_EXT.test(absPath);
 *      ```
 *      Pro: dead simple. Con: easy to mess up the separator and accidentally
 *      accept `/Volumes/home/Photos/PhotoLibraryEvil/...`.
 *
 *   B. `path.relative` (idiomatic)
 *      ```
 *      const rel = path.relative(photosDir, absPath);
 *      return (
 *        rel !== "" &&
 *        !rel.startsWith("..") &&
 *        !path.isAbsolute(rel) &&
 *        ALLOWED_EXT.test(absPath)
 *      );
 *      ```
 *      Pro: no separator pitfalls, reads naturally. Con: 4 conditions to keep right.
 *
 *   C. Allowlist against the live index (strongest)
 *      ```
 *      const index = await getPhotoIndex();
 *      return index.includes(absPath) && ALLOWED_EXT.test(absPath);
 *      ```
 *      Pro: only paths the server itself indexed are allowed — implicitly handles
 *      path traversal AND extension AND existence. Con: adds latency on every
 *      file fetch; couples the route to the index module.
 *
 * Note: both `absPath` and `photosDir` arrive already passed through
 * `path.resolve()` — you can rely on them being absolute and normalized.
 *
 * TODO(user): implement this function. Pick approach A, B, or C above
 * (or your own — but it must satisfy both checks).
 */
async function isAllowedPhotoPath(
  absPath: string,
  photosDir: string
): Promise<boolean> {
  // TODO(user): implement
  void absPath;
  void photosDir;
  return false;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.error) {
    return NextResponse.json(
      { error: session?.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing-id" }, { status: 400 });
  }

  let decodedPath: string;
  try {
    decodedPath = Buffer.from(id, "base64url").toString("utf8");
  } catch {
    return NextResponse.json({ error: "invalid-id" }, { status: 400 });
  }

  const resolved = path.resolve(decodedPath);
  const photosDir = path.resolve(getPhotosDir());

  if (!(await isAllowedPhotoPath(resolved, photosDir))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Defence-in-depth: even if path validation passes, only serve files the
  // server itself indexed. Redundant if `isAllowedPhotoPath` already does this
  // (approach C), harmless otherwise. Returns 404 — the path may be valid
  // syntactically but not part of our advertised set.
  const index = await getPhotoIndex();
  if (!index.includes(resolved)) {
    return NextResponse.json({ error: "not-indexed" }, { status: 404 });
  }

  try {
    const isHeic = /\.heic$/i.test(resolved);
    const bytes = isHeic
      ? await getTranscodedHeic(resolved)
      : await fs.readFile(resolved);

    // `bytes` is a Node Buffer; NextResponse accepts BodyInit. Wrap into
    // a fresh ArrayBuffer view to satisfy the BodyInit type cleanly.
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Photo file error:", err);
    return NextResponse.json(
      { error: "file-read-failed" },
      { status: 500 }
    );
  }
}
