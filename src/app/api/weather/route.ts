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
    fetch(`${WEATHER_API}/forecast.json?key=${key}&q=${location}&days=3&aqi=yes`),
    fetch(`${WEATHER_API}/astronomy.json?key=${key}&q=${location}`),
  ]);

  if (!forecastRes.ok || !astronomyRes.ok) {
    return NextResponse.json({ error: "Weather API error" }, { status: 502 });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const forecastData = await forecastRes.json();
  const astronomyData = await astronomyRes.json();

  const weather: WeatherData = {
    location: process.env.WEATHER_LOCATION_NAME || forecastData.location.name,
    current: {
      temp_c: forecastData.current.temp_c,
      feelslike_c: forecastData.current.feelslike_c,
      condition: forecastData.current.condition.text,
      condition_code: forecastData.current.condition.code,
      humidity: forecastData.current.humidity,
      wind_kph: forecastData.current.wind_kph,
      uv: forecastData.current.uv,
      is_day: forecastData.current.is_day === 1,
      vis_km: forecastData.current.vis_km,
      air_quality_index:
        forecastData.current.air_quality?.["us-epa-index"] ?? 0,
    },
    forecast: forecastData.forecast.forecastday.map((day: any) => ({
      date: day.date,
      maxtemp_c: day.day.maxtemp_c,
      mintemp_c: day.day.mintemp_c,
      condition: day.day.condition.text,
      condition_code: day.day.condition.code,
      chance_of_rain: day.day.daily_chance_of_rain,
    })),
    astronomy: {
      moon_phase: astronomyData.astronomy.astro.moon_phase,
      moon_illumination: parseInt(astronomyData.astronomy.astro.moon_illumination),
      sunrise: astronomyData.astronomy.astro.sunrise,
      sunset: astronomyData.astronomy.astro.sunset,
      moonrise: astronomyData.astronomy.astro.moonrise,
      moonset: astronomyData.astronomy.astro.moonset,
    },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return NextResponse.json(weather);
}
