import { getRoads, getRadar, ROAD_SOURCE, RADAR_SOURCE } from "../../libs/flood-data";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const [roads, radar] = await Promise.allSettled([getRoads(), getRadar()]);
  res.setHeader("Cache-Control", "public, s-maxage=300");
  return res.status(200).json({
    roads: roads.status === "fulfilled" ? roads.value : { error: "ยังโหลดข้อมูลถนนไม่ได้", source: ROAD_SOURCE },
    radar: radar.status === "fulfilled" ? radar.value : { error: "ยังโหลดเรดาร์ไม่ได้", source: RADAR_SOURCE },
  });
}
