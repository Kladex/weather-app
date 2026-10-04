import { getWarnings } from "../../libs/flood-data";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  try {
    const data = await getWarnings();
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "ยังโหลดประกาศเตือนภัยไม่ได้" });
  }
}
