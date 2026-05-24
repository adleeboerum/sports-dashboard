import axios from 'axios'
import type { Weather } from '../types'

// Open-Meteo is a free, no-key weather API.
// Docs: https://open-meteo.com/en/docs

const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'

interface LatLon { lat: number; lon: number }

// Module-level caches so we don't hammer the geocoder for repeated venues.
const geocodeCache = new Map<string, LatLon | null>()
const weatherCache = new Map<string, { weather: Weather; expires: number }>()
const WEATHER_TTL_MS = 10 * 60 * 1000 // 10 minutes

// Major US sports city quick-lookup so we skip geocoding for the common case.
const KNOWN_CITIES: Record<string, LatLon> = {
  'new york': { lat: 40.7128, lon: -74.006 },
  'bronx': { lat: 40.8296, lon: -73.9262 },
  'queens': { lat: 40.7282, lon: -73.7949 },
  'brooklyn': { lat: 40.6782, lon: -73.9442 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'houston': { lat: 29.7604, lon: -95.3698 },
  'philadelphia': { lat: 39.9526, lon: -75.1652 },
  'phoenix': { lat: 33.4484, lon: -112.074 },
  'san antonio': { lat: 29.4241, lon: -98.4936 },
  'san diego': { lat: 32.7157, lon: -117.1611 },
  'dallas': { lat: 32.7767, lon: -96.797 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'oakland': { lat: 37.8044, lon: -122.2712 },
  'san jose': { lat: 37.3382, lon: -121.8863 },
  'austin': { lat: 30.2672, lon: -97.7431 },
  'jacksonville': { lat: 30.3322, lon: -81.6557 },
  'indianapolis': { lat: 39.7684, lon: -86.1581 },
  'columbus': { lat: 39.9612, lon: -82.9988 },
  'fort worth': { lat: 32.7555, lon: -97.3308 },
  'charlotte': { lat: 35.2271, lon: -80.8431 },
  'detroit': { lat: 42.3314, lon: -83.0458 },
  'el paso': { lat: 31.7619, lon: -106.485 },
  'memphis': { lat: 35.1495, lon: -90.049 },
  'boston': { lat: 42.3601, lon: -71.0589 },
  'seattle': { lat: 47.6062, lon: -122.3321 },
  'denver': { lat: 39.7392, lon: -104.9903 },
  'washington': { lat: 38.9072, lon: -77.0369 },
  'milwaukee': { lat: 43.0389, lon: -87.9065 },
  'nashville': { lat: 36.1627, lon: -86.7816 },
  'baltimore': { lat: 39.2904, lon: -76.6122 },
  'atlanta': { lat: 33.749, lon: -84.388 },
  'miami': { lat: 25.7617, lon: -80.1918 },
  'tampa': { lat: 27.9506, lon: -82.4572 },
  'orlando': { lat: 28.5383, lon: -81.3792 },
  'st. petersburg': { lat: 27.7676, lon: -82.6403 },
  'minneapolis': { lat: 44.9778, lon: -93.265 },
  'kansas city': { lat: 39.0997, lon: -94.5786 },
  'cleveland': { lat: 41.4993, lon: -81.6944 },
  'pittsburgh': { lat: 40.4406, lon: -79.9959 },
  'cincinnati': { lat: 39.1031, lon: -84.512 },
  'st. louis': { lat: 38.627, lon: -90.1994 },
  'arlington': { lat: 32.7357, lon: -97.1081 },
  'portland': { lat: 45.5152, lon: -122.6784 },
  'sacramento': { lat: 38.5816, lon: -121.4944 },
  'salt lake city': { lat: 40.7608, lon: -111.891 },
  'new orleans': { lat: 29.9511, lon: -90.0715 },
  'oklahoma city': { lat: 35.4676, lon: -97.5164 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'liverpool': { lat: 53.4084, lon: -2.9916 },
  'toronto': { lat: 43.6532, lon: -79.3832 },
  'montreal': { lat: 45.5017, lon: -73.5673 },
  'vancouver': { lat: 49.2827, lon: -123.1207 },
  'edmonton': { lat: 53.5461, lon: -113.4938 },
  'calgary': { lat: 51.0447, lon: -114.0719 },
  'ottawa': { lat: 45.4215, lon: -75.6972 },
  'winnipeg': { lat: 49.8951, lon: -97.1384 },
}

async function geocode(city: string, country?: string): Promise<LatLon | null> {
  const key = `${city.toLowerCase()}|${country ?? ''}`
  if (geocodeCache.has(key)) return geocodeCache.get(key)!

  const known = KNOWN_CITIES[city.toLowerCase()]
  if (known) {
    geocodeCache.set(key, known)
    return known
  }

  try {
    const res = await axios.get(GEOCODE_BASE, {
      params: { name: city, count: 1, language: 'en', format: 'json' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (res.data as any)?.results?.[0]
    if (!r || typeof r.latitude !== 'number' || typeof r.longitude !== 'number') {
      geocodeCache.set(key, null)
      return null
    }
    const ll: LatLon = { lat: r.latitude, lon: r.longitude }
    geocodeCache.set(key, ll)
    return ll
  } catch {
    geocodeCache.set(key, null)
    return null
  }
}

// WMO weather code → human-readable label
function describeCode(code: number | undefined): string {
  if (code == null) return 'Unknown'
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly Clear'
  if (code === 2) return 'Partly Cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Foggy'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain Showers'
  if (code >= 85 && code <= 86) return 'Snow Showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Unknown'
}

function compassFromDeg(deg: number | undefined): string {
  if (deg == null) return ''
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) / 45)) % 8]
}

export async function fetchWeather(city: string, country?: string): Promise<Weather | null> {
  if (!city) return null
  const cacheKey = `${city.toLowerCase()}|${country ?? ''}`
  const cached = weatherCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.weather

  const loc = await geocode(city, country)
  if (!loc) return null

  try {
    const res = await axios.get(FORECAST_BASE, {
      params: {
        latitude: loc.lat,
        longitude: loc.lon,
        current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        timezone: 'auto',
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (res.data as any)?.current
    if (!c) return null
    const weather: Weather = {
      condition: describeCode(c.weather_code),
      tempF: Math.round(c.temperature_2m ?? 0),
      windMph: Math.round(c.wind_speed_10m ?? 0),
      windDir: compassFromDeg(c.wind_direction_10m),
      humidity: Math.round(c.relative_humidity_2m ?? 0),
      precipChance: typeof c.precipitation === 'number' && c.precipitation > 0 ? 100 : 0,
    }
    weatherCache.set(cacheKey, { weather, expires: Date.now() + WEATHER_TTL_MS })
    return weather
  } catch {
    return null
  }
}
