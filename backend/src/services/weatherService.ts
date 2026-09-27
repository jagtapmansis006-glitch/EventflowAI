import dotenv from 'dotenv';
dotenv.config();

export interface WeatherData {
  temp: number;            // Celsius
  humidity: number;        // %
  rainfallIntensity: number; // mm (rain.1h)
  windSpeed: number;       // m/s
  condition: string;
  description: string;
  source: 'openweathermap' | 'wttr.in' | 'cached' | 'fallback';
  timestamp: string;
}

// Default venue coordinates (Navi Mumbai / DY Patil Stadium venue: 18.9894, 73.1175)
const DEFAULT_LAT = 18.9894;
const DEFAULT_LON = 73.1175;

let cachedWeather: WeatherData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

/**
 * Fetches real-time weather from OpenWeatherMap API, with fallback to wttr.in and cached values.
 */
export async function getLiveWeather(
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON
): Promise<WeatherData> {
  const now = Date.now();
  if (cachedWeather && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedWeather;
  }

  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();

  // 1. Primary: OpenWeatherMap REST API
  if (apiKey && apiKey !== 'your_openweather_api_key' && !apiKey.startsWith('your_copied')) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const weather: WeatherData = {
          temp: typeof data.main?.temp === 'number' ? Number(data.main.temp.toFixed(1)) : 27.5,
          humidity: data.main?.humidity ?? 65,
          rainfallIntensity: data.rain?.['1h'] ?? (data.rain?.['3h'] ? Number((data.rain['3h'] / 3).toFixed(1)) : 0),
          windSpeed: data.wind?.speed ?? 3.2,
          condition: data.weather?.[0]?.main || 'Clear',
          description: data.weather?.[0]?.description || 'clear sky',
          source: 'openweathermap',
          timestamp: new Date().toISOString()
        };

        cachedWeather = weather;
        lastFetchTime = now;
        return weather;
      } else {
        console.warn(`[WeatherService] OpenWeatherMap returned status ${res.status}: ${await res.text()}`);
      }
    } catch (err: any) {
      console.warn(`[WeatherService] OpenWeatherMap request failed: ${err.message || err}`);
    }
  }

  // 2. Secondary Fallback: wttr.in JSON API
  try {
    const wttrUrl = `https://wttr.in/${lat},${lon}?format=j1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(wttrUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      const current = data.current_condition?.[0] || {};
      const weather: WeatherData = {
        temp: parseFloat(current.temp_C) || 28.0,
        humidity: parseFloat(current.humidity) || 60,
        rainfallIntensity: parseFloat(current.precipMM) || 0,
        windSpeed: parseFloat(current.windspeedKmph ? (parseFloat(current.windspeedKmph) / 3.6).toFixed(1) : '3.0'),
        condition: current.weatherDesc?.[0]?.value || 'Partly Cloudy',
        description: current.weatherDesc?.[0]?.value || 'clear',
        source: 'wttr.in',
        timestamp: new Date().toISOString()
      };

      cachedWeather = weather;
      lastFetchTime = now;
      return weather;
    }
  } catch (err: any) {
    console.warn(`[WeatherService] wttr.in fallback failed: ${err.message || err}`);
  }

  // 3. Fallback to cached or realistic baseline
  if (cachedWeather) {
    return cachedWeather;
  }

  const fallbackWeather: WeatherData = {
    temp: 28.4,
    humidity: 62,
    rainfallIntensity: 0.0,
    windSpeed: 2.8,
    condition: 'Clear',
    description: 'clear sky',
    source: 'fallback',
    timestamp: new Date().toISOString()
  };

  cachedWeather = fallbackWeather;
  lastFetchTime = now;
  return fallbackWeather;
}

export default {
  getLiveWeather
};
