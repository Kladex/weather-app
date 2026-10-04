const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("next/dist/build/swc");

function load(file, dependencies = {}, env = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const { code } = transformSync(source, {
    filename: file,
    jsc: { parser: { syntax: "ecmascript", jsx: true } },
    module: { type: "commonjs" },
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    URL,
    require: (name) => dependencies[name],
    process: { env: { API_KEY: "test-key", ...env } },
  });
  return module.exports;
}

const time = load("utils/getNormalTime.js").default;

test("observations exclude stale, far, missing and future readings while preserving zero rain and negative water datum", () => {
  const lib = load("libs/flood-data.js", { axios: {} });
  const now = Date.parse("2026-10-04T15:00:00+07:00");
  const row = { station: { id: 1, tele_station_lat: 13.75, tele_station_long: 100.5 }, rain_24h: 0, rainfall_datetime: "2026-10-04 14:00" };
  const result = lib.nearbyRainfall({ data: [row, { ...row, station: { ...row.station, id: 2, tele_station_lat: 20 } }, { ...row, rainfall_datetime: "2026-10-03 14:00" }, { ...row, rainfall_datetime: "2026-10-04 16:00" }, { ...row, rain_24h: null }] }, 13.75, 100.5, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].rainMm, 0);
  const water = lib.nearbyWaterLevels({ waterlevel_data: { data: [{ ...row, waterlevel_datetime: row.rainfall_datetime, waterlevel_msl: "-0.5", waterlevel_msl_previous: "-0.6" }, { ...row, waterlevel_datetime: row.rainfall_datetime, waterlevel_msl: "" }] } }, 13.75, 100.5, now);
  assert.equal(water.length, 1);
  assert.equal(water[0].levelMsl, -0.5);
  assert.equal(water[0].changeCm, 10);
  assert.throws(() => lib.nearbyRainfall({}, 0, 0));
  assert.throws(() => lib.nearbyWaterLevels({}, 0, 0));
});

test("warnings decode Thai XML, retain full text and reject blank responses", () => {
  const { parseWarnings } = load("libs/flood-data.js", { axios: {} });
  const result = parseWarnings('<WeatherForecastDaily><Warnings/><Warning><IssueNo>6</IssueNo><TitleThai>&#xE1D;&#xE19;</TitleThai><DescriptionThai>heavy rain &amp; floods</DescriptionThai><AnnounceDate>2026-10-04 05:46:07</AnnounceDate></Warning></WeatherForecastDaily>');
  assert.equal(result[0].title, "ฝน");
  assert.equal(result[0].description, "heavy rain & floods");
  assert.equal(result[0].announcedAt, "2026-10-04T05:46:07+07:00");
  assert.equal(parseWarnings('<WeatherForecastDaily><Warnings/></WeatherForecastDaily>').length, 0);
  assert.throws(() => parseWarnings(""));
  assert.throws(() => parseWarnings('<WeatherForecastDaily><Warning><TitleThai>Rain</TitleThai></Warning></WeatherForecastDaily>'));
});

test("city time uses its UTC offset, including day rollover", () => {
  assert.equal(time(0, 25200), "07:00:00");
  assert.equal(time(0, -18000), "19:00:00");
  assert.equal(time(7200, 25200), "09:00:00");
  assert.equal(time(0, 19800), "05:30:00");
});

