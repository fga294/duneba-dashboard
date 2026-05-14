# Family Photos Rotator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Family Photos widget with a real rotator that picks a random photo from `/Volumes/home/Photos/PhotoLibrary` (recursive, `.jpg`/`.jpeg`/`.heic` case-insensitive) every 30 seconds and crossfades it inside the existing widget frame.

**Architecture:** Two new API routes (`/api/photos/random` returns an opaque id; `/api/photos/file` streams bytes, transcoding HEIC via macOS `sips` on the fly). A module-level photo index (lazy build, 1h TTL) backs the random pick. The widget keeps two stacked `<img>` layers with `object-contain` and toggles opacity for a 600ms crossfade.

**Tech Stack:** Next.js 16.2.3 App Router, React 19, SWR 2.x, NextAuth v4, Node 20+ `fs.promises`, macOS `sips` via `child_process.execFile`.

**Project note — no test runner:** This project has no Jest/Vitest/Playwright. "Tests" in this plan are **manual verifications** (curl, browser, console). Each task still follows define-behaviour → implement → verify → commit.

**Learning-mode checkpoint:** Task 5 stops for the user to implement `isAllowedPhotoPath`. Do not skip past it.

---

## Task 1: Types + env var documentation

**Files:**
- Modify: `src/types/dashboard.ts`
- Modify: `CLAUDE.md` (env list at the bottom of the file)

- [ ] **Step 1: Define the API response type**

Append to `src/types/dashboard.ts`:

```ts
export interface RandomPhotoResponse {
  id: string;
}
```

- [ ] **Step 2: Document the new env var**

In `CLAUDE.md`, find the line under "Environment variables" that reads:

```
Required in `.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ALLOWED_EMAIL`, `WEATHERAPI_KEY`, `WEATHER_LOCATION`, `CALENDAR_NAME`.
```

Add a new paragraph immediately below it:

```
Optional: `PHOTOS_DIR` (default `/Volumes/home/Photos/PhotoLibrary`). Root directory for the Family Photos widget. Scanned recursively for `.jpg`/`.jpeg`/`.heic` files. HEIC files are transcoded to JPEG on demand via macOS `sips`, so this widget requires the dev server to run on macOS.
```

- [ ] **Step 3: Verify TypeScript still compiles**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/dashboard.ts CLAUDE.md
git commit -m "feat(photos): add RandomPhotoResponse type and PHOTOS_DIR env doc"
```

---

## Task 2: Photo index module

**Files:**
- Create: `src/lib/photo-index.ts`

This module owns the in-memory list of allowed photo paths. Singleton state, lazy build, 1-hour TTL, no stale-while-revalidate (per spec). A separate `inflight` promise prevents stampedes if two requests race a cold cache.

- [ ] **Step 1: Create the file**

Write `src/lib/photo-index.ts`:

```ts
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
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

End-to-end verification is deferred to Task 3 (the random route consumes this module).

```bash
git add src/lib/photo-index.ts
git commit -m "feat(photos): add recursive photo index with TTL cache"
```

---

## Task 3: Random API route + end-to-end index verification

**Files:**
- Create: `src/app/api/photos/random/route.ts`

- [ ] **Step 1: Write the route**

Write `src/app/api/photos/random/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPhotoIndex } from "@/lib/photo-index";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.error) {
    return NextResponse.json(
      { error: session?.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const paths = await getPhotoIndex();
    if (paths.length === 0) {
      return NextResponse.json(
        { error: "no-photos-found" },
        { status: 503 }
      );
    }
    const pick = paths[Math.floor(Math.random() * paths.length)];
    const id = Buffer.from(pick, "utf8").toString("base64url");
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Photo index error:", err);
    return NextResponse.json(
      { error: "photos-dir-unavailable" },
      { status: 503 }
    );
  }
}
```

`export const dynamic = "force-dynamic"` prevents Next from caching the route's response — without it, the random pick could be cached for the entire dev session.

- [ ] **Step 2: Verify in the browser**

The dev server should already be running (started earlier). If not, run `npm run dev` and wait for "Ready in".

In a browser already logged into the dashboard, visit:

```
http://localhost:3000/api/photos/random
```

Expected: a JSON response like `{"id":"L1ZvbHVtZXMvaG9tZS9QaG90b3Mv..."}`. **The first request may take 5–30 seconds while the index builds over the network mount** — that's the chosen blocking-first-scan behaviour.

