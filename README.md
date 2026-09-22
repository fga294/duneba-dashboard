# Duneba Dashboard

A single-user family dashboard for a kiosk screen: calendar, weather, tasks, an Almanac deck, and a rotating family photo frame fed from the NAS.

## How the photo frame picks photos (explained for a 10-year-old)

Imagine our family has one **giant box of photos** on the computer in the cupboard (the NAS). Inside the box are lots of smaller boxes — one for each year, and inside those one for each month — but the dashboard doesn't care about the boxes. It just wants *every photo in the whole thing*.

There's a little **robot** whose only job is to run this photo frame. These are its rules:

1. **Only real photos.** The robot only picks up files that are photos (JPEGs and the ones iPhones make, called HEIC). Videos, screenshots and other random files it just walks past.

2. **It makes a list once an hour.** Counting every photo in the box takes a while, so the robot writes them all down on a list and uses the list for the next hour. That's why if you put a new photo in the box, it can take up to an hour before it can show up.

3. **Every 20 seconds, pick one at random.** Eyes closed, hand in the box, grab one. It doesn't remember what it showed before, and it doesn't have favourites — so sometimes you'll see the same photo again soon, and sometimes a photo won't come up for ages. That's just luck.

4. **The "veto" sticker.** If someone puts a sticker on a photo that says *veto* (in the Synology Photos app), the robot must **put it back and grab another one**. It checks the sticker list every 6 hours, so a new sticker can take up to 6 hours to work. It will try up to 15 grabs in a row to find one without a sticker — if it's *really* unlucky and all 15 have stickers, it just leaves the current photo on the screen a bit longer and tries again next time.

5. **iPhone photos get translated.** The screen can't read HEIC photos directly, so the robot quickly converts each one to a JPEG before showing it — and remembers the last 30 it converted so it doesn't have to do it twice.

6. **Fade, don't flick.** The new photo fades in over about half a second, and it's zoomed to fill the frame (so the edges might be cropped a little). Underneath it writes when and where the photo was taken, if the photo knows.

7. **If the cupboard computer is off,** the frame says "Photos unavailable" and the rest of the dashboard keeps working. When it comes back, the photos come back.

8. **It's only for us.** You have to be logged in as the family account to see any of it — nobody outside can peek in the box.

### The numbers, for when a grown-up asks

| Rule | Value | Where |
|---|---|---|
| Source | `PHOTOS_DIR`, scanned recursively | `src/lib/photo-index.ts` |
| File types | `.jpg` / `.jpeg` / `.heic`, any case | `src/lib/photo-index.ts` |
| Index refresh | every 1 hour | `src/lib/photo-index.ts` |
| New photo | every 20 s, uniform random | `src/components/dashboard/family-photos-widget.tsx` |
| Veto sources | Synology Photos `veto` tag **or** embedded XMP/IPTC keyword `veto` | `src/lib/photo-vetoes.ts`, `src/lib/photo-meta.ts` |
| Veto list refresh | every 6 hours | `src/lib/photo-vetoes.ts` |
| Re-pick budget | 15 tries, then hold the current photo | `src/app/api/photos/random/route.ts` |
| HEIC cache | last 30 conversions | `src/lib/heic-cache.ts` |
| Crossfade | 600 ms | `src/components/dashboard/family-photos-widget.tsx` |

The original design, and how the shipped version drifted from it, lives in [`docs/superpowers/plans/2026-05-14-family-photos-rotator.md`](docs/superpowers/plans/2026-05-14-family-photos-rotator.md).

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
