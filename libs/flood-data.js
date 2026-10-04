import axios from "axios";

export const ROAD_SOURCE = "https://weather.bangkok.go.th/floodbangkok/";
export const RADAR_SOURCE = "https://weather.bangkok.go.th/Radar/RadarAnimation.aspx";
export const FORECAST_SOURCE = "https://open-meteo.com/";
const cache = new Map();
const MAX_AGE = 60 * 60 * 1000;

export function nearbyRainfall(data, lat, lon, now = Date.now()) {
  if (!Array.isArray(data?.data)) throw new Error("Rainfall source unavailable");
  const radians = (value) => value * Math.PI / 180;
  const seen = new Set();
  return data.data.flatMap((row) => {
    const station = row.station;
    const latitude = station?.tele_station_lat;
    const longitude = station?.tele_station_long;
    const date = row.rainfall_datetime;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !Number.isFinite(row.rain_24h) || row.rain_24h < 0 || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(date)) return [];
    const observedAt = date.replace(" ", "T") + "+07:00";
    const age = now - new Date(observedAt).getTime();
    if (!Number.isFinite(age) || age > 3 * 60 * 60 * 1000 || age < -5 * 60 * 1000) return [];
    const a = Math.sin(radians(latitude - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(latitude)) * Math.sin(radians(longitude - lon) / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    if (distanceKm > 50 || !station.id || seen.has(station.id)) return [];
    seen.add(station.id);
    return [{ id: station.id, name: station.tele_station_name?.th || String(station.id), province: row.geocode?.province_name?.th || "", rainMm: row.rain_24h, observedAt, distanceKm: Number(distanceKm.toFixed(1)), agency: row.agency?.agency_name?.th || "ไม่ระบุหน่วยงาน" }];
  }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
}

export async function getObservedRain(lat, lon) {
  const data = await cached("observed-rain", async () => {
    const response = await axios.get("https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h", { timeout: 12000, maxContentLength: 10 * 1024 * 1024 });
    if (!Array.isArray(response.data?.data)) throw new Error("Rainfall source unavailable");
    return { ...response.data, fetchedAt: new Date().toISOString() };
  });
  return { stations: nearbyRainfall(data, lat, lon), fetchedAt: data.fetchedAt };
}

export function nearbyWaterLevels(data, lat, lon, now = Date.now()) {
  if (!Array.isArray(data?.waterlevel_data?.data)) throw new Error("Water level source unavailable");
  const number = (value) => value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
  return data.waterlevel_data.data.flatMap((row) => {
    const station = row.station;
    const levelMsl = number(row.waterlevel_msl);
    const previous = number(row.waterlevel_msl_previous);
    const date = row.waterlevel_datetime;
    const latitude = station?.tele_station_lat;
    const longitude = station?.tele_station_long;
    if (levelMsl === null || !station?.id || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(date)) return [];
    const observedAt = date.replace(" ", "T") + "+07:00";
    const age = now - new Date(observedAt).getTime();
    if (!Number.isFinite(age) || age > 3 * 60 * 60 * 1000 || age < -5 * 60 * 1000) return [];
    const rad = (value) => value * Math.PI / 180;
    const a = Math.sin(rad(latitude - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(latitude)) * Math.sin(rad(longitude - lon) / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    if (distanceKm > 50) return [];
    return [{ id: station.id, name: station.tele_station_name?.th || String(station.id), province: row.geocode?.province_name?.th || "", river: row.river_name || row.basin?.basin_name?.th || "", levelMsl, status: ({ 1: "น้ำน้อยวิกฤติ", 2: "น้ำน้อย", 3: "น้ำปกติ", 4: "น้ำมาก · เฝ้าระวัง", 5: "น้ำล้นตลิ่ง" })[row.situation_level] || "ไม่ทราบสถานะ", tone: ({ 1: "watch", 2: "watch", 3: "normal", 4: "watch", 5: "danger" })[row.situation_level] || "unknown", changeCm: previous === null ? null : Number(((levelMsl - previous) * 100).toFixed(1)), observedAt, distanceKm: Number(distanceKm.toFixed(1)) }];
  }).sort((a, b) => a.distanceKm - b.distanceKm).filter((row, index, rows) => rows.findIndex((other) => other.id === row.id) === index).slice(0, 5);
}

export async function getWaterLevels(lat, lon) {
  const data = await cached("water-levels", async () => {
    const response = await axios.get("https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load", { timeout: 12000, maxContentLength: 10 * 1024 * 1024 });
    if (!Array.isArray(response.data?.waterlevel_data?.data)) throw new Error("Water level source unavailable");
    return { ...response.data, fetchedAt: new Date().toISOString() };
  });
  return { stations: nearbyWaterLevels(data, lat, lon), fetchedAt: data.fetchedAt };
}

export const WARNING_SOURCE = "https://www.tmd.go.th/warning-and-events/warning-storm";

export function parseWarnings(xml) {
  if (typeof xml !== "string" || !xml.includes("<WeatherForecastDaily") || !xml.includes("</WeatherForecastDaily>")) throw new Error("Warning source format unavailable");
  const decode = (value) => value.replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
  const field = (block, name) => decode(block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] || "");
  const warnings = [...xml.matchAll(/<Warning>([\s\S]*?)<\/Warning>/g)].map((match) => {
    const block = match[1];
    const title = field(block, "TitleThai");
    const description = field(block, "DescriptionThai") || field(block, "HeadlineThai");
    if (!title || !description) throw new Error("Incomplete warning");
    const date = field(block, "AnnounceDate");
    return { title, description, issue: field(block, "IssueNo"), announcedAt: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date) ? date.replace(" ", "T") + "+07:00" : null };
  });
  if (!warnings.length && !/<Warnings\s*\/>/.test(xml)) throw new Error("Unknown warning format");
  return warnings;
}

export async function getWarnings() {
  return cached("warnings", async () => {
    const response = await axios.get("https://data.tmd.go.th/api/WeatherWarningNews/v2/", { params: { uid: "demo", ukey: "demokey" }, timeout: 12000, maxContentLength: 1024 * 1024 });
    return { warnings: parseWarnings(response.data), fetchedAt: new Date().toISOString(), source: WARNING_SOURCE };
  });
}

async function cached(key, fetcher) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < 5 * 60 * 1000) return entry.value;
  const value = await fetcher();
  if (cache.size >= 50) cache.delete(cache.keys().next().value);
  cache.set(key, { time: Date.now(), value });
  return value;
}

