import {
  Sun,
  Moon,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudSun,
  CloudMoon,
  Snowflake,
  type LucideIcon,
} from "lucide-react";

// weatherapi.com condition codes → Lucide icons
const DAY_ICONS: Record<number, LucideIcon> = {
  1000: Sun,
  1003: CloudSun,
  1006: Cloud,
  1009: Cloud,
  1030: CloudFog,
  1063: CloudDrizzle,
  1066: CloudSnow,
  1087: CloudLightning,
  1135: CloudFog,
  1147: CloudFog,
  1150: CloudDrizzle,
  1153: CloudDrizzle,
  1168: CloudDrizzle,
  1180: CloudRain,
  1183: CloudRain,
  1186: CloudRain,
  1189: CloudRain,
  1192: CloudRain,
  1195: CloudRain,
  1198: CloudRain,
  1201: CloudRain,
  1204: CloudSnow,
  1207: CloudSnow,
  1210: Snowflake,
  1213: Snowflake,
  1216: Snowflake,
  1219: Snowflake,
  1222: CloudSnow,
  1225: CloudSnow,
  1237: Snowflake,
  1240: CloudRain,
  1243: CloudRain,
  1246: CloudRain,
  1249: CloudSnow,
  1252: CloudSnow,
  1255: Snowflake,
  1258: CloudSnow,
  1261: Snowflake,
  1264: Snowflake,
  1273: CloudLightning,
  1276: CloudLightning,
  1279: CloudLightning,
  1282: CloudLightning,
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
