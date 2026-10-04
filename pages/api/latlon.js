import { getLatLong } from "../../libs/load-data";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const location = req.body?.data;
  if (typeof location !== "string" || !location.trim()) {
    return res.status(400).json({ error: "Please enter a city or country." });
  }
  try {
    const data = await getLatLong(location);
    if (!data) {
      return res.status(404).json({ error: "Location not found. Please try another name." });
    }
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Unable to find the location. Please try again later." });
  }
}
