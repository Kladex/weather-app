import axios from "axios";
import React, { useEffect, useState } from "react";

import InnerGrid from "../components/InnerGrid";
import getNormalTime from "../utils/getNormalTime";

export default function Home() {
  const API_KEY = "46e3e4b01cc9de1bce497046db0a8826";
  const [weatherData, setWeatherData] = useState({});
  const [latLong, setLatLong] = useState({});
  const [location, setLocation] = useState("");
  const [bgImage, setBgImage] = useState({});
  const [favouriteCountry, setFavouriteCountry] = useState([]);

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
      setLatLong(data);
    }
  }

  async function getWeatherData() {
    const { lat, lon } = latLong;
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
    setWeatherData(combineData);
  }

  async function handleSearch() {
    await getLatLong(location);
  }

  //----- Check if the location in the search box is in favourite or not?
  const isFavourite = favouriteCountry.includes(location);

  function addToFavourite() {
    let favourite = [...favouriteCountry];

    if (!isFavourite && favourite.length <= 13) {
      favourite = [...favourite, location];
      setFavouriteCountry(favourite);
      localStorage.setItem("favourite", favourite);
    }
  }

  function deleteFromFavourite() {
    const favouriteAfterDeleted = favouriteCountry.filter(
      (country) => country !== location
    );
    localStorage.removeItem("favourite");
    setFavouriteCountry(favouriteAfterDeleted);
    localStorage.setItem("favourite", favouriteAfterDeleted);
  }

  function changeBackgroundImg() {
    const weather = weatherData.weather;
    if (weather === "Clouds") {
      setBgImage({
        img: 'bg-[url("../images/cloud.jpg")]',
      });
    } else if (weather === "Rain") {
      setBgImage({
        img: 'bg-[url("../images/rain.jpg")]',
        component: (
          <a href="https://www.freepik.com/free-vector/dark-clouds-with-rainfall-thunder-flash-background_15244408.htm#query=weather%20background&position=10&from_view=keyword">
            Image by starline on Freepik
          </a>
        ),
      });
    } else if (weather === "Thunderstorm") {
      setBgImage({
        img: 'bg-[url("../images/heavyRain.jpg")]',
        component: (
          <a href="https://www.freepik.com/free-vector/thunderstorm-night-urban-scene_4228067.htm#query=heavy%20rain&position=26&from_view=search&track=sph">
            Image by brgfx on Freepik
          </a>
        ),
      });
    } else if (weather === "Clear") {
      setBgImage({
        img: 'bg-[url("../images/clear.jpg")]',
        component: (
          <a href="https://www.freepik.com/free-photo/cloud-blue-sky_1017702.htm#query=weather%20background&position=0&from_view=keyword">
            Image by jannoon028 on Freepik
          </a>
        ),
      });
    } else if (weather === "Snow") {
      setBgImage({
        img: 'bg-[url("../images/snow.jpg")]',
        component: (
          <a href="https://www.freepik.com/free-photo/beautiful-shot-mountains-trees-covered-snow-fog_10584363.htm#query=snow%20weather&position=37&from_view=search&track=sph">
            Image by wirestock on Freepik
          </a>
        ),
      });
    } else {
      setBgImage({
        img: "bg-orange-100",
      });
    }
  }

  useEffect(() => {
    const favourite = localStorage.getItem("favourite");
    const temp = favourite.split(",");
    if (favourite) setFavouriteCountry(temp);
  }, []);

  useEffect(() => {
    let timerId;
    if (weatherData.weather) {
      timerId = setTimeout(changeBackgroundImg, 500);
    }
    return () => clearTimeout(timerId);
  }, [weatherData]);

  useEffect(() => {
    let timerId;
    if (latLong.lat) {
      timerId = setTimeout(getWeatherData, 500);
    }
    return () => clearTimeout(timerId);
  }, [latLong.lat]);

  const putToSearch = async (country) => {
    setLocation(country);
    await getLatLong(country);
  };

  return (
    <div
      className={`w-full h-screen App bg-cover flex flex-col justify-between ${bgImage.img}`}
    >
      <div className="flex flex-col items-center justify-evenly h-[96%]">
        <header className="flex flex-col items-center justify-around w-full h-1/5">
          <h1 className="text-5xl font-bold">Weather App</h1>
          <label className="flex justify-center w-1/2">
            <input
              className="w-1/2 pl-5 border rounded h-14"
              type="text"
              maxLength="20"
              placeholder="Type your city or country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button
              onClick={handleSearch}
              className="w-1/6 border bg-slate-200 "
            >
              Search
            </button>
          </label>
        </header>
        {weatherData.country && (
          <main className="flex flex-row w-[70%] h-3/6 justify-between font-Dosis">
            <div className="w-[35%] border rounded flex flex-col items-center justify-evenly bg-slate-50">
              <h1 className="font-extrabold text-8xl">
                {weatherData.normalTemp?.toFixed(0)}°
              </h1>
              <p className="text-3xl">{weatherData.weather}</p>
              <h2 className="text-4xl font-semibold">
                {latLong.name}, {weatherData.country}
              </h2>
              {!isFavourite ? (
                <button onClick={() => addToFavourite()}>
                  Save to favourite
                </button>
              ) : (
                <button onClick={() => deleteFromFavourite()}>
                  Delete from favourite
                </button>
              )}
            </div>

            <div className="w-[60%] border rounded grid grid-cols-2 grid-row-4 gap-4 p-10 bg-slate-50 font-Dosis">
              <InnerGrid
                title="High/Low"
                content={weatherData.highTemp?.toFixed(0)}
                content2={weatherData.lowTemp?.toFixed(0)}
              />
              <InnerGrid title="Wind" content={`${weatherData.wind} km/hr`} />
              <InnerGrid
                title="Humidity"
                content={`${weatherData.humidity} %`}
              />
              <InnerGrid
                title="Wind Direction"
                content={`${weatherData.windDirection}° deg`}
              />
              <InnerGrid
                title="Pressure"
                content={`${weatherData.pressure} hPa`}
              />
              <InnerGrid title="Sunrise" content={weatherData.sunrise} />
              <InnerGrid
                title="Visibility"
                content={`${weatherData.visibility / 1000} Km`}
              />
              <InnerGrid title="Sunset" content={weatherData.sunset} />
            </div>
          </main>
        )}

        <div className="flex justify-center w-full h-content">
          <div className="flex items-center justify-center w-4/5 pt-5 bg-white rounded-3xl">
            <div className="flex flex-wrap justify-center w-full px-10 text-lg font-semibold">
              My Favourite locations :
              {!favouriteCountry.length ? (
                <p className="ml-5">None</p>
              ) : (
                favouriteCountry.map((country, index) => {
                  return (
                    <button
                      className="px-5 mb-5 ml-5 border rounded-3xl hover:opacity-100 bg-blue-400/50"
                      key={index}
                      onClick={() => putToSearch(country)}
                    >
                      {country}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="flex flex-row-reverse justify-between px-5 text-orange-400">
        <p>Design by Kladex</p>
        {bgImage && bgImage.component}
      </footer>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {},
  };
}