test("unknown locations return null and queries are encoded over HTTPS", async () => {
  let url;
  const lib = load("libs/load-data.js", {
    axios: { get: async (value) => { url = value; return { data: [] }; } },
    "../utils/getNormalTime": time,
  });
  assert.equal(await lib.getLatLong(" A&B "), null);
  assert.match(url, /^https:\/\//);
  assert.match(url, /q=A%26B&/);
});

test("weather converts wind to km/hr and formats city sunrise and sunset", async () => {
  const lib = load("libs/load-data.js", {
    axios: { get: async () => ({ data: {
      sys: { country: "TH", sunrise: 0, sunset: 3600 },
      main: { feels_like: 32 }, wind: { speed: 10, deg: 90 },
      dt: 3600, timezone: 25200, weather: [{ main: "Clear" }],
    } }) },
    "../utils/getNormalTime": time,
  });
  const data = await lib.getWeatherData(0, 100);
  assert.equal(data.wind, 36);
  assert.equal(data.sunrise, "07:00:00");
  assert.equal(data.sunset, "08:00:00");
  assert.equal(data.updatedAt, "08:00:00");
  assert.equal(data.feelsLike, 32);
});

async function request(file, dependency, req) {
  const handler = load(file, { "../../libs/load-data": dependency }).default;
  const res = {
    setHeader(key, value) { this[key] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler(req, res);
  return res;
}

test("geocoding API handles invalid, missing, unknown and unavailable locations", async () => {
  const file = "pages/api/latlon.js";
  assert.equal((await request(file, {}, { method: "GET" })).statusCode, 405);
  for (const data of [undefined, " ", 123]) {
    assert.equal((await request(file, {}, { method: "POST", body: { data } })).statusCode, 400);
  }
  assert.equal((await request(file, { getLatLong: async () => null },
    { method: "POST", body: { data: "unknown" } })).statusCode, 404);
  assert.equal((await request(file, { getLatLong: async () => { throw Error(); } },
    { method: "POST", body: { data: "Bangkok" } })).statusCode, 502);
});

test("weather API accepts zero coordinates and rejects invalid coordinates", async () => {
  const file = "pages/api/weather-data.js";
  const dependency = { getWeatherData: async (lat, lon) => ({ lat, lon }) };
  const zero = await request(file, dependency, { method: "POST", body: { lat: 0, lon: 0 } });
  assert.equal(zero.statusCode, 200);
  assert.equal(zero.body.lat, 0);
  for (const body of [undefined, { lat: 91, lon: 0 }, { lat: 0, lon: 181 }, { lat: "0", lon: 0 }]) {
    assert.equal((await request(file, dependency, { method: "POST", body })).statusCode, 400);
  }
  assert.equal((await request(file, { getWeatherData: async () => { throw Error(); } },
    { method: "POST", body: { lat: 0, lon: 0 } })).statusCode, 502);
});

// Drive the actual page's handlers with a small hook harness, without a browser or live API.
function page(post) {
  const states = [], refs = [];
  let stateIndex, refIndex;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = value; }];
    },
    useRef(initial) {
      const index = refIndex++;
      return refs[index] || (refs[index] = { current: initial });
    },
    useEffect() {},
  };
  const Home = load("pages/index.js", {
    react, "../utils/i18n": { makeTranslator: () => (value) => value }, axios: { post }, "next/head": () => {}, "next/link": () => {}, "../components/InnerGrid": () => {}, "../components/Icon": () => {}, "../components/FloodWatch": () => {},
  }).default;
  function render() { stateIndex = refIndex = 0; return Home(); }
  function find(node, type) {
    if (!node || typeof node !== "object") return;
    if (node.type === type) return node;
    for (const child of node.children || []) {
      const match = find(child, type);
      if (match) return match;
    }
  }
  return {
    states,
    search(name) {
      find(render(), "input").props.onChange({ target: { value: name } });
      return find(render(), "form").props.onSubmit({ preventDefault() {} });
    },
  };
}

test("page reloads weather at latitude zero and when only longitude changes", async () => {
  const calls = [];
  const ui = page(async (url, body) => {
    calls.push([url, body]);
    return { data: url === "/api/latlon"
      ? { name: body.data, lat: 0, lon: body.data === "A" ? 1 : 2 }
      : { country: "TH", normalTemp: body.lon } };
  });
  await ui.search("A");
  await ui.search("B");
  assert.equal(calls.filter(([url]) => url === "/api/weather-data").length, 2);
  assert.equal(ui.states[1].lon, 2);
  assert.equal(ui.states[0].normalTemp, 2);
  assert.equal(ui.states[3], false);
});

test("failed searches show errors while preserving the previous city and weather", async () => {
  const ui = page(async (url, body) => {
    if (body.data === "missing") throw { response: { data: { error: "Location not found." } } };
    return { data: url === "/api/latlon" ? { name: "A", lat: 1, lon: 2 } : { country: "TH" } };
  });
  await ui.search("A");
  await ui.search("missing");
  assert.equal(ui.states[4], "Location not found.");
  assert.equal(ui.states[1].name, "A");
  assert.equal(ui.states[0].country, "TH");
  assert.equal(ui.states[3], false);
});

test("late responses cannot overwrite a newer search", async () => {
  let finishOld;
  let markStarted;
  const oldWeatherStarted = new Promise((resolve) => { markStarted = resolve; });
  const ui = page(async (url, body) => {
    if (url === "/api/latlon") return { data: { name: body.data, lat: 1, lon: 2 } };
    if (!finishOld) return new Promise((resolve) => {
      finishOld = resolve;
      markStarted();
    });
    return { data: { country: "NEW" } };
  });
  const oldSearch = ui.search("old");
  await oldWeatherStarted;
  assert.equal(ui.states[3], true);
  await ui.search("new");
  finishOld({ data: { country: "OLD" } });
  await oldSearch;
  assert.equal(ui.states[1].name, "new");
  assert.equal(ui.states[0].country, "NEW");
  assert.equal(ui.states[3], false);
});

