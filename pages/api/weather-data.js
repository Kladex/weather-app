import { getWeatherData } from "../../libs/load-data";

export default async function handler(req, res) {
  const { lat, lon } = req.body;

  const data = await getWeatherData(lat, lon);
  res.status(200).json(data);
}
