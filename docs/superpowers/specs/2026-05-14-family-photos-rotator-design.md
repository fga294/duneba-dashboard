# Family Photos Rotator — Design

**Date:** 2026-05-14
**Status:** Approved (pending spec review)
**Branch:** `dashboard-revamp`

## Goal

Replace the placeholder `FamilyPhotosWidget` with a working photo rotator that displays one randomly-chosen photo from `/Volumes/home/Photos/PhotoLibrary`, swapping to a new photo every 30 seconds with a crossfade transition. Photos must be filtered to `.jpg`, `.jpeg`, `.heic` (case-insensitive). The photo must be displayed at its native aspect ratio, letterboxed inside the existing widget frame.

## Non-goals

- Photo metadata display (no captions, dates, EXIF).
- User controls (pause, next, favourite). Pure passive rotation.
- Persistence of viewing history across page reloads.
- Avoiding recent repeats (user chose pure random per tick).
- Cross-platform HEIC support — `sips` is macOS-only; this dashboard runs on the user's Mac.

## Architecture

### API surface (two new route handlers)

Both handlers live under `src/app/api/photos/` and follow the project's existing route pattern: `getServerSession(authOptions)` gate, 401 on missing session, typed JSON response shapes added to `src/types/dashboard.ts`.

**`GET /api/photos/random`**

- Returns `{ id: string }` where `id` is base64url-encoded absolute file path.
- Reads from the module-level photo index (see below). Picks one entry via `Math.floor(Math.random() * index.length)`.
- 503 if the index is empty (e.g., `PHOTOS_DIR` unmounted).

**`GET /api/photos/file?id=<id>`**

- Decodes `id`, validates the resolved path is within `PHOTOS_DIR` and has an allowed extension (defence in depth — the index is the source of truth, but the route does not trust client-supplied ids).
- For `.jpg`/`.jpeg`: streams the file with `Content-Type: image/jpeg`.
- For `.heic`/`.HEIC`: looks up `path+mtime` in the in-memory transcode cache. On miss, invokes `sips -s format jpeg -s formatOptions 85 <src> --out <tmp>`, reads the output, caches it (LRU, max 30 entries, ~150MB ceiling), unlinks the temp file, returns the bytes with `Content-Type: image/jpeg`.
- `Cache-Control: private, max-age=86400` so the browser caches each unique id for a day.

### Photo index (module-level, lazy, TTL'd)

Located in `src/lib/photo-index.ts`. Singleton state at module scope:

```ts
let cache: { paths: string[]; loadedAt: number } | null = null;
let inflight: Promise<string[]> | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour
```

Public function: `getPhotoIndex(): Promise<string[]>`.

Behaviour (chosen approach 1a — blocking first scan):

1. If `cache` is fresh, return `cache.paths`.
2. If `cache` is stale or null:
   - If `inflight` exists, await it (avoid stampede).
   - Otherwise start a new scan, store it in `inflight`, await it, replace `cache`, clear `inflight`.
3. Stale-while-revalidate (refresh in background while serving the stale list) is **not** included in v1 — it can be added later if rescans become noticeable.

Scan implementation: `fs.promises.readdir(PHOTOS_DIR, { recursive: true, withFileTypes: true })` (Node 20+ recursive option), filter to regular files with extension matching `/\.(jpe?g|heic)$/i`. The first scan on the network mount may take 5–30 seconds; the client widget shows the existing placeholder during this wait, and `/api/photos/random` simply takes that long to return its first 200.

### HEIC transcode cache (module-level LRU)

Located in `src/lib/heic-cache.ts`. Map keyed by `${absPath}::${mtimeMs}`, value is `Buffer`. Cap at 30 entries; evict oldest insertion on overflow (simple `Map` insertion-order eviction is sufficient — no need for true LRU since photos are picked uniformly at random and reuse is incidental).

### Environment variables

New optional var: `PHOTOS_DIR`. Default `/Volumes/home/Photos/PhotoLibrary`. Documented in `CLAUDE.md` env list.

## Widget behaviour

Rewrite `src/components/dashboard/family-photos-widget.tsx`:

- Keep the existing label header ("Family Photos" with icon) and the gradient framed container exactly as it is. The photo renders **inside** that container.
- State:
  - `currentId: string | null`, `nextId: string | null`
  - `frontImage: { id, loaded }`, `backImage: { id, loaded }` — two stacked `<img>` layers
  - `showFront: boolean` — which layer is on top
- Use `useSWR("/api/photos/random", fetcher, { refreshInterval: 30_000, revalidateOnFocus: false })`. The fetcher throws on non-OK (per project convention).
- When SWR returns a new `id` different from the current one:
  1. Load it into the back `<img>` (the one currently hidden).
  2. On the back `<img>`'s `onLoad`, flip `showFront` so the back becomes the front. Tailwind transitions `opacity` over 600ms.
