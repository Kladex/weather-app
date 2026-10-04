import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import InnerGrid from "../components/InnerGrid";
import Icon from "../components/Icon";
import FloodWatch from "../components/FloodWatch";
import { makeTranslator } from "../utils/i18n";

export default function Home() {
  const [weatherData, setWeatherData] = useState({});
  const [latLong, setLatLong] = useState({});
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const searchId = useRef(0);
  const [favouriteCountry, setFavouriteCountry] = useState([]);
  const [language, setLanguage] = useState("th");
  const t = makeTranslator(language);
  useEffect(() => {
    try { const saved = localStorage.getItem("weather-language"); if (saved === "th" || saved === "en") setLanguage(saved); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function changeLanguage(next) {
    setLanguage(next);
    try { localStorage.setItem("weather-language", next); } catch {}
  }

  async function searchWeather(location) {
    const currentSearch = ++searchId.current;
    setError("");
    if (!location.trim()) {
      setIsLoading(false);
      setError("Please enter a city or country.");
      return;
    }
    setIsLoading(true);
    try {
      const coordinates = await axios.post("/api/latlon", { data: location.trim() });
      if (currentSearch !== searchId.current) return;
      const result = await axios.post("/api/weather-data", coordinates.data);
      if (currentSearch !== searchId.current) return;
      setLatLong(coordinates.data);
      setWeatherData(result.data);
    } catch (err) {
      if (currentSearch === searchId.current) {
        setError(err.response?.data?.error || t("Unable to load the weather. Please try again."));
      }
    } finally {
      if (currentSearch === searchId.current) setIsLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    await searchWeather(location);
  }

  const putToSearch = async (country) => {
    setLocation(country);
    await searchWeather(country);
  };

  const checkLocation = latLong.name?.toLowerCase();
  const isFavourite = favouriteCountry.includes(checkLocation);
  const hasWeather = Number.isFinite(weatherData.normalTemp);
  const condition = (weatherData.weather || "Clear").toLowerCase();
  const temperature = (value) => Number.isFinite(value) ? Math.round(value) : "—";

  function saveFavourites(next) {
    try {
      localStorage.setItem("favourite", JSON.stringify(next));
      setFavouriteCountry(next);
    } catch {
      setError("Your browser could not save this place. Please allow local storage and try again.");
    }
  }

  function toggleFavourite() {
    if (isFavourite) {
      saveFavourites(favouriteCountry.filter((name) => name !== checkLocation));
    } else if (checkLocation && favouriteCountry.length < 14) {
      saveFavourites([...favouriteCountry, checkLocation]);
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("favourite");
      if (!stored) return;
      let favourites;
      try { favourites = JSON.parse(stored); }
      catch { favourites = stored.split(","); }
      if (Array.isArray(favourites)) {
        setFavouriteCountry([...new Set(favourites.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim().toLowerCase()))]);
      }
    } catch {
      setError("Saved places are unavailable in this browser. You can still search for weather.");
    }
  }, []);

  return (
    <div className="weather-app" lang={language}>
      <Head>
        <title>{hasWeather ? `${latLong.name} · ${temperature(weatherData.normalTemp)}°C` : t("Weather App · A little clarity for your day")}</title>
        <meta name="description" content="A calmer way to check the weather. Search a city, explore current conditions, and keep your favourite places close." />
      </Head>
      <a className="skip-link" href="#main">{t("Skip to weather")}</a>
      <div className="app-shell">
        <header className="topbar">
          <Link href="/"><a className="brand" aria-label={t("Weather App home")}><span className="brand-icon"><Icon name="sun" /></span>{t("weather")}<span className="brand-dot">{t(".")}</span></a></Link>
          <span className="topbar-note"><span className="live-dot" />{t("A window to the world")}</span>
          <nav className="language-switch" aria-label={language === "th" ? "เลือกภาษา" : "Language"}><button lang="th" aria-pressed={language === "th"} onClick={() => changeLanguage("th")}>ไทย</button><button lang="en" aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>English</button></nav><span className="brand-credit">{t("BY KLADEX")}</span>
        </header>
        <main id="main">
          <section className="page-intro" aria-labelledby="page-title">
            <div><p className="eyebrow">{t("EVERYDAY, EVERYWHERE")}</p><h1 id="page-title">{t("Your day, at a glance")}<span>{t(".")}</span></h1><p className="intro-copy">{t("A little weather insight. A better start to your day.")}</p></div>
            <div className="search-area">
              <form onSubmit={handleSearch} className="search-form" role="search">
                <Icon name="search" />
                <label className="sr-only" htmlFor="city-search">{t("Search a city or country")}</label>
                <input id="city-search" type="search" autoComplete="off" maxLength={100} placeholder={t("Search a city or country")} value={location} onChange={(e) => setLocation(e.target.value)} aria-describedby="search-hint" />
                <button type="submit" className="search-button" aria-label={t("Search weather")}><span>{t("Search")}</span><Icon name="arrow" /></button>
              </form>
              <p id="search-hint" className="search-hint">{t("Try “Bangkok” or “Paris, FR” for a more specific result.")}</p>
            </div>
          </section>
          <div className="feedback" aria-live="polite">
            {isLoading && <p role="status" className="loading-message"><span className="spinner" />{t("Finding the latest weather for ")}{location}{t("…")}</p>}
            {error && <p role="alert" className="error-message"><span>{t(error)}</span><button onClick={() => searchWeather(location)}>{t("Try again ")}<Icon name="refresh" /></button></p>}
          </div>
          <a className="flood-jump" href="#flood-watch"><Icon name="drop" /><span>{t("Rain & flood watch ")}<small>{t("ฝนล่วงหน้า · น้ำบนถนน กทม. · เรดาร์ · ประกาศทางการ")}</small></span><Icon name="arrow" /></a>
          <div className="dashboard">
            <div className="weather-column" aria-busy={isLoading}>
              <section className={`weather-hero condition-${condition} ${!hasWeather ? "welcome-hero" : ""}`} aria-labelledby="weather-title">
                <div className="hero-top"><span className="hero-label"><span className="live-dot" />{hasWeather ? t("CURRENT WEATHER") : t("A FRESH PERSPECTIVE")}</span>
                  {hasWeather && <button className={`save-button ${isFavourite ? "is-saved" : ""}`} onClick={toggleFavourite} aria-pressed={isFavourite} disabled={!isFavourite && favouriteCountry.length >= 14} aria-label={isFavourite ? t("Remove from saved places") : t("Save this place")}><Icon name="star" /><span>{isFavourite ? t("Saved") : favouriteCountry.length >= 14 ? t("14 places saved") : t("Save place")}</span></button>}
                </div>
                <div className="weather-art" aria-hidden="true"><div className="sun-orb" /><div className="cloud cloud-back" /><div className="cloud cloud-front" /><div className="rain-lines"><i /><i /><i /></div></div>
                {hasWeather ? <div className="hero-content">
                  <h2 id="weather-title" className="city-title"><Icon name="pin" />{latLong.name}<span>{weatherData.country}</span></h2>
                  <p className="temperature">{temperature(weatherData.normalTemp)}<span>{t("°")}</span><small>{t("C")}</small></p>
                  <p className="condition-label">{t(weatherData.weather)}<span>{t("Feels like ")}{temperature(weatherData.feelsLike ?? weatherData.normalTemp)}{t("°C")}</span></p>
                  <div className="hero-bottom"><span>{t("High ")}{temperature(weatherData.highTemp)}{t("° ")}<span className="divider">{t("/")}</span>{t(" Low ")}{temperature(weatherData.lowTemp)}{t("°")}</span><button onClick={() => searchWeather(latLong.name)} disabled={isLoading} className="refresh-button" aria-label={t("Refresh weather")}><Icon name="refresh" />{t("Refresh")}</button></div>
                </div> : <div className="hero-content welcome-content">
                  <h2 id="weather-title">{t("A little clarity")}<br />{t("for your day.")}</h2><p>{t("From your neighbourhood to your next adventure.")}<br className="desktop-break" />{t(" Find out what the sky has in store.")}</p>
                  <button className="welcome-button" onClick={() => putToSearch("Bangkok")}>{t("Explore Bangkok ")}<Icon name="arrow" /></button>
                  <span className="welcome-caption">{t("Or search for any city above")}</span>
                </div>}
              </section>
              {hasWeather ? <>
                <div className="section-heading"><h2>{t("The details")}</h2><span>{weatherData.updatedAt && !weatherData.updatedAt.includes("NaN") ? t(`Observed at ${weatherData.updatedAt.slice(0, 5)} · local time`) : t("Current conditions")}</span></div>
                <section className="metrics-grid" aria-label={t("Weather details")}>
                  <InnerGrid icon="wind" title={t("Wind speed")} content={weatherData.wind} unit={t("km/h")} />
                  <InnerGrid icon="drop" title={t("Humidity")} content={weatherData.humidity} unit="%" />
                  <InnerGrid icon="eye" title={t("Visibility")} content={weatherData.visibility != null ? Number((weatherData.visibility / 1000).toFixed(1)) : undefined} unit={t("km")} />
                  <InnerGrid icon="pressure" title={t("Pressure")} content={weatherData.pressure} unit={t("hPa")} />
                  <InnerGrid icon="compass" title={t("Wind direction")} content={weatherData.windDirection} unit="°" />
                  <InnerGrid icon="thermometer" title={t("Current high / low")} content={`${temperature(weatherData.highTemp)}°`} content2={`${temperature(weatherData.lowTemp)}°`} unit="C" />
                </section>
                {(weatherData.sunrise || weatherData.sunset) && <section className="sunlight-card" aria-label={t("Sunrise and sunset")}><div className="sunlight-time"><Icon name="sunrise" /><div><span>{t("Sunrise")}</span><strong>{weatherData.sunrise?.slice(0, 5) || "—"}</strong></div></div><div className="sunlight-arc" aria-hidden="true"><span><Icon name="sun" /></span></div><div className="sunlight-time"><div><span>{t("Sunset")}</span><strong>{weatherData.sunset?.slice(0, 5) || "—"}</strong></div><Icon name="sunset" /></div><p>{t("Times in ")}{latLong.name}</p></section>}
              </> : <div className="getting-started"><span className="getting-started-icon"><Icon name="compass" /></span><div><h3>{t("Anywhere you're headed.")}</h3><p>{t("Search a place to see temperature, wind, humidity and more.")}</p></div></div>}
            </div>
            <aside className="places-column" aria-label={t("Places to explore")}>
              <section className="saved-panel"><div className="section-heading"><h2>{t("Saved places")}</h2><span className="count-badge">{favouriteCountry.length}</span></div>
                {favouriteCountry.length ? <ul className="saved-list">{favouriteCountry.map((country) => <li key={country} className={country === checkLocation ? "active-place" : ""}><button className="saved-place" onClick={() => putToSearch(country)} aria-current={country === checkLocation ? "location" : undefined}><Icon name="pin" /><span>{country}</span><Icon name="arrow" /></button><button className="remove-place" onClick={() => saveFavourites(favouriteCountry.filter((name) => name !== country))} aria-label={t(`Remove ${country} from saved places`)}><Icon name="close" /></button></li>)}</ul> : <div className="saved-empty"><span className="empty-star"><Icon name="star" /></span><h3>{t("Your places, closer.")}</h3><p>{t("Tap “Save place” after a search")}<br />{t("to keep your favourites here.")}</p><span className="storage-note">{t("Saved on this device")}</span></div>}
                {favouriteCountry.length > 0 && <p className="storage-note">{t("Saved on this device · up to 14 places")}</p>}
              </section>
              <section className="explore-panel"><div className="section-heading"><h2>{t("Around the world")}</h2><Icon name="compass" /></div><p className="panel-description">{t("A new city. A different sky.")}</p><div className="city-list">{[{name:"Bangkok",country:t("Thailand"),code:"BKK"},{name:"London",country:t("United Kingdom"),code:"LON"},{name:"Tokyo",country:t("Japan"),code:"TYO"},{name:"New York",country:t("United States"),code:"NYC"}].map((city) => <button className="explore-city" key={city.name} onClick={() => putToSearch(city.name)}><span className={`city-monogram city-${city.code.toLowerCase()}`}>{city.code}</span><span className="city-name"><strong>{city.name}</strong><span>{t(city.country)}</span></span><Icon name="arrow" /></button>)}</div></section>
              <div className="small-note"><Icon name="sun" /><p>{t("A change of weather.")}<br />{t("A change of perspective.")}</p></div>
            </aside>
          </div>
          <FloodWatch language={language} coordinates={hasWeather ? latLong : null} />
        </main>
        <footer className="footer"><span>{t("Made for the everyday. ")}<strong>{t("Designed by Kladex.")}</strong></span><a href="https://openweathermap.org/" target="_blank" rel="noreferrer">{t("Weather data by OpenWeather ")}<Icon name="arrow" /></a></footer>
      </div>
    </div>
  );
}
