# Personal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a beautiful, single-user personal dashboard displaying a live clock, 3-day Sydney weather forecast with moon phase, AUD↔BRL/USD exchange rates, Google Calendar events, and Google Tasks — deployed on Vercel.

**Architecture:** Next.js App Router with client-side SWR fetching from internal API route handlers that proxy to external APIs (weatherapi.com, frankfurter.app, Google Calendar/Tasks). NextAuth v4 handles Google OAuth with automatic token refresh for Calendar/Tasks access. All widgets are client components arranged in a responsive CSS grid. Dark theme with shadcn/ui.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, next-auth v4, SWR, date-fns, Lucide React, react-country-flag, weatherapi.com, frankfurter.app, Google Calendar API, Google Tasks API, Vercel.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout with providers, dark theme
│   ├── page.tsx                            # Dashboard grid (auth-gated)
│   ├── globals.css                         # Dark theme custom properties
│   ├── login/
│   │   └── page.tsx                        # Simple login page
│   └── api/
│       ├── auth/[...nextauth]/route.ts     # NextAuth handler
│       ├── weather/route.ts                # Weather + astronomy proxy
│       ├── currency/route.ts               # Exchange rate proxy
│       ├── calendar/route.ts               # Google Calendar proxy
│       └── tasks/route.ts                  # Google Tasks proxy
├── components/
│   ├── providers.tsx                       # SessionProvider wrapper
│   ├── ui/                                 # shadcn components (auto-generated)
│   └── dashboard/
│       ├── clock-widget.tsx                # Live clock + date
│       ├── weather-widget.tsx              # Current weather + 3-day forecast
│       ├── moon-phase-widget.tsx           # Moon phase + sunrise/sunset
│       ├── currency-widget.tsx             # AUD→BRL, AUD→USD with flags
│       ├── calendar-widget.tsx             # Google Calendar events
│       ├── tasks-widget.tsx                # Google Tasks
│       └── widget-skeleton.tsx             # Loading skeleton for all widgets
├── lib/
│   ├── auth.ts                             # NextAuth config + token refresh
│   ├── utils.ts                            # shadcn cn() + formatting helpers
│   └── weather-icons.tsx                   # Map weather conditions → Lucide icons
├── types/
│   ├── dashboard.ts                        # All data interfaces
│   └── next-auth.d.ts                      # NextAuth type augmentation
└── __tests__/
    └── lib/
        └── utils.test.ts                   # Formatting + utility tests
