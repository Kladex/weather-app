import { getObservedRain } from "../../libs/flood-data";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const { lat, lon } = req.query;
  const latitude = typeof lat === "string" && lat.trim() ? Number(lat) : NaN;
  const longitude = typeof lon === "string" && lon.trim() ? Number(lon) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return res.status(400).json({ error: "Invalid location coordinates." });
  try {
    const data = await getObservedRain(latitude, longitude);
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "ยังโหลดฝนตรวจวัดไม่ได้" });
  }
}