export function normalizeRoads(data, now = Date.now()) {
  if (!Array.isArray(data?.dtTbl) || !data.dtTbl.length) {
    throw new Error("Road source format unavailable");
  }
  const seen = new Set();
  return data.dtTbl.filter((row) => {
    if (!row.flood_code || seen.has(row.flood_code)) return false;
    seen.add(row.flood_code);
    return true;
  }).map((row) => {
    const match = typeof row.site_timestamp === "string" && row.site_timestamp.match(/^\/Date\((\d+)\)\/$/);
    const timestamp = match ? Number(match[1]) : NaN;
    const depth = Number.isFinite(row.flood) ? row.flood : null;
    const stale = !Number.isFinite(timestamp) || now - timestamp > MAX_AGE || timestamp - now > 5 * 60 * 1000;
    const statusText = typeof row.chkStatustxt === "string" ? row.chkStatustxt : "ไม่ทราบสถานะ";
    const working = row.status === 1 && depth !== null && ["ปกติ", "น้ำท่วม", "น้ำท่วมเล็กน้อย"].includes(statusText);
    const available = working && !stale;
    return {
      code: row.flood_code,
      road: row.road_name || row.flood_shortname || row.flood_code,
      station: row.flood_shortname || row.flood_code,
      district: row.districtName || "ไม่ระบุเขต",
      depthCm: depth,
      observedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
      status: statusText,
      available,
      stale,
      flooded: available && ["น้ำท่วม", "น้ำท่วมเล็กน้อย"].includes(statusText),
      url: `https://floodbangkok.bangkok.go.th/device-info?sensor_profile_id=${encodeURIComponent(row.flood_code)}`,
    };
  });
}