```

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `tailwind.config.ts`, `tsconfig.json`, `next.config.ts` (auto-generated)
- Create: `components.json` (shadcn config)
- Create: `src/components/ui/*` (shadcn components)

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/fabricio/Documents/duneba-dashboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Answer prompts: Yes to all defaults. Since there's already a `.gitignore` and `README.md`, it will merge or overwrite — accept the overwrites.

Expected: Project scaffolded with `src/app/`, `package.json`, `tailwind.config.ts`.

- [ ] **Step 2: Install project dependencies**

```bash
npm install next-auth@4 swr date-fns date-fns-tz react-country-flag lucide-react googleapis
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

This creates `components.json` and `src/lib/utils.ts`. Select defaults (New York style, Zinc base color, CSS variables: yes).

- [ ] **Step 4: Install shadcn components**

```bash
npx shadcn@latest add card badge skeleton separator scroll-area button
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui and dependencies"
```

---

### Task 2: Environment Configuration & Type Definitions

**Files:**
- Create: `.env.local`
- Create: `src/types/dashboard.ts`
- Create: `src/types/next-auth.d.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Extract Google credentials and create .env.local**

Read the credentials file and extract values:

```bash
cat /Users/fabricio/google/duneba-dashboard-credentials.json
```

Create `.env.local` with the extracted values:

```env
# Google OAuth (from duneba-dashboard-credentials.json → web.client_id / web.client_secret)
GOOGLE_CLIENT_ID=<paste client_id from credentials>
GOOGLE_CLIENT_SECRET=<paste client_secret from credentials>

# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Restrict login to this email
ALLOWED_EMAIL=<user's Google email>

# Weather API (https://www.weatherapi.com — free tier, sign up for key)
WEATHERAPI_KEY=<paste key from weatherapi.com>

# Location
WEATHER_LOCATION=Sydney,Australia
```

Generate the NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

- [ ] **Step 2: Create type definitions**

Create `src/types/dashboard.ts`:

```typescript
export interface WeatherCurrent {
  temp_c: number;
  feelslike_c: number;
  condition: string;
  condition_code: number;
  humidity: number;
  wind_kph: number;
  uv: number;
  is_day: boolean;
}

export interface ForecastDay {
  date: string;
  maxtemp_c: number;
  mintemp_c: number;
  condition: string;
  condition_code: number;
  chance_of_rain: number;
}

export interface Astronomy {
  moon_phase: string;
  moon_illumination: number;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
}

export interface WeatherData {
  current: WeatherCurrent;
  forecast: ForecastDay[];
  astronomy: Astronomy;
  location: string;
}

export interface CurrencyRates {
  base: string;
  date: string;
  rates: {
    BRL: number;
    USD: number;
  };
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  location?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;
  notes?: string;
}

export interface TaskList {
  id: string;
  title: string;
  tasks: TaskItem[];
}
```

- [ ] **Step 3: Create NextAuth type augmentation**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    error?: string;
  }
}
```

- [ ] **Step 4: Add formatting helpers to utils**

Modify `src/lib/utils.ts` — append after the existing `cn()` function:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SYDNEY_TZ = "Australia/Sydney";

export function sydneyTime(date: Date = new Date()): Date {
  return toZonedTime(date, SYDNEY_TZ);
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°`;
}

export function formatEventTime(dateStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const date = new Date(dateStr);
  return format(date, "h:mm a");
}
```

- [ ] **Step 5: Commit**

```bash
git add .env.local src/types/ src/lib/utils.ts
git commit -m "feat: add environment config, type definitions, and utility helpers"
```

---

### Task 3: NextAuth Google Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/components/providers.tsx`
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create NextAuth configuration**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      return user.email === process.env.ALLOWED_EMAIL;
    },
    async jwt({ token, account }) {
      // Initial sign-in: store tokens
      if (account) {
        return {
          ...token,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          expiresAt: account.expires_at! * 1000,
        };
      }

      // Token still valid
      if (Date.now() < token.expiresAt) {
        return token;
      }

      // Token expired — refresh it
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
          }),
        });

        const tokens = await response.json();

        if (!response.ok) throw tokens;

        return {
          ...token,
          accessToken: tokens.access_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        };
      } catch {
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
```

- [ ] **Step 2: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 3: Create session provider wrapper**

Create `src/components/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 4: Create login page**

Create `src/app/login/page.tsx`:

```typescript
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Duneba Dashboard</h1>
        <p className="text-muted-foreground">Sign in to access your personal dashboard</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-900 shadow hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/components/providers.tsx src/app/login/
git commit -m "feat: configure NextAuth with Google OAuth and token refresh"
```

---

### Task 4: Root Layout & Global Styles

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update root layout with providers and dark theme**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Duneba Dashboard",
  description: "Personal dashboard — weather, calendar, tasks, and more",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update global styles for dark dashboard theme**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --card: 224 71% 4%;
    --card-foreground: 213 31% 91%;
    --popover: 224 71% 4%;
    --popover-foreground: 213 31% 91%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 222.2 47.4% 11.2%;
    --secondary-foreground: 210 40% 98%;
    --muted: 223 47% 11%;
    --muted-foreground: 215.4 16.3% 56.9%;
    --accent: 216 34% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    --ring: 216 34% 17%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 3: Create dashboard page shell**

Replace `src/app/page.tsx`:

```typescript
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">
          Duneba Dashboard
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Widgets will be placed here in Task 14 */}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat: set up dark theme root layout and dashboard page shell"
```

---

### Task 5: DateTime / Clock Widget

**Files:**
- Create: `src/components/dashboard/clock-widget.tsx`

- [ ] **Step 1: Create the clock widget**

Create `src/components/dashboard/clock-widget.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { sydneyTime } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(sydneyTime());
    const interval = setInterval(() => setNow(sydneyTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  return (
    <Card className="col-span-1">
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span>Sydney, Australia</span>
        </div>
        <div className="text-5xl font-bold tabular-nums tracking-tight">
          {format(now, "HH:mm")}
        </div>
        <div className="text-2xl font-light tabular-nums text-muted-foreground">
          {format(now, "ss")}
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          {format(now, "EEEE, d MMMM yyyy")}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          <span>AEST</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify it renders**

Temporarily add to `src/app/page.tsx` inside the grid div:

```typescript
import { ClockWidget } from "@/components/dashboard/clock-widget";
// ...inside the grid div:
<ClockWidget />
```

Run `npm run dev` and verify the clock renders at `http://localhost:3000` (you'll need to be signed in).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/clock-widget.tsx src/app/page.tsx
git commit -m "feat: add live clock widget with Sydney timezone"
```

---

### Task 6: Weather API Route

**Files:**
- Create: `src/app/api/weather/route.ts`

- [ ] **Step 1: Create weather API route handler**

Create `src/app/api/weather/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { WeatherData } from "@/types/dashboard";

const WEATHER_API = "https://api.weatherapi.com/v1";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.WEATHERAPI_KEY;
  const location = process.env.WEATHER_LOCATION || "Sydney,Australia";

  const [forecastRes, astronomyRes] = await Promise.all([
    fetch(`${WEATHER_API}/forecast.json?key=${key}&q=${location}&days=3&aqi=no`),
    fetch(`${WEATHER_API}/astronomy.json?key=${key}&q=${location}`),
  ]);

  if (!forecastRes.ok || !astronomyRes.ok) {
    return NextResponse.json({ error: "Weather API error" }, { status: 502 });
  }

  const forecastData = await forecastRes.json();
  const astronomyData = await astronomyRes.json();

  const weather: WeatherData = {
    location: forecastData.location.name,
    current: {
      temp_c: forecastData.current.temp_c,
      feelslike_c: forecastData.current.feelslike_c,
      condition: forecastData.current.condition.text,
      condition_code: forecastData.current.condition.code,
      humidity: forecastData.current.humidity,
      wind_kph: forecastData.current.wind_kph,
      uv: forecastData.current.uv,
      is_day: forecastData.current.is_day === 1,
    },
    forecast: forecastData.forecast.forecastday.map(
      (day: Record<string, unknown>) => ({
        date: (day as { date: string }).date,
        maxtemp_c: (day as { day: { maxtemp_c: number } }).day.maxtemp_c,
        mintemp_c: (day as { day: { mintemp_c: number } }).day.mintemp_c,
        condition: (day as { day: { condition: { text: string } } }).day.condition.text,
        condition_code: (day as { day: { condition: { code: number } } }).day.condition.code,
        chance_of_rain: (day as { day: { daily_chance_of_rain: number } }).day.daily_chance_of_rain,
      })
    ),
    astronomy: {
      moon_phase: astronomyData.astronomy.astro.moon_phase,
      moon_illumination: parseInt(astronomyData.astronomy.astro.moon_illumination),
      sunrise: astronomyData.astronomy.astro.sunrise,
      sunset: astronomyData.astronomy.astro.sunset,
      moonrise: astronomyData.astronomy.astro.moonrise,
      moonset: astronomyData.astronomy.astro.moonset,
    },
  };

  return NextResponse.json(weather);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/weather/
git commit -m "feat: add weather API route with forecast and astronomy data"
```

---

### Task 7: Weather Widget & Moon Phase Widget

**Files:**
- Create: `src/lib/weather-icons.tsx`
- Create: `src/components/dashboard/weather-widget.tsx`
- Create: `src/components/dashboard/moon-phase-widget.tsx`

- [ ] **Step 1: Create weather condition → icon mapping**

Create `src/lib/weather-icons.tsx`:

```typescript
import {
  Sun, Moon, Cloud, CloudDrizzle, CloudRain, CloudSnow,
  CloudLightning, CloudFog, CloudSun, CloudMoon, Wind, Snowflake,
  type LucideIcon,
} from "lucide-react";

// weatherapi.com condition codes → Lucide icons
// Full list: https://www.weatherapi.com/docs/weather_conditions.json
const DAY_ICONS: Record<number, LucideIcon> = {
  1000: Sun,           // Sunny
  1003: CloudSun,      // Partly cloudy
  1006: Cloud,         // Cloudy
  1009: Cloud,         // Overcast
  1030: CloudFog,      // Mist
  1063: CloudDrizzle,  // Patchy rain
  1066: CloudSnow,     // Patchy snow
  1087: CloudLightning,// Thundery outbreaks
  1135: CloudFog,      // Fog
  1147: CloudFog,      // Freezing fog
  1150: CloudDrizzle,  // Light drizzle
  1153: CloudDrizzle,  // Light drizzle
  1168: CloudDrizzle,  // Freezing drizzle
  1180: CloudRain,     // Light rain
  1183: CloudRain,     // Light rain
  1186: CloudRain,     // Moderate rain
  1189: CloudRain,     // Moderate rain
  1192: CloudRain,     // Heavy rain
  1195: CloudRain,     // Heavy rain
  1198: CloudRain,     // Freezing rain
  1201: CloudRain,     // Heavy freezing rain
  1204: CloudSnow,     // Light sleet
  1207: CloudSnow,     // Heavy sleet
  1210: Snowflake,     // Light snow
  1213: Snowflake,     // Light snow
  1216: Snowflake,     // Moderate snow
  1219: Snowflake,     // Moderate snow
  1222: CloudSnow,     // Heavy snow
  1225: CloudSnow,     // Heavy snow
  1237: Snowflake,     // Ice pellets
  1240: CloudRain,     // Light rain shower
  1243: CloudRain,     // Heavy rain shower
  1246: CloudRain,     // Torrential rain
  1249: CloudSnow,     // Light sleet shower
  1252: CloudSnow,     // Heavy sleet shower
  1255: Snowflake,     // Light snow shower
  1258: CloudSnow,     // Heavy snow shower
  1261: Snowflake,     // Light ice pellets
  1264: Snowflake,     // Heavy ice pellets
  1273: CloudLightning,// Patchy light rain with thunder
  1276: CloudLightning,// Heavy rain with thunder
  1279: CloudLightning,// Patchy snow with thunder
  1282: CloudLightning,// Heavy snow with thunder
};

const NIGHT_OVERRIDES: Record<number, LucideIcon> = {
  1000: Moon,
  1003: CloudMoon,
};

export function getWeatherIcon(code: number, isDay: boolean): LucideIcon {
  if (!isDay && NIGHT_OVERRIDES[code]) {
    return NIGHT_OVERRIDES[code];
  }
  return DAY_ICONS[code] || Cloud;
}

const MOON_EMOJIS: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Third Quarter": "🌗",
  "Waning Crescent": "🌘",
};

export function getMoonEmoji(phase: string): string {
  return MOON_EMOJIS[phase] || "🌙";
}
```

- [ ] **Step 2: Create weather widget**

Create `src/components/dashboard/weather-widget.tsx`:

```typescript
"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Droplets, Wind, Thermometer } from "lucide-react";
import { getWeatherIcon } from "@/lib/weather-icons";
import { formatTemp } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { WeatherData } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function WeatherWidget() {
  const { data, isLoading, error } = useSWR<WeatherData>(
    "/api/weather",
    fetcher,
    { refreshInterval: 30 * 60 * 1000 } // 30 minutes
  );

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
            <Skeleton className="h-24 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Weather unavailable
        </CardContent>
      </Card>
    );
  }

  const CurrentIcon = getWeatherIcon(data.current.condition_code, data.current.is_day);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Weather — {data.location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current conditions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CurrentIcon className="h-12 w-12 text-yellow-400" />
            <div>
              <div className="text-4xl font-bold">{formatTemp(data.current.temp_c)}</div>
              <div className="text-sm text-muted-foreground">{data.current.condition}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              Feels {formatTemp(data.current.feelslike_c)}
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              {data.current.humidity}%
            </div>
            <div className="flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {Math.round(data.current.wind_kph)} km/h
            </div>
          </div>
        </div>

        {/* 3-day forecast */}
        <div className="grid grid-cols-3 gap-2">
          {data.forecast.map((day) => {
            const DayIcon = getWeatherIcon(day.condition_code, true);
            return (
              <div
                key={day.date}
                className="flex flex-col items-center rounded-lg bg-secondary/50 p-3"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {format(parseISO(day.date), "EEE")}
                </span>
                <DayIcon className="my-1.5 h-6 w-6" />
                <div className="flex gap-1 text-xs">
                  <span className="font-medium">{formatTemp(day.maxtemp_c)}</span>
                  <span className="text-muted-foreground">{formatTemp(day.mintemp_c)}</span>
                </div>
                {day.chance_of_rain > 0 && (
                  <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                    <Droplets className="mr-0.5 h-2.5 w-2.5" />
                    {day.chance_of_rain}%
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create moon phase widget**

Create `src/components/dashboard/moon-phase-widget.tsx`:

```typescript
"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sunrise, Sunset } from "lucide-react";
import { getMoonEmoji } from "@/lib/weather-icons";
import type { WeatherData } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MoonPhaseWidget() {
  const { data, isLoading } = useSWR<WeatherData>("/api/weather", fetcher, {
    refreshInterval: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardContent className="p-6">
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { astronomy } = data;

  return (
    <Card className="col-span-1">
      <CardContent className="flex flex-col items-center justify-center p-6">
        <span className="text-5xl" role="img" aria-label={astronomy.moon_phase}>
          {getMoonEmoji(astronomy.moon_phase)}
        </span>
        <div className="mt-2 text-sm font-medium">{astronomy.moon_phase}</div>
        <div className="text-xs text-muted-foreground">
          {astronomy.moon_illumination}% illumination
        </div>
        <div className="mt-3 flex w-full justify-around text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Sunrise className="h-3.5 w-3.5 text-amber-400" />
            {astronomy.sunrise}
          </div>
          <div className="flex items-center gap-1">
            <Sunset className="h-3.5 w-3.5 text-orange-400" />
            {astronomy.sunset}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/weather-icons.tsx src/components/dashboard/weather-widget.tsx src/components/dashboard/moon-phase-widget.tsx
git commit -m "feat: add weather forecast and moon phase widgets with condition icons"
```

---

### Task 8: Currency Exchange API Route

**Files:**
- Create: `src/app/api/currency/route.ts`

- [ ] **Step 1: Create currency API route handler**

Create `src/app/api/currency/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { CurrencyRates } from "@/types/dashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    "https://api.frankfurter.app/latest?from=AUD&to=BRL,USD"
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Currency API error" }, { status: 502 });
  }

  const data = await res.json();

  const rates: CurrencyRates = {
    base: data.base,
    date: data.date,
    rates: {
      BRL: data.rates.BRL,
      USD: data.rates.USD,
    },
  };

  return NextResponse.json(rates);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/currency/
git commit -m "feat: add currency exchange rate API route (AUD→BRL,USD)"
```

---

### Task 9: Currency Widget with Flags

**Files:**
- Create: `src/components/dashboard/currency-widget.tsx`

- [ ] **Step 1: Create currency widget**

Create `src/components/dashboard/currency-widget.tsx`:

```typescript
"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactCountryFlag from "react-country-flag";
import { ArrowRightLeft } from "lucide-react";
import type { CurrencyRates } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RateRowProps {
  countryCode: string;
  currency: string;
  rate: number;
}

function RateRow({ countryCode, currency, rate }: RateRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <ReactCountryFlag
          countryCode={countryCode}
          svg
          style={{ width: "1.5em", height: "1.5em" }}
          aria-label={currency}
        />
        <div>
          <div className="text-sm font-medium">AUD → {currency}</div>
          <div className="text-xs text-muted-foreground">
            1 AUD = {rate.toFixed(4)} {currency}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold tabular-nums">{rate.toFixed(2)}</div>
      </div>
    </div>
  );
}

export function CurrencyWidget() {
  const { data, isLoading, error } = useSWR<CurrencyRates>(
    "/api/currency",
    fetcher,
    { refreshInterval: 60 * 60 * 1000 } // 1 hour
  );

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-1">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Rates unavailable
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" />
          Exchange Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <RateRow countryCode="BR" currency="BRL" rate={data.rates.BRL} />
        <RateRow countryCode="US" currency="USD" rate={data.rates.USD} />
        <div className="pt-1 text-[10px] text-muted-foreground text-center">
          Updated {data.date}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/currency-widget.tsx
git commit -m "feat: add currency exchange widget with country flags"
```

---

### Task 10: Google Calendar API Route

**Files:**
- Create: `src/app/api/calendar/route.ts`

- [ ] **Step 1: Create calendar API route handler**

Create `src/app/api/calendar/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import type { CalendarEvent } from "@/types/dashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: endOfWeek.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    const events: CalendarEvent[] = (res.data.items || []).map((event) => ({
      id: event.id || "",
      summary: event.summary || "(No title)",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      allDay: !event.start?.dateTime,
      color: event.colorId || "default",
      location: event.location || undefined,
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json({ error: "Calendar API error" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/calendar/
git commit -m "feat: add Google Calendar API route handler"
```

---

### Task 11: Calendar Widget

**Files:**
- Create: `src/components/dashboard/calendar-widget.tsx`

- [ ] **Step 1: Create calendar widget**

Create `src/components/dashboard/calendar-widget.tsx`:

```typescript
"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, MapPin } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { formatEventTime } from "@/lib/utils";
import type { CalendarEvent } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EVENT_COLORS: Record<string, string> = {
  default: "bg-blue-500",
  "1": "bg-blue-300",
  "2": "bg-green-500",
  "3": "bg-purple-500",
  "4": "bg-red-400",
  "5": "bg-yellow-500",
  "6": "bg-orange-500",
  "7": "bg-teal-500",
  "8": "bg-gray-500",
  "9": "bg-indigo-500",
  "10": "bg-emerald-500",
  "11": "bg-rose-500",
};

function dayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

function groupByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dateKey = event.start.split("T")[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return groups;
}

export function CalendarWidget() {
  const { data, isLoading, error } = useSWR<CalendarEvent[]>(
    "/api/calendar",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // 5 minutes
  );

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Calendar unavailable
        </CardContent>
      </Card>
    );
  }

  const events = data || [];
  const grouped = groupByDay(events);

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Calendar — Next 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-3">
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No upcoming events
            </div>
          ) : (
            Object.entries(grouped).map(([dateKey, dayEvents], groupIndex) => (
              <div key={dateKey}>
                {groupIndex > 0 && <Separator className="my-3" />}
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dayLabel(dayEvents[0].start)}
                </div>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-secondary/50">
                      <div className={`mt-1.5 h-2 w-2 rounded-full ${EVENT_COLORS[event.color] || EVENT_COLORS.default}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{event.summary}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatEventTime(event.start, event.allDay)}
                          {!event.allDay && ` — ${formatEventTime(event.end, false)}`}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/calendar-widget.tsx
git commit -m "feat: add Google Calendar widget with event grouping by day"
```

---

### Task 12: Google Tasks API Route

**Files:**
- Create: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Create tasks API route handler**

Create `src/app/api/tasks/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import type { TaskList, TaskItem } from "@/types/dashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const tasks = google.tasks({ version: "v1", auth: oauth2Client });

  try {
    const listRes = await tasks.tasklists.list({ maxResults: 10 });
    const taskLists: TaskList[] = [];

    for (const list of listRes.data.items || []) {
      const tasksRes = await tasks.tasks.list({
        tasklist: list.id!,
        maxResults: 20,
        showCompleted: false,
        showHidden: false,
      });

      const items: TaskItem[] = (tasksRes.data.items || []).map((task) => ({
        id: task.id || "",
        title: task.title || "(No title)",
        status: (task.status as TaskItem["status"]) || "needsAction",
        due: task.due || undefined,
        notes: task.notes || undefined,
      }));

      if (items.length > 0) {
        taskLists.push({
          id: list.id || "",
          title: list.title || "(Untitled)",
          tasks: items,
        });
      }
    }

    return NextResponse.json(taskLists);
  } catch (err) {
    console.error("Tasks API error:", err);
    return NextResponse.json({ error: "Tasks API error" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tasks/
git commit -m "feat: add Google Tasks API route handler"
```

---

### Task 13: Tasks Widget

**Files:**
- Create: `src/components/dashboard/tasks-widget.tsx`

- [ ] **Step 1: Create tasks widget**

Create `src/components/dashboard/tasks-widget.tsx`:

```typescript
"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Circle, Calendar } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import type { TaskList } from "@/types/dashboard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TasksWidget() {
  const { data, isLoading, error } = useSWR<TaskList[]>(
    "/api/tasks",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // 5 minutes
  );

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Tasks unavailable
        </CardContent>
      </Card>
    );
  }

  const taskLists = data || [];
  const totalTasks = taskLists.reduce((sum, list) => sum + list.tasks.length, 0);

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </span>
          <Badge variant="secondary" className="text-xs">
            {totalTasks}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-3">
          {taskLists.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No pending tasks
            </div>
          ) : (
            taskLists.map((list, listIndex) => (
              <div key={list.id}>
                {listIndex > 0 && <Separator className="my-3" />}
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {list.title}
                </div>
                <div className="space-y-1">
                  {list.tasks.map((task) => {
                    const isOverdue = task.due && isPast(parseISO(task.due));
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                      >
                        <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{task.title}</div>
                          {task.due && (
                            <div className={`flex items-center gap-1 text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                              <Calendar className="h-2.5 w-2.5" />
                              {format(parseISO(task.due), "MMM d")}
                              {isOverdue && " — overdue"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tasks-widget.tsx
git commit -m "feat: add Google Tasks widget with overdue highlighting"
```

---

### Task 14: Dashboard Grid Layout

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Assemble all widgets into responsive grid**

Replace `src/app/page.tsx`:

```typescript
"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ClockWidget } from "@/components/dashboard/clock-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { MoonPhaseWidget } from "@/components/dashboard/moon-phase-widget";
import { CurrencyWidget } from "@/components/dashboard/currency-widget";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { TasksWidget } from "@/components/dashboard/tasks-widget";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Duneba Dashboard
          </h1>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Widget Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* Row 1: Clock (1) + Weather (2) + Moon (1) */}
          <ClockWidget />
          <WeatherWidget />
          <MoonPhaseWidget />

          {/* Row 2: Currency (1) + empty space aligns naturally */}
          <CurrencyWidget />

          {/* Row 3: Calendar (2) + Tasks (2) */}
          <CalendarWidget />
          <TasksWidget />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the layout**

Run `npm run dev`, sign in, and verify:
- On large screens: 4-column grid with widgets flowing naturally
- On medium screens: 2-column grid
- On small screens: single-column stack
- All widgets render (or show loading/error states)

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble dashboard grid layout with all widgets"
```

---

### Task 15: Loading Skeletons & Error Polish

**Files:**
- Create: `src/components/dashboard/widget-skeleton.tsx`

- [ ] **Step 1: Create reusable widget skeleton**

Create `src/components/dashboard/widget-skeleton.tsx`:

```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WidgetSkeletonProps {
  className?: string;
  lines?: number;
}

export function WidgetSkeleton({ className, lines = 3 }: WidgetSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify error states display correctly**

Temporarily set an invalid `WEATHERAPI_KEY` in `.env.local` and verify:
- Weather widget shows "Weather unavailable"
- Other widgets continue to work independently
- No unhandled errors in console

Restore the correct key after testing.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/widget-skeleton.tsx
git commit -m "feat: add reusable widget skeleton for loading states"
```

---

### Task 16: Vercel Deployment Configuration

**Files:**
- Verify: `next.config.ts`
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Verify Next.js config**

Check `next.config.ts` exists and has no issues. It should look like:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

No special configuration is needed — the defaults work for Vercel.

- [ ] **Step 2: Set up Google OAuth redirect URI**

In Google Cloud Console (https://console.cloud.google.com):

1. Go to APIs & Services → Credentials
2. Edit the OAuth 2.0 Client ID for `duneba-dashboard`
3. Add to Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-vercel-domain>/api/auth/callback/google` (production)
4. Save

- [ ] **Step 3: Document environment variables for Vercel**

In the Vercel dashboard, add these environment variables:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From credentials file |
| `GOOGLE_CLIENT_SECRET` | From credentials file |
| `NEXTAUTH_SECRET` | Generated random string |
| `NEXTAUTH_URL` | `https://<your-vercel-domain>` |
| `ALLOWED_EMAIL` | Your Google email |
| `WEATHERAPI_KEY` | From weatherapi.com |
| `WEATHER_LOCATION` | `Sydney,Australia` |

- [ ] **Step 4: Deploy**

```bash
npx vercel
```

Or connect the GitHub repository to Vercel for automatic deployments.

- [ ] **Step 5: Commit any config changes**

```bash
git add -A
git commit -m "chore: finalize configuration for Vercel deployment"
```

---

## Summary

| Task | Widget/Feature | External API |
|------|---------------|-------------|
| 1 | Project setup | — |
| 2 | Types & env | — |
| 3 | Google OAuth | Google OAuth |
| 4 | Layout & theme | — |
| 5 | Clock/Date | — |
| 6 | Weather API route | weatherapi.com |
| 7 | Weather + Moon widgets | — |
| 8 | Currency API route | frankfurter.app |
| 9 | Currency widget | — |
| 10 | Calendar API route | Google Calendar |
| 11 | Calendar widget | — |
| 12 | Tasks API route | Google Tasks |
| 13 | Tasks widget | — |
| 14 | Dashboard grid | — |
| 15 | Loading/error polish | — |
| 16 | Vercel deployment | — |

**Prerequisites before starting:**
1. Sign up at https://www.weatherapi.com for a free API key
2. Ensure Google Cloud project has Calendar API and Tasks API enabled
3. Have Google OAuth redirect URIs configured (Task 16, Step 2 — do this early)
