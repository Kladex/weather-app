import { getRoads, getRadar, ROAD_SOURCE, RADAR_SOURCE } from "../../libs/flood-data";

function sourceFailure(reason, error, source) {
  // Expose only safe transport diagnostics, never response bodies or request headers.
  const status = reason?.response?.status;
  const code = reason?.code;
  return {
    error, source,
    upstreamStatus: Number.isInteger(status) ? status : null,
    code: typeof code === "string" && /^[A-Z0-9_]{1,64}$/.test(code) ? code : "SOURCE_FORMAT_ERROR",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const [roads, radar] = await Promise.allSettled([getRoads(), getRadar()]);
  res.setHeader("Cache-Control", roads.status === "fulfilled" && radar.status === "fulfilled" ? "public, s-maxage=300" : "no-store");
  return res.status(200).json({
    roads: roads.status === "fulfilled" ? roads.value : sourceFailure(roads.reason, "ยังโหลดข้อมูลถนนไม่ได้", ROAD_SOURCE),
    radar: radar.status === "fulfilled" ? radar.value : sourceFailure(radar.reason, "ยังโหลดเรดาร์ไม่ได้", RADAR_SOURCE),
  });
}