- Both `<img>` elements: `className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[600ms]"` plus `opacity-100` / `opacity-0` based on `showFront`. The gradient background of the container shows through the letterbox bars.
- Until the first photo loads, show a centred subtle spinner (consistent with the dashboard's loading aesthetic) instead of the current `ImageIcon` placeholder. (Keep the icon if `error` is set — see below.) Note that the first `/api/photos/random` call may take up to ~30s on a cold start while the index builds; the rest of the dashboard renders normally during that wait — only this widget shows the spinner.
- Error state: if SWR throws (e.g., 503 because the mount is gone), show a small "Photos unavailable" caption over the gradient. SWR will retry on the next 30s tick automatically.

## Data shapes

In `src/types/dashboard.ts`:

```ts
export interface RandomPhotoResponse {
  id: string;
}
```

No type needed for the file endpoint (it returns binary).

## Security

- **Auth**: both routes use `getServerSession(authOptions)`; return 401 if no `accessToken` on session — same gate as `/api/calendar`.
- **Path validation** (this is the user's learning-mode contribution):
  - Function `isAllowedPhotoPath(decodedPath: string, photosDir: string): boolean` in `src/app/api/photos/file/route.ts`.
  - Must verify the resolved absolute path lies within `photosDir` (prevent `../` traversal) **and** has an allowed extension.
  - Multiple valid implementations; user chooses. See "Implementation contribution" below.
- **Index trust** (defence-in-depth): if the user picks approach 1 or 2 for `isAllowedPhotoPath`, the route additionally checks `index.includes(resolvedPath)` and returns 404 if absent. If the user picks approach 3, this check is already inherent and is not duplicated.

## Implementation contribution (learning mode)

The build will be ~90% scaffolded by me. The user implements **one focused function**: `isAllowedPhotoPath` in the file route (5–10 lines).

**Why this matters:** This is a security boundary. Three valid approaches with different trade-offs:

1. **`path.resolve` prefix check** — resolve both paths, compare with `startsWith`. Simple but a `startsWith` check against `/Volumes/home/Photos/PhotoLibrary` would accept `/Volumes/home/Photos/PhotoLibraryEvil/foo.jpg`. Need a trailing-separator or `path.relative` form.
2. **`path.relative` check** — `const rel = path.relative(photosDir, resolved); return !rel.startsWith('..') && !path.isAbsolute(rel);`. Cleanest; node-idiomatic.
3. **Allowlist against live index** — only paths in `getPhotoIndex()` are accepted. Strongest but adds latency and couples the route to the index.

The user will be shown context, signature, and a TODO marker, and choose an approach.

## Error handling

| Condition | API behaviour | Widget behaviour |
|---|---|---|
| `PHOTOS_DIR` unmounted / `readdir` throws ENOENT | 503 with `{ error: "photos-dir-unavailable" }` | "Photos unavailable" overlay; retry next tick. |
| Index empty (no matching files) | 503 with `{ error: "no-photos-found" }` | Same as above. |
| `sips` exits non-zero | 500 with `{ error: "transcode-failed" }` | Skip — SWR retries on next tick. |
| Invalid / unauthorized id on file route | 400 | Skip — SWR retries. |

No fatal client state. Every error self-heals on the next 30s revalidation.

## Testing

This project has **no test runner configured** (per `CLAUDE.md`). Verification is manual:

1. `npm run dev`, log in, observe a photo appears within ~30s of cold start.
2. Wait 30s, observe a new photo crossfades in.
3. Confirm at least one HEIC photo renders (look for a `.HEIC` file under `2021/` in network tab via the `id`).
4. Confirm letterboxing: a portrait photo should have bars at left/right showing the gradient.
5. Unplug the network drive (or `sudo umount /Volumes/home`), reload — confirm "Photos unavailable" appears and doesn't crash the page.

## Files touched

**New:**
- `src/app/api/photos/random/route.ts`
- `src/app/api/photos/file/route.ts`
- `src/lib/photo-index.ts`
- `src/lib/heic-cache.ts`

**Modified:**
- `src/components/dashboard/family-photos-widget.tsx` — full rewrite, header preserved.
- `src/types/dashboard.ts` — add `RandomPhotoResponse`.
- `CLAUDE.md` — add `PHOTOS_DIR` to env list.
- `.env.local` (user does this themselves) — optionally set `PHOTOS_DIR`.

**Unchanged:**
- `src/app/page.tsx` — widget slot stays put.
- Auth, other widgets, layout grid.

## Open questions / future work

- **Stale-while-revalidate index**: if the photo set grows or rescans become noticeable (>2s), switch to background revalidation. Out of scope for v1.
- **Smart shuffle**: weighted-by-recency or no-repeat-in-window. User explicitly chose pure random.
- **Preload-next**: could prefetch the next photo's bytes during the 30s window to avoid any load delay. Currently the SWR call to `/random` is what triggers the next fetch; that adds a few hundred ms before the crossfade starts. Acceptable for v1.