const flood = load("libs/flood-data.js", { axios: {} });

test("broken, stale, missing and future road readings never count as current floods", () => {
  const now = Date.parse("2026-10-04T07:00:00Z");
  const row = { flood_code: "FL.TEST.01", flood: 20, status: 1, chkStatustxt: "น้ำท่วม", site_timestamp: `/Date(${now})/` };
  const variants = [
    { ...row },
    { ...row, flood_code: "broken", status: 0 },
    { ...row, flood_code: "old", site_timestamp: `/Date(${now - 61 * 60000})/` },
    { ...row, flood_code: "future", site_timestamp: `/Date(${now + 10 * 60000})/` },
    { ...row, flood_code: "missing-time", site_timestamp: null },
    { ...row, flood_code: "missing-depth", flood: null },
    { ...row, flood_code: "unknown-status", chkStatustxt: "ไม่ทราบ" },
    { ...row },
  ];
  const stations = flood.normalizeRoads({ dtTbl: variants }, now);
  assert.equal(stations.length, 7);
  assert.equal(stations[0].depthCm, 20);
  assert.equal(stations[0].observedAt, "2026-10-04T07:00:00.000Z");
  assert.equal(stations.filter((station) => station.flooded).length, 1);
  assert.equal(stations.filter((station) => station.available).length, 1);
  assert.throws(() => flood.normalizeRoads({ dtTbl: [] }), /format unavailable/);
});

test("radar parser uses only official images and preserves bulletin time", () => {
  const html = '<img id="ContentPlaceHolder1_im1" src="ImageHandlerNongchokAni.ashx?test"><span id="repeaDaily_lblDESCRIPTION_0">วันที่ 4 ตุลาคม 2569 เวลา 14.15 น.</span>';
  const radar = flood.parseRadar(html);
  assert.equal(radar.imageUrl, "https://weather.bangkok.go.th/Radar/ImageHandlerNongchokAni.ashx?test");
  assert.match(radar.bulletin, /14.15/);
  assert.throws(() => flood.parseRadar(html.replace("ImageHandlerNongchokAni.ashx?test", "https://example.com/image.gif")), /Unexpected/);
  assert.throws(() => flood.parseRadar("<html>offline</html>"), /unavailable/);
});

test("forecast keeps missing hours distinct from zero rainfall", () => {
  const input = {
    hourly: {
      time: Array.from({ length: 72 }, (_, i) => new Date(Date.UTC(2026, 9, 4, i)).toISOString().slice(0, 16)),
      precipitation: Array(72).fill(0), precipitation_probability: Array(72).fill(0),
    }, hourly_units: { precipitation: "mm", precipitation_probability: "%" },
    timezone: "Asia/Bangkok", utc_offset_seconds: 25200,
  };
  input.hourly.precipitation[2] = null;
  input.hourly.precipitation_probability[2] = null;
  const forecast = flood.normalizeForecast(input);
  assert.equal(forecast.hours.length, 72);
  assert.equal(forecast.hours[0].rainMm, 0);
  assert.equal(forecast.hours[2].rainMm, null);
  assert.equal(forecast.hours[2].probability, null);
  input.hourly.precipitation = Array(72).fill(null);
  assert.throws(() => flood.normalizeForecast(input), /No forecast/);
});

test("forecast API validates coordinates and reports upstream failures", async () => {
  async function call(query, method = "GET") {
    const handler = load("pages/api/rain-forecast.js", {
      "../../libs/flood-data": { getRainForecast: async () => { throw Error("offline"); } },
    }).default;
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method, query }, res);
    return res;
  }
  for (const query of [{}, { lat: "", lon: "0" }, { lat: "91", lon: "0" }, { lat: ["0"], lon: "0" }]) {
    assert.equal((await call(query)).code, 400);
  }
  assert.equal((await call({ lat: "0", lon: "0" })).code, 502);
  assert.equal((await call({}, "POST")).code, 405);
});

