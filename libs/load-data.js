import getNormalTime from "../utils/getNormalTime";
import axios from "axios";

async function getLatLong(location) {
  if (location.trim()) {
    const result = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=${1}&appid=${process.env.API_KEY.toString()}`
    );
    const data = {
      name: result.data[0].name,
      lat: result.data[0].lat,
      lon: result.data[0].lon,
    };
    return data;
  }
}

async function getWeatherData(lat, lon) {
  const result = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.API_KEY.toString()}`
  );
  const data = result.data;
  const combineData = {
    country: data.sys.country,
    highTemp: data.main.temp_max,
    lowTemp: data.main.temp_min,
    normalTemp: data.main.temp,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    visibility: data.visibility,
    wind: data.wind.speed,
    windDirection: data.wind.deg,
    sunrise: getNormalTime(data.sys.sunrise),
    sunset: getNormalTime(data.sys.sunset),
    weather: data.weather[0].main,
  };
  return combineData;
}

export { getLatLong, getWeatherData };