Reload the page. Expected: a different (or possibly same — pure random) id, returning immediately (index is cached).

- [ ] **Step 3: Verify the id decodes to a real path**

In a terminal, decode the id from the response above (replace `<ID>`):

```bash
echo -n "<ID>" | base64 -d
```

Expected output: an absolute path under `/Volumes/home/Photos/PhotoLibrary/...` ending in `.jpg`, `.jpeg`, `.JPG`, or `.HEIC`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/photos/random/route.ts
git commit -m "feat(photos): add /api/photos/random endpoint"
```

---

## Task 4: HEIC transcode cache module

**Files:**
- Create: `src/lib/heic-cache.ts`

This module wraps `sips -s format jpeg` and caches the resulting JPEG bytes in-memory. Cache key is `${absPath}::${mtimeMs}` so file edits invalidate naturally. FIFO eviction at 30 entries (sufficient for random access patterns — true LRU adds complexity for no real gain).

Critical: use `execFile`, not `exec`. `exec` invokes a shell, which means filenames containing spaces or shell metacharacters could be interpreted as arguments. Photo libraries are full of files like `Birthday 2018.HEIC` — `execFile` passes the path as a literal argv entry, bypassing the shell entirely.

- [ ] **Step 1: Create the file**

Write `src/lib/heic-cache.ts`:

```ts
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
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

End-to-end verification is deferred to Task 6 (the file route exercises this module).

```bash
git add src/lib/heic-cache.ts
git commit -m "feat(photos): add HEIC transcode cache using macOS sips"
```

---

## Task 5: File API route — scaffold with learning-mode TODO

**Files:**
- Create: `src/app/api/photos/file/route.ts`

This task **STOPS for user contribution**. The route is fully wired except for the security-boundary function `isAllowedPhotoPath`, which the user implements.

- [ ] **Step 1: Create the file with the TODO**

Write `src/app/api/photos/file/route.ts`:

```ts
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
```

- [ ] **Step 2: Lint check (function should be unused-friendly with `void`s)**

