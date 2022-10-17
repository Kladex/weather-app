import axios from "axios";
import React, { useEffect, useState } from "react";
import Head from "next/head";

import InnerGrid from "../components/InnerGrid";

export default function Home() {
  const [weatherData, setWeatherData] = useState({});
  const [latLong, setLatLong] = useState({});
  const [location, setLocation] = useState("");
  const [bgImage, setBgImage] = useState({
    img: 'bg-[url("../images/clear.jpg")]',
    component: (
      <a href="https://www.freepik.com/free-photo/cloud-blue-sky_1017702.htm#query=weather%20background&position=0&from_view=keyword">
        Image by jannoon028 on Freepik
      </a>
    ),
  });
  const [favouriteCountry, setFavouriteCountry] = useState([]);

  async function getLatLong(location) {
    if (location.trim()) {
      const data = await axios.post("/api/latlon", { data: location });
      setLatLong(data.data);
    }
  }

  async function getWeatherData() {
    const result = await axios.post("/api/weather-data", latLong);
    const data = result.data;
    setWeatherData(data);
  }

  async function handleSearch(e) {
    e.preventDefault();
    await getLatLong(location);
  }

  const putToSearch = async (country) => {
    setLocation(country);
    await getLatLong(country);
  };

  //----- Check if the location in the search box is in favourite or not?
  const checkLocation = latLong.name?.toLowerCase() || false;
  const isFavourite = favouriteCountry.includes(checkLocation);

  function addToFavourite() {
    let favourite = [...favouriteCountry];

    if (!isFavourite && favourite.length <= 13 && checkLocation) {
      favourite = [...favourite, checkLocation];
      setFavouriteCountry(favourite);
      localStorage.setItem("favourite", favourite);
    }
  }

  function deleteFromFavourite() {
    const favouriteAfterDeleted = favouriteCountry.filter(
      (country) => country !== checkLocation
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
    }
  }

  useEffect(() => {
    const favourite = localStorage.getItem("favourite");
    const temp = favourite?.split(",");
    if (favourite) setFavouriteCountry(temp);
  }, []);

  useEffect(() => {
    let timerId;
    if (weatherData.weather) {
      timerId = setTimeout(changeBackgroundImg, 500);
    }
    return () => clearTimeout(timerId);
  }, [weatherData.weather]);

  useEffect(() => {
    let timerId;
    if (latLong.lat) {
      timerId = setTimeout(getWeatherData, 500);
    }
    return () => clearTimeout(timerId);
  }, [latLong.lat]);

  return (
    <div
      className={`w-full h-screen App bg-cover flex flex-col justify-between ${bgImage.img} transition ease-in-out`}
    >
      <Head>
        <title>Weather App</title>
      </Head>
      <div className="flex flex-col items-center justify-evenly h-[96%]">
        <header className="flex flex-col items-center justify-around w-full h-1/5">
          <h1 className="text-5xl font-bold">Weather App</h1>
          <form onSubmit={handleSearch} className="flex justify-center w-1/3">
            <label className="w-full mr-2">
              <input
                className="w-full pl-5 border rounded h-14"
                type="text"
                maxLength="20"
                placeholder="Type your city or country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <button type="submit" className="w-1/3 border rounded bg-slate-100">
              Search
            </button>
          </form>
        </header>

        {weatherData.country && (
          <main className="flex flex-row w-[70%] h-3/6 justify-between font-Dosis lg:flex-col lg:w-full lg:items-center lg:h-4/6 lg:justify-evenly">
            <div className="w-[35%] border rounded flex flex-col items-center justify-evenly bg-slate-50 lg:w-2/5 lg:py-5">
              <h1 className="font-extrabold text-8xl">
                {weatherData.normalTemp?.toFixed(0)}°
              </h1>
              <p className="text-3xl">{weatherData.weather}</p>
              <h2 className="text-4xl font-semibold text-blue-700">
                {latLong.name}, {weatherData.country}
              </h2>
              {!isFavourite && checkLocation ? (
                <button
                  onClick={() => addToFavourite()}
                  className="w-1/3 py-1 text-white transition ease-in-out bg-teal-500 rounded hover:bg-teal-600"
                >
                  Save to favourite
                </button>
              ) : (
                <button
                  className="w-1/3 py-1 text-white transition ease-in-out bg-red-600 rounded hover:bg-red-500"
                  onClick={() => deleteFromFavourite()}
                >
                  Delete from favourite
                </button>
              )}
            </div>

            <div className="grid w-3/5 grid-cols-2 gap-4 p-10 border rounded grid-row-4 bg-slate-50 font-Dosis">
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

        <div className="flex justify-center w-[85%] h-content">
          <div className="flex items-center justify-center w-4/5 py-5 rounded bg-slate-50/50">
            <div className="flex flex-wrap justify-center w-full px-10 text-lg font-semibold">
              My Favourite locations :
              {!favouriteCountry.length ? (
                <p className="ml-3">None</p>
              ) : (
                favouriteCountry.map((country, index) => {
                  return (
                    <button
                      className="px-5 mb-5 ml-5 transition ease-in-out bg-indigo-300 border hover:-translate-y-1 hover:scale-105 rounded-xl hover:text-white hover:bg-indigo-600"
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

      <footer className="flex flex-row-reverse justify-between px-3 text-orange-400">
        <p>Design by Kladex</p>
        {bgImage && bgImage.component}
      </footer>
    </div>
  );
}