export async function getRoads() {
  return cached("roads", async () => {
    try {
      const response = await axios.get(`${ROAD_SOURCE}PageMap/GetData?id=0`, { timeout: 12000 });
      return { stations: normalizeRoads(response.data), fetchedAt: new Date().toISOString(), source: ROAD_SOURCE };
    } catch (error) {
      const url = process.env.BANGKOK_COLLECTOR_URL;
      const token = process.env.BANGKOK_COLLECTOR_TOKEN;
      if (!url || !token) throw error;
      const target = new URL(url);
      if (target.protocol !== "https:" || target.username || target.password) throw new Error("Invalid collector URL");
      const response = await axios.get(target.href, { timeout: 15000, maxContentLength: 5 * 1024 * 1024, maxRedirects: 0, headers: { Authorization: `Bearer ${token}` } });
      const age = Date.now() - Date.parse(response.data?.fetchedAt);
      if (!Number.isFinite(age) || age > 5 * 60 * 1000 || age < -5 * 60 * 1000) throw new Error("Collector snapshot unavailable");
      return { stations: normalizeRoads(response.data), fetchedAt: response.data.fetchedAt, source: ROAD_SOURCE };
    }
  });
}

export function parseRadar(html) {
  if (typeof html !== "string") throw new Error("Radar source unavailable");
  const image = html.match(/<img\b[^>]*\bid="ContentPlaceHolder1_im1"[^>]*\bsrc="([^"]+)"/i);
  if (!image) throw new Error("Radar image unavailable");
  const url = new URL(image[1].replace(/&amp;/g, "&"), RADAR_SOURCE);
  if (url.origin !== "https://weather.bangkok.go.th" || !url.pathname.startsWith("/Radar/")) {
    throw new Error("Unexpected radar image source");
  }
  const description = html.match(/<span\b[^>]*\bid="repeaDaily_lblDESCRIPTION_0"[^>]*>([\s\S]*?)<\/span>/i);
  return {
    imageUrl: url.href,
    bulletin: description ? description[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : null,
    source: RADAR_SOURCE,
  };
}

export async function getRadar() {
  return cached("radar", async () => {
    // The Bangkok bulletin is optional; the TMD image has an independent source.
    let bulletin = null;
    try {
      const response = await axios.get(RADAR_SOURCE, { timeout: 12000 });
      bulletin = parseRadar(response.data).bulletin;
    } catch {
      // Leave missing bulletin text out rather than hiding the independent image.
    }
    return { bulletin, source: RADAR_SOURCE, imageUrl: `https://weather.tmd.go.th/pic_bmancLoop.gif?t=${Math.floor(Date.now() / 300000)}`, imageSource: "https://weather.tmd.go.th/bma_ncLoop.php", fetchedAt: new Date().toISOString() };
  });
}

export function normalizeForecast(data) {
  const hourly = data?.hourly;
  if (!Array.isArray(hourly?.time) || hourly.time.length < 72 ||
      !Array.isArray(hourly.precipitation) || !Array.isArray(hourly.precipitation_probability) ||
      data.hourly_units?.precipitation !== "mm" || data.hourly_units?.precipitation_probability !== "%" ||
      !Number.isFinite(data.utc_offset_seconds)) {
    throw new Error("Forecast source format unavailable");
  }
  const hours = hourly.time.slice(0, 72).map((time, index) => ({
    time,
    rainMm: Number.isFinite(hourly.precipitation[index]) && hourly.precipitation[index] >= 0 ? hourly.precipitation[index] : null,
    probability: Number.isFinite(hourly.precipitation_probability[index]) && hourly.precipitation_probability[index] >= 0 && hourly.precipitation_probability[index] <= 100 ? hourly.precipitation_probability[index] : null,
  }));
  if (hours.some((hour) => typeof hour.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(hour.time))) {
    throw new Error("Invalid forecast times");
  }
  if (!hours.some((hour) => hour.rainMm !== null)) throw new Error("No forecast data");
  return { hours, timezone: data.timezone, utcOffsetSeconds: data.utc_offset_seconds, source: FORECAST_SOURCE };
}

export async function getRainForecast(lat, lon) {
  return cached(`forecast:${lat}:${lon}`, async () => {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat, longitude: lon, timezone: "auto", forecast_hours: 72,
        hourly: "precipitation,precipitation_probability",
      }, timeout: 12000,
    });
    return { ...normalizeForecast(response.data), fetchedAt: new Date().toISOString() };
  });
}