test("collector fallback preserves observation timestamps and rejects old snapshots", async () => {
  const now = Date.now();
  const snapshot = { fetchedAt: new Date(now).toISOString(), dtTbl: [{ flood_code: "FL.TEST.01", flood: 20, site_timestamp: `/Date(${now})/`, status: 1, chkStatustxt: "น้ำท่วม" }] };
  for (const stale of [false, true]) {
    const calls = [];
    const lib = load("libs/flood-data.js", { axios: { get: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) throw Object.assign(new Error("Forbidden"), { response: { status: 403 } });
      return { data: { ...snapshot, fetchedAt: new Date(now - (stale ? 360000 : 0)).toISOString() } };
    } } }, { BANGKOK_COLLECTOR_URL: "https://collector.example/roads", BANGKOK_COLLECTOR_TOKEN: "test-secret" });
    if (stale) await assert.rejects(lib.getRoads(), /snapshot unavailable/);
    else {
      const roads = await lib.getRoads();
      assert.equal(roads.stations[0].observedAt, new Date(now).toISOString());
      assert.equal(roads.stations[0].flooded, true);
      assert.equal(roads.fetchedAt, snapshot.fetchedAt);
    }
    assert.equal(calls[1].options.headers.Authorization, "Bearer test-secret");
    assert.equal(calls[1].options.maxRedirects, 0);
  }
});

test("collector requires authentication, shares concurrent fetches and returns safe failures", async () => {
  const { createCollector } = require("../services/bangkok-collector.cjs");
  const token = "test-token-32-characters-long-secret";
  for (const failing of [false, true]) {
    let calls = 0;
    const server = createCollector({ token, fetchSource: async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 20));
      if (failing) throw Object.assign(new Error("private details"), { response: { status: 403, data: "private response" } });
      return { data: { dtTbl: [{ flood_code: "FL.TEST.01", site_timestamp: "/Date(0)/" }] } };
    } });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const url = `http://127.0.0.1:${server.address().port}/roads`;
      assert.equal((await fetch(url)).status, 401);
      assert.equal(calls, 0);
      const responses = await Promise.all([1, 2].map(() => fetch(url, { headers: { Authorization: `Bearer ${token}` } })));
      const bodies = await Promise.all(responses.map(response => response.json()));
      assert.equal(calls, 1);
      if (failing) {
        assert.equal(responses[0].status, 502);
        assert.equal(bodies[0].upstreamStatus, 403);
        assert.equal(JSON.stringify(bodies).includes("private"), false);
      } else {
        assert.equal(responses[0].status, 200);
        assert.equal(bodies[0].dtTbl[0].site_timestamp, "/Date(0)/");
        await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(calls, 1);
      }
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
});

test("TMD radar remains available when Bangkok rejects the bulletin or changes its page", async () => {
  for (const get of [async () => { throw Object.assign(new Error("Forbidden"), { response: { status: 403 } }); }, async () => ({ data: "unrecognized page" })]) {
    const lib = load("libs/flood-data.js", { axios: { get } });
    const radar = await lib.getRadar();
    assert.equal(new URL(radar.imageUrl).origin, "https://weather.tmd.go.th");
    assert.equal(new URL(radar.imageUrl).pathname, "/pic_bmancLoop.gif");
    assert.equal(radar.bulletin, null);
    assert.equal(radar.imageSource, "https://weather.tmd.go.th/bma_ncLoop.php");
  }
});

test("Bangkok monitor preserves radar when road source fails", async () => {
  const handler = load("pages/api/bangkok-monitor.js", {
    "../../libs/flood-data": {
      getRoads: async () => { throw Error("offline"); },
      getRadar: async () => ({ imageUrl: "official-radar" }),
      ROAD_SOURCE: "road-source", RADAR_SOURCE: "radar-source",
    },
  }).default;
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 200);
  assert.ok(res.body.roads.error);
  assert.equal(res.body.radar.imageUrl, "official-radar");
});


test("language dictionaries translate labels, dynamic units and keep unknown station names", () => {
  const dict = JSON.parse(fs.readFileSync(path.join(__dirname, "../utils/translations.json"), "utf8"));
  const { makeTranslator, formatWatchTime } = load("utils/i18n.js", { "./translations.json": dict });
  assert.equal(makeTranslator("th")("Search"), "ค้นหา");
  assert.equal(makeTranslator("en")("สถานการณ์น้ำ"), "Rainfall & water levels");
  assert.equal(makeTranslator("en")("1.5 ซม."), "1.5 cm");
  assert.equal(makeTranslator("en")("สะพานพระพุทธยอดฟ้า"), "สะพานพระพุทธยอดฟ้า");
  assert.equal(formatWatchTime(null, "en"), "Unknown time");
});

test("forecast hides failed data rather than rendering an empty card", () => {
  let index = 0;
  const component = load("components/FloodWatch.js", {
    axios: {}, "next/image": () => {}, "./Icon": () => {},
    "../utils/i18n": { makeTranslator: () => (value) => value, formatWatchTime: () => "time" },
    react: { useState: () => [index++ === 1 ? "failed" : null, () => {}], useEffect: () => {}, useCallback: (fn) => fn },
  }).RainForecast;
  assert.equal(component({ coordinates: null }), null);
});
