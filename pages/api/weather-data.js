import { getWeatherData } from "../../libs/load-data";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const { lat, lon } = req.body || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "Invalid location coordinates." });
  }
  try {
    const data = await getWeatherData(lat, lon);
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Unable to load the weather. Please try again later." });
  }
}
