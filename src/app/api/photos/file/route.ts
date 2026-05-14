import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPhotoIndex, getPhotosDir } from "@/lib/photo-index";
import { getTranscodedHeic } from "@/lib/heic-cache";
import { promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_EXT = /\.(jpe?g|heic)$/i;

// Security boundary: rejects path-traversal attempts and non-image extensions.
// `path.relative` returning a "../"-prefixed or absolute path means absPath
// escapes photosDir, which would let a crafted id read arbitrary files.
async function isAllowedPhotoPath(
  absPath: string,
  photosDir: string
): Promise<boolean> {
  const rel = path.relative(photosDir, absPath);
  return (
    rel !== "" &&
    !rel.startsWith("..") &&
    !path.isAbsolute(rel) &&
    ALLOWED_EXT.test(absPath)
  );
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
