export interface WeatherCurrent {
  temp_c: number;
  feelslike_c: number;
  condition: string;
  condition_code: number;
  humidity: number;
  wind_kph: number;
  uv: number;
  is_day: boolean;
  vis_km: number;
  air_quality_index: number;
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
    EUR: number;
  };
  // Sampled last-6-months series per currency (oldest → newest) for sparklines.
  // Empty arrays when the timeseries fetch is unavailable.
  history: {
    BRL: number[];
    USD: number[];
    EUR: number[];
  };
  // Sampled dates (YYYY-MM-DD, oldest → newest) aligned index-for-index with
  // `history`, used to label the sparkline's start/end months. Empty when
  // unavailable.
  historyDates: string[];
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

export interface QuoteData {
  text: string;
  author: string;
}

export interface RandomPhotoResponse {
  id: string;
  date: string;
  location: string | null;
}
