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

export interface RandomPhotoResponse {
  id: string;
  date: string;
  location: string | null;
}
