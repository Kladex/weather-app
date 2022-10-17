import axios from "axios";
import React, { useEffect, useState } from "react";
import { changeBackgroundImg } from "../libs/load-data";

import InnerGrid from "../components/InnerGrid";

export default function Home() {
  const [weatherData, setWeatherData] = useState({});
  const [latLong, setLatLong] = useState({});
  const [location, setLocation] = useState("");
  const [bgImage, setBgImage] = useState({});
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

  function changeBackgroundImage() {
    const result = changeBackgroundImg(weatherData);
    setBgImage(result);
  }

  useEffect(() => {
    const favourite = localStorage.getItem("favourite");
    const temp = favourite.split(",");
    if (favourite) setFavouriteCountry(temp);
  }, []);

  useEffect(() => {
    let timerId;
    if (weatherData.weather) {
      timerId = setTimeout(changeBackgroundImage, 500);
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
              <h2 className="text-4xl font-semibold text-blue-700">
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
