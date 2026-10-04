import axios from "axios";

export const ROAD_SOURCE = "https://weather.bangkok.go.th/floodbangkok/";
export const RADAR_SOURCE = "https://weather.bangkok.go.th/Radar/RadarAnimation.aspx";
export const FORECAST_SOURCE = "https://open-meteo.com/";
const cache = new Map();
const MAX_AGE = 60 * 60 * 1000;

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
    const response = await axios.get(`${ROAD_SOURCE}PageMap/GetData?id=0`, { timeout: 12000 });
    return { stations: normalizeRoads(response.data), fetchedAt: new Date().toISOString(), source: ROAD_SOURCE };
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
    const response = await axios.get(RADAR_SOURCE, { timeout: 12000 });
    return { ...parseRadar(response.data), fetchedAt: new Date().toISOString() };
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
