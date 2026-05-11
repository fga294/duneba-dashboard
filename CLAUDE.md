# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The `@AGENTS.md` include above is load-bearing: this project pins **Next.js 16.2.3 + React 19.2.4**, which post-date most training data. Before writing Next.js or React code, consult `node_modules/next/dist/docs/` for the actual current APIs (App Router conventions, route handlers, `next/font`, etc.). Do not infer from older Next.js knowledge.

## Commands

- `npm run dev` — start dev server on http://localhost:3000
- `npm run build` — production build (uses Turbopack via Next 16 defaults)
- `npm run start` — run the built app
- `npm run lint` — ESLint (flat config; extends `eslint-config-next/core-web-vitals` and `/typescript`)

There is no test runner configured.

## Architecture

Single-user personal dashboard. One page (`/`) renders a grid of widgets; a second page (`/login`) handles Google OAuth.

### Auth is the spine

- `src/lib/auth.ts` defines `authOptions` for NextAuth (v4) with the Google provider.
- `signIn` callback **hard-restricts login to `ALLOWED_EMAIL`** — this is single-user by design; don't generalize without intent.
- Requested OAuth scopes include `calendar.readonly` and `tasks.readonly`. The `jwt` callback stores `accessToken` / `refreshToken` / `expiresAt` on the token and **refreshes against Google's token endpoint** when expired. `session` callback exposes `accessToken` (and `error`) to the server side.
- Session types are augmented in `src/types/next-auth.d.ts`.
- Page-level gate: `src/app/page.tsx` is a client component that calls `useSession()` and `redirect("/login")` when unauthenticated.
- API-level gate: every route under `src/app/api/*` calls `getServerSession(authOptions)` and returns 401 if no `accessToken`.

### Widget pattern (mirror this for new widgets)

Each widget is a `"use client"` component under `src/components/dashboard/` that fetches its own data via SWR from a typed route handler under `src/app/api/<name>/route.ts`. The route handler talks to the external service (Google APIs via `googleapis`, or `weatherapi.com` via `fetch`) using the session's access token or a server-side API key. Response shapes live in `src/types/dashboard.ts`.

SWR fetchers must throw on non-OK responses (see commit `8675e6f`) — don't silently resolve error responses; SWR's `error` state depends on the throw.

Loading states use the shared `<WidgetSkeleton/>` in `src/components/dashboard/widget-skeleton.tsx`.

### Calendar lookup quirk

`src/app/api/calendar/route.ts` resolves the target calendar by **name** via `calendarList.list()`, matching against `summary` or `summaryOverride`, then falls back to `primary`. The name comes from `CALENDAR_NAME` env var (default `"Family"`). Don't hard-code calendar IDs.

### UI stack

- Tailwind CSS v4 (PostCSS-only, no `tailwind.config.*` — config lives in `src/app/globals.css` via `@theme`/CSS variables).
- shadcn/ui (`components.json` style: `base-nova`, base color `neutral`, icon lib `lucide`). Generated primitives live in `src/components/ui/`.
- `@base-ui/react` for unstyled primitives.
- Path alias `@/*` → `src/*`.

### Environment variables

Required in `.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ALLOWED_EMAIL`, `WEATHERAPI_KEY`, `WEATHER_LOCATION`, `CALENDAR_NAME`.