Run: `npm run lint`
Expected: no errors. (The `void absPath; void photosDir;` lines exist precisely so the placeholder doesn't trip `@typescript-eslint/no-unused-vars`.)

- [ ] **Step 3: STOP — ask the user to implement `isAllowedPhotoPath`**

Pause execution. Tell the user:

> "I've scaffolded `src/app/api/photos/file/route.ts`. The `isAllowedPhotoPath` function at the top is yours to implement (5–10 lines). Read the JSDoc — it lists three valid approaches with trade-offs. Tell me which one you want, or paste your implementation, and I'll continue with Task 6."

When the user responds, edit the function body to match their choice. Remove the `void absPath; void photosDir;` lines. Then commit:

```bash
git add src/app/api/photos/file/route.ts
git commit -m "feat(photos): add /api/photos/file with path-validation guard"
```

---

## Task 6: Verify the file route end-to-end

This task assumes Task 5's `isAllowedPhotoPath` is now implemented.

- [ ] **Step 1: Get a fresh JPG id**

In a browser (logged in), visit `http://localhost:3000/api/photos/random` repeatedly until you see an id whose decoded path ends in `.jpg` or `.JPG`.

```bash
echo -n "<ID>" | base64 -d   # should end in .jpg/.JPG
```

- [ ] **Step 2: Verify JPG streaming**

In the same browser, visit:

```
http://localhost:3000/api/photos/file?id=<ID>
```

Expected: the photo renders. Inspect the network panel — `Content-Type: image/jpeg`, status 200.

- [ ] **Step 3: Get a HEIC id**

Reload `/api/photos/random` until an id decodes to a `.HEIC` path. Files under `/Volumes/home/Photos/PhotoLibrary/2021/06/` are a good source — they include `IMG_9475.HEIC` etc.

If random isn't cooperating, you can also encode a known HEIC manually:

```bash
echo -n "/Volumes/home/Photos/PhotoLibrary/2021/06/IMG_9475.HEIC" \
  | basenc --base64url -w0
# or, if `basenc` isn't available:
node -e 'console.log(Buffer.from("/Volumes/home/Photos/PhotoLibrary/2021/06/IMG_9475.HEIC").toString("base64url"))'
```

- [ ] **Step 4: Verify HEIC transcoding**

Visit `http://localhost:3000/api/photos/file?id=<HEIC_ID>`.

Expected: the photo renders as JPEG. First request takes 200–800ms (sips transcode). Reload the same id — second request should be near-instant (cache hit). Check dev-server console for any `sips` errors.

- [ ] **Step 5: Verify path-traversal is blocked**

```bash
ENCODED=$(node -e 'console.log(Buffer.from("/etc/passwd").toString("base64url"))')
curl -s -o /dev/null -w "%{http_code}\n" \
  --cookie "next-auth.session-token=<your-session-cookie>" \
  "http://localhost:3000/api/photos/file?id=$ENCODED"
```

Expected: `403`. (If the dev server returns 200 or 500 instead, the validation function is wrong — go back to Task 5 and fix it.)

To grab the session cookie, open DevTools → Application → Cookies on localhost:3000 and copy `next-auth.session-token`.

- [ ] **Step 6: No commit needed**

(Task 5 already committed the route. This task is verification only.)

---

## Task 7: Rewrite the family-photos-widget

**Files:**
- Modify: `src/components/dashboard/family-photos-widget.tsx` (full rewrite)

The widget keeps the existing header + gradient frame and renders two stacked `<img>` layers. SWR polls `/api/photos/random` every 30s. When a new id arrives, it loads into the hidden layer; the layer's `onLoad` flips `showFront`, triggering a 600ms opacity transition on both layers.

The state model needs care to avoid effect loops — the guard `currentHidden?.id === data.id` prevents re-issuing a setState when the hidden layer is already loading the latest id.

- [ ] **Step 1: Replace the widget**

Overwrite `src/components/dashboard/family-photos-widget.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import type { RandomPhotoResponse } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface Layer {
  id: string;
  loaded: boolean;
}

export function FamilyPhotosWidget() {
  const { data, error } = useSWR<RandomPhotoResponse>(
    "/api/photos/random",
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const [front, setFront] = useState<Layer | null>(null);
  const [back, setBack] = useState<Layer | null>(null);
  const [showFront, setShowFront] = useState(true);

  useEffect(() => {
    if (!data?.id) return;
    const visible = showFront ? front : back;
    const hidden = showFront ? back : front;
    if (visible?.id === data.id) return;
    if (hidden?.id === data.id) return;
    if (showFront) {
      setBack({ id: data.id, loaded: false });
    } else {
      setFront({ id: data.id, loaded: false });
    }
  }, [data?.id, front, back, showFront]);

  const handleLoad = (which: "front" | "back") => {
    if (which === "front") {
      setFront((f) => (f ? { ...f, loaded: true } : f));
      if (!showFront) setShowFront(true);
    } else {
      setBack((b) => (b ? { ...b, loaded: true } : b));
      if (showFront) setShowFront(false);
    }
  };

  const hasAnyPhoto = Boolean(front || back);

  return (
    <Card>
      <CardContent className="flex h-full flex-col py-2">
        <div className="mb-3 flex items-center gap-2">
          <ImageIcon
            className="h-3.5 w-3.5 text-[color:var(--accent-1)]"
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
            Family Photos
          </p>
        </div>

        <div
          className="relative flex-1 overflow-hidden rounded-xl ring-1 ring-white/[0.08]"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 250 / 0.18) 0%, oklch(0.82 0.13 195 / 0.12) 50%, oklch(0.75 0.14 300 / 0.18) 100%)",
            boxShadow: "inset 0 1px 0 0 oklch(1 0 0 / 0.08)",
          }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.06) 0%, transparent 50%), radial-gradient(circle at 70% 70%, oklch(0.72 0.18 250 / 0.15) 0%, transparent 50%)",
            }}
            aria-hidden
          />

          {front && (
            <img
              key={`front-${front.id}`}
              src={`/api/photos/file?id=${front.id}`}
              alt=""
              onLoad={() => handleLoad("front")}
              className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[600ms]"
              style={{ opacity: showFront && front.loaded ? 1 : 0 }}
            />
          )}
          {back && (
            <img
              key={`back-${back.id}`}
              src={`/api/photos/file?id=${back.id}`}
              alt=""
              onLoad={() => handleLoad("back")}
              className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[600ms]"
              style={{ opacity: !showFront && back.loaded ? 1 : 0 }}
            />
          )}

          {!hasAnyPhoto && !error && (
            <div className="relative flex h-full items-center justify-center">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
                <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[color:var(--accent-1)] [animation-duration:0.9s]" />
              </div>
            </div>
          )}

          {error && !hasAnyPhoto && (
            <div className="relative flex h-full flex-col items-center justify-center gap-2 text-white/55">
              <ImageIcon
                className="h-10 w-10 text-[color:var(--accent-2)]"
                strokeWidth={1.25}
              />
              <span className="text-[11px] font-medium tracking-tight">
                Photos unavailable
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

Notes on key design points:

- Plain `<img>` (not `next/image`) is intentional — `next/image` requires either a domain allowlist or a remote-pattern config, and our API route is the bottleneck for both. A plain `<img>` is also what shadcn-style image components use under the hood.
- `key={\`front-${front.id}\`}` forces React to unmount the old image when the id changes, so the new `<img>` is a fresh DOM node — this prevents the browser from reusing a stale `complete=true` flag and skipping `onLoad`.
- `revalidateOnFocus: false` matters here. Default SWR behaviour is to refetch when the tab refocuses; for a passive ambient widget that would cause an unwanted photo swap every time you switch tabs.

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Verify in the browser**

The dev server should still be running. Visit `http://localhost:3000/`.

Expected within the Family Photos card:
1. A subtle spinner appears.
2. Within ~30s of a cold start (or instantly if the index is warm), a photo fades in.
3. After ~30s, a different photo crossfades in over ~600ms.
4. Portrait photos show gradient bars on the left and right (letterbox).
5. Landscape photos show gradient bars on top and bottom.

- [ ] **Step 4: Verify HEIC photos appear**

Watch for at least 2–3 rotations. With ~50% of the library being HEIC (2017+ era), at least one should be a HEIC photo. Inspect the network panel — confirm the response for that id has `Content-Type: image/jpeg` (the transcoded form), not `image/heic`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/family-photos-widget.tsx
git commit -m "feat(photos): replace placeholder with rotating crossfade gallery"
```

---

## Task 8: Final verification

- [ ] **Step 1: Production build smoke test**

Run: `npm run build`
Expected: build succeeds. Look out for any new warnings — particularly around `dynamic = "force-dynamic"` (which is what we want).

- [ ] **Step 2: Drive-unmounted resilience**

In a terminal:

```bash
# Find and unmount the volume (your specific mount name may differ)
ls /Volumes/
sudo umount /Volumes/home    # or whatever the exact mount is
```

Reload `http://localhost:3000/`. Expected:
- Within ~30s, the widget shows "Photos unavailable".
- The rest of the dashboard renders normally.
- The dev-server console shows a logged `Photo index error: ENOENT…` — that's the route's error path doing its job.

Remount the drive (Finder → Connect to Server, or it remounts when accessed). Reload the page. Expected: photos resume rotating (the index TTL is 1h, so you may need to wait — or restart the dev server to force a fresh scan).

- [ ] **Step 3: Aspect-ratio spot check**

Look at the widget for at least 5 photo rotations. Confirm:
- Every photo is fully visible (not cropped).
- The gradient background fills the letterbox margins.
- The widget's outer dimensions never change between photos.

- [ ] **Step 4: No commit needed.**

The work is complete and committed in earlier tasks. Optionally bundle progress into a PR — but per CLAUDE.md, only do this if the user asks.

---

## Files touched (summary)

**New:**
- `src/app/api/photos/random/route.ts`
- `src/app/api/photos/file/route.ts`
- `src/lib/photo-index.ts`
- `src/lib/heic-cache.ts`

**Modified:**
- `src/components/dashboard/family-photos-widget.tsx` (full rewrite — header kept)
- `src/types/dashboard.ts` (+1 interface)
- `CLAUDE.md` (+1 env var doc paragraph)

**Unchanged:**
- `src/app/page.tsx` (widget slot stays put)
- Auth, all other widgets, layout grid, Tailwind config

## Notes for the executor

- **Do not skip the Task 5 stop.** The user is implementing `isAllowedPhotoPath` themselves as a learning contribution. If you implement it instead, you have failed the task.
- **Do not introduce `sharp` or any image lib.** The plan is deliberately dep-free for HEIC by leaning on macOS `sips`.
- **Do not pre-cache photos eagerly.** First scan is on-demand; transcode cache fills via random access. Building either at boot would slow `npm run dev` and provide no benefit.
- **If `npm run lint` complains** about unused imports or types, fix them inline — do not add `// eslint-disable` directives.
