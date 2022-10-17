// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getLatLong } from "../../libs/load-data";

export default async function handler(req, res) {
  const location = req.body.data;
  if (location) {
    const data = await getLatLong(location);
    res.status(200).json(data);
  }
}
