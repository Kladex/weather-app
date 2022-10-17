import getNormalTime from "../utils/getNormalTime";
import axios from "axios";

const API_KEY = "46e3e4b01cc9de1bce497046db0a8826";

async function getLatLong(location) {
  if (location.trim()) {
    const result = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=${1}&appid=${API_KEY}`
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
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
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

function changeBackgroundImg(weatherData) {
  const weather = weatherData.weather;
  let bgImage = { img: "bg-orange-100" };
  if (weather === "Clouds") {
    bgImage.img = 'bg-[url("../images/cloud.jpg")]';
  } else if (weather === "Rain") {
    bgImage.img = 'bg-[url("../images/rain.jpg")]';
    bgImage.component = (
      <a href="https://www.freepik.com/free-vector/dark-clouds-with-rainfall-thunder-flash-background_15244408.htm#query=weather%20background&position=10&from_view=keyword">
        Image by starline on Freepik
      </a>
    );
  } else if (weather === "Thunderstorm") {
    bgImage.img = 'bg-[url("../images/heavyRain.jpg")]';
    bgImage.component = (
      <a href="https://www.freepik.com/free-vector/thunderstorm-night-urban-scene_4228067.htm#query=heavy%20rain&position=26&from_view=search&track=sph">
        Image by brgfx on Freepik
      </a>
    );
  } else if (weather === "Clear") {
    bgImage.img = 'bg-[url("../images/clear.jpg")]';
    bgImage.component = (
      <a href="https://www.freepik.com/free-photo/cloud-blue-sky_1017702.htm#query=weather%20background&position=0&from_view=keyword">
        Image by jannoon028 on Freepik
      </a>
    );
  } else if (weather === "Snow") {
    bgImage.img = 'bg-[url("../images/snow.jpg")]';
    bgImage.component = (
      <a href="https://www.freepik.com/free-photo/beautiful-shot-mountains-trees-covered-snow-fog_10584363.htm#query=snow%20weather&position=37&from_view=search&track=sph">
        Image by wirestock on Freepik
      </a>
    );
  }
  return bgImage;
}

export { getLatLong, getWeatherData, changeBackgroundImg };
