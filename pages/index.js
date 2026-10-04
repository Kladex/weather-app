import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import InnerGrid from "../components/InnerGrid";
import Icon from "../components/Icon";
import FloodWatch from "../components/FloodWatch";

export default function Home() {
  const [weatherData, setWeatherData] = useState({});
  const [latLong, setLatLong] = useState({});
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const searchId = useRef(0);
  const [favouriteCountry, setFavouriteCountry] = useState([]);

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
        setError(err.response?.data?.error || "Unable to load the weather. Please try again.");
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
    <div className="weather-app">
      <Head>
        <title>{hasWeather ? `${latLong.name} · ${temperature(weatherData.normalTemp)}°C` : "Weather App · A little clarity for your day"}</title>
        <meta name="description" content="A calmer way to check the weather. Search a city, explore current conditions, and keep your favourite places close." />
      </Head>
      <a className="skip-link" href="#main">Skip to weather</a>
      <div className="app-shell">
        <header className="topbar">
          <Link href="/"><a className="brand" aria-label="Weather App home"><span className="brand-icon"><Icon name="sun" /></span>weather<span className="brand-dot">.</span></a></Link>
          <span className="topbar-note"><span className="live-dot" />A window to the world</span>
          <span className="brand-credit">BY KLADEX</span>
        </header>
        <main id="main">
          <section className="page-intro" aria-labelledby="page-title">
            <div><p className="eyebrow">EVERYDAY, EVERYWHERE</p><h1 id="page-title">Your day, at a glance<span>.</span></h1><p className="intro-copy">A little weather insight. A better start to your day.</p></div>
            <div className="search-area">
              <form onSubmit={handleSearch} className="search-form" role="search">
                <Icon name="search" />
                <label className="sr-only" htmlFor="city-search">Search a city or country</label>
                <input id="city-search" type="search" autoComplete="off" maxLength={100} placeholder="Search a city or country" value={location} onChange={(e) => setLocation(e.target.value)} aria-describedby="search-hint" />
                <button type="submit" className="search-button" aria-label="Search weather"><span>Search</span><Icon name="arrow" /></button>
              </form>
              <p id="search-hint" className="search-hint">Try “Bangkok” or “Paris, FR” for a more specific result.</p>
            </div>
          </section>
          <div className="feedback" aria-live="polite">
            {isLoading && <p role="status" className="loading-message"><span className="spinner" />Finding the latest weather for {location}…</p>}
            {error && <p role="alert" className="error-message"><span>{error}</span><button onClick={() => searchWeather(location)}>Try again <Icon name="refresh" /></button></p>}
          </div>
          <a className="flood-jump" href="#flood-watch"><Icon name="drop" /><span>Rain & flood watch <small>ฝนล่วงหน้า · น้ำบนถนน กทม. · เรดาร์ · ประกาศทางการ</small></span><Icon name="arrow" /></a>
          <div className="dashboard">
            <div className="weather-column" aria-busy={isLoading}>
              <section className={`weather-hero condition-${condition} ${!hasWeather ? "welcome-hero" : ""}`} aria-labelledby="weather-title">
                <div className="hero-top"><span className="hero-label"><span className="live-dot" />{hasWeather ? "CURRENT WEATHER" : "A FRESH PERSPECTIVE"}</span>
                  {hasWeather && <button className={`save-button ${isFavourite ? "is-saved" : ""}`} onClick={toggleFavourite} aria-pressed={isFavourite} disabled={!isFavourite && favouriteCountry.length >= 14} aria-label={isFavourite ? "Remove from saved places" : "Save this place"}><Icon name="star" /><span>{isFavourite ? "Saved" : favouriteCountry.length >= 14 ? "14 places saved" : "Save place"}</span></button>}
                </div>
                <div className="weather-art" aria-hidden="true"><div className="sun-orb" /><div className="cloud cloud-back" /><div className="cloud cloud-front" /><div className="rain-lines"><i /><i /><i /></div></div>
                {hasWeather ? <div className="hero-content">
                  <h2 id="weather-title" className="city-title"><Icon name="pin" />{latLong.name}<span>{weatherData.country}</span></h2>
                  <p className="temperature">{temperature(weatherData.normalTemp)}<span>°</span><small>C</small></p>
                  <p className="condition-label">{weatherData.weather}<span>Feels like {temperature(weatherData.feelsLike ?? weatherData.normalTemp)}°C</span></p>
                  <div className="hero-bottom"><span>High {temperature(weatherData.highTemp)}° <span className="divider">/</span> Low {temperature(weatherData.lowTemp)}°</span><button onClick={() => searchWeather(latLong.name)} disabled={isLoading} className="refresh-button" aria-label="Refresh weather"><Icon name="refresh" />Refresh</button></div>
                </div> : <div className="hero-content welcome-content">
                  <h2 id="weather-title">A little clarity<br />for your day.</h2><p>From your neighbourhood to your next adventure.<br className="desktop-break" /> Find out what the sky has in store.</p>
                  <button className="welcome-button" onClick={() => putToSearch("Bangkok")}>Explore Bangkok <Icon name="arrow" /></button>
                  <span className="welcome-caption">Or search for any city above</span>
                </div>}
              </section>
              {hasWeather ? <>
                <div className="section-heading"><h2>The details</h2><span>{weatherData.updatedAt && !weatherData.updatedAt.includes("NaN") ? `Observed at ${weatherData.updatedAt.slice(0, 5)} · local time` : "Current conditions"}</span></div>
                <section className="metrics-grid" aria-label="Weather details">
                  <InnerGrid icon="wind" title="Wind speed" content={weatherData.wind} unit="km/h" />
                  <InnerGrid icon="drop" title="Humidity" content={weatherData.humidity} unit="%" />
                  <InnerGrid icon="eye" title="Visibility" content={weatherData.visibility != null ? Number((weatherData.visibility / 1000).toFixed(1)) : undefined} unit="km" />
                  <InnerGrid icon="pressure" title="Pressure" content={weatherData.pressure} unit="hPa" />
                  <InnerGrid icon="compass" title="Wind direction" content={weatherData.windDirection} unit="°" />
                  <InnerGrid icon="thermometer" title="Current high / low" content={`${temperature(weatherData.highTemp)}°`} content2={`${temperature(weatherData.lowTemp)}°`} unit="C" />
                </section>
                <section className="sunlight-card" aria-label="Sunrise and sunset"><div className="sunlight-time"><Icon name="sunrise" /><div><span>Sunrise</span><strong>{weatherData.sunrise?.slice(0, 5) || "—"}</strong></div></div><div className="sunlight-arc" aria-hidden="true"><span><Icon name="sun" /></span></div><div className="sunlight-time"><div><span>Sunset</span><strong>{weatherData.sunset?.slice(0, 5) || "—"}</strong></div><Icon name="sunset" /></div><p>Times in {latLong.name}</p></section>
              </> : <div className="getting-started"><span className="getting-started-icon"><Icon name="compass" /></span><div><h3>Anywhere you&apos;re headed.</h3><p>Search a place to see temperature, wind, humidity and more.</p></div></div>}
            </div>
            <aside className="places-column" aria-label="Places to explore">
              <section className="saved-panel"><div className="section-heading"><h2>Saved places</h2><span className="count-badge">{favouriteCountry.length}</span></div>
                {favouriteCountry.length ? <ul className="saved-list">{favouriteCountry.map((country) => <li key={country} className={country === checkLocation ? "active-place" : ""}><button className="saved-place" onClick={() => putToSearch(country)} aria-current={country === checkLocation ? "location" : undefined}><Icon name="pin" /><span>{country}</span><Icon name="arrow" /></button><button className="remove-place" onClick={() => saveFavourites(favouriteCountry.filter((name) => name !== country))} aria-label={`Remove ${country} from saved places`}><Icon name="close" /></button></li>)}</ul> : <div className="saved-empty"><span className="empty-star"><Icon name="star" /></span><h3>Your places, closer.</h3><p>Tap “Save place” after a search<br />to keep your favourites here.</p><span className="storage-note">Saved on this device</span></div>}
                {favouriteCountry.length > 0 && <p className="storage-note">Saved on this device · up to 14 places</p>}
              </section>
              <section className="explore-panel"><div className="section-heading"><h2>Around the world</h2><Icon name="compass" /></div><p className="panel-description">A new city. A different sky.</p><div className="city-list">{[{name:"Bangkok",country:"Thailand",code:"BKK"},{name:"London",country:"United Kingdom",code:"LON"},{name:"Tokyo",country:"Japan",code:"TYO"},{name:"New York",country:"United States",code:"NYC"}].map((city) => <button className="explore-city" key={city.name} onClick={() => putToSearch(city.name)}><span className={`city-monogram city-${city.code.toLowerCase()}`}>{city.code}</span><span className="city-name"><strong>{city.name}</strong><span>{city.country}</span></span><Icon name="arrow" /></button>)}</div></section>
              <div className="small-note"><Icon name="sun" /><p>A change of weather.<br />A change of perspective.</p></div>
            </aside>
          </div>
          <FloodWatch coordinates={hasWeather ? latLong : null} />
        </main>
        <footer className="footer"><span>Made for the everyday. <strong>Designed by Kladex.</strong></span><a href="https://openweathermap.org/" target="_blank" rel="noreferrer">Weather data by OpenWeather <Icon name="arrow" /></a></footer>
      </div>
    </div>
  );
}
