/**
 * Fetches current weather from Open-Meteo and maps the WMO weather code
 * to one of three Indonesian weather labels:
 *   'cerah'   – clear / mostly clear
 *   'berawan' – cloudy / overcast / foggy
 *   'hujan'   – any form of precipitation (drizzle, rain, snow, thunderstorm)
 *
 * WMO Weather Interpretation Codes (WW):
 * https://open-meteo.com/en/docs#weathervariables
 *
 *   0        : Clear sky                   → cerah
 *   1, 2, 3  : Mainly/partly/overcast      → 1 = cerah, 2-3 = berawan
 *   45, 48   : Fog                         → berawan
 *   51-57    : Drizzle                     → hujan
 *   61-67    : Rain                        → hujan
 *   71-77    : Snow                        → hujan
 *   80-82    : Rain showers                → hujan
 *   85, 86   : Snow showers               → hujan
 *   95-99    : Thunderstorm               → hujan
 */

const WMO_TO_WEATHER = (code) => {
  if (code === 0 || code === 1) return 'cerah';
  if (code === 2 || code === 3) return 'berawan';
  if (code >= 45 && code <= 48) return 'berawan';
  if (code >= 51 && code <= 99) return 'hujan';
  return null; // unknown
};

/**
 * Fetches weather label for given coordinates.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<'cerah'|'berawan'|'hujan'|null>}
 */
export async function fetchWeatherLabel(latitude, longitude) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('current', 'weather_code');
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

    const data = await res.json();
    const code = data?.current?.weather_code;

    if (code === undefined || code === null) return null;

    return WMO_TO_WEATHER(code);
  } catch (err) {
    console.warn('Weather fetch failed:', err);
    return null;
  }
}
