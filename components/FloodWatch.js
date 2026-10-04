import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";
import Icon from "./Icon";

const ROAD_URL = "https://weather.bangkok.go.th/floodbangkok/";
const RADAR_URL = "https://weather.bangkok.go.th/Radar/RadarAnimation.aspx";
const WARNING_URL = "https://tmd.go.th/warning-and-events";

function SourceLink({ href, children }) {
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">{children}<Icon name="arrow" /></a>;
}

function thaiTime(value) {
  return value ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "ไม่ทราบเวลา";
}

export function RainForecast({ coordinates }) {
  const lat = coordinates?.lat ?? 13.7563;
  const lon = coordinates?.lon ?? 100.5018;
  const name = coordinates?.name || "Bangkok";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState(24);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    axios.get("/api/rain-forecast", { params: { lat, lon } }).then((response) => {
      if (active) setData(response.data);
    }).catch(() => {
      if (active) setError("ยังโหลดพยากรณ์ฝนไม่ได้ ข้อมูลส่วนนี้ไม่ใช่สถานะความปลอดภัยของพื้นที่");
    });
    const timer = setInterval(() => setRefresh((value) => value + 1), 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [lat, lon, refresh]);

  const hours = data?.hours.slice(0, range) || [];
  const complete = hours.length === range && hours.every((hour) => hour.rainMm !== null);
  const total = complete ? hours.reduce((sum, hour) => sum + hour.rainMm, 0).toFixed(1) : "—";
  const probabilities = hours.map((hour) => hour.probability).filter((value) => value !== null);
  const probability = probabilities.length ? Math.max(...probabilities) : null;
  const peak = hours.filter((hour) => hour.rainMm !== null).reduce((best, hour) => !best || hour.rainMm > best.rainMm ? hour : best, null);
  const blockSize = range / 24;
  const bars = Array.from({ length: hours.length ? 24 : 0 }, (_, index) => {
    const block = hours.slice(index * blockSize, (index + 1) * blockSize);
    return { time: block[0].time, value: block.every((hour) => hour.rainMm !== null) ? Number(block.reduce((sum, hour) => sum + hour.rainMm, 0).toFixed(1)) : null };
  });
  const maxBar = Math.max(1, ...bars.map((bar) => bar.value || 0));
  return <section className="rain-panel watch-card" aria-labelledby="rain-title">
    <div className="watch-card-heading"><div><span className="data-tag forecast-tag">คาดการณ์</span><h3 id="rain-title">ฝนล่วงหน้า · {name}</h3></div><button className="watch-refresh" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh rain forecast"><Icon name="refresh" /></button></div>
    <div className="range-tabs" aria-label="ช่วงเวลาพยากรณ์">{[24, 48, 72].map((value) => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value} ชม.</button>)}</div>
    {!data && !error && <p className="watch-placeholder" role="status"><span className="spinner" />กำลังโหลดพยากรณ์ฝน…</p>}
    {error && <p className="watch-unavailable" role="status">{error}</p>}
    {data && <>
      <div className="rain-summary"><div><span>ฝนสะสมคาดการณ์</span><strong>{total}<small> มม.</small></strong></div><div><span>โอกาสฝนสูงสุด</span><strong>{probability ?? "—"}<small>{probability !== null ? "%" : ""}</small></strong></div><div><span>ช่วงฝนมากที่สุด</span><strong className="peak-time">{peak?.rainMm > 0 ? peak.time.slice(11, 16) : complete ? "ไม่พบฝน" : "ข้อมูลไม่ครบ"}</strong><small>{peak?.rainMm > 0 ? `${peak.time.slice(8, 10)}/${peak.time.slice(5, 7)} · ${peak.rainMm} มม./ชม.` : "ในพยากรณ์ช่วงนี้"}</small></div></div>
      {(!complete || probabilities.length !== range) && <p className="watch-unavailable">พยากรณ์บางชั่วโมงขาดหาย ค่าสูงสุดอ้างอิงเฉพาะชั่วโมงที่มีข้อมูล</p>}
      <div className="rain-chart" role="img" aria-label={`ฝนคาดการณ์ ${range} ชั่วโมง รวม ${total} มิลลิเมตร โอกาสฝนสูงสุด ${probability ?? "ไม่มีข้อมูล"} เปอร์เซ็นต์`}>
        <span className="chart-unit">มม. / {blockSize} ชม.</span><div className="rain-bars">{bars.map((bar, index) => <div className={`rain-bar-column ${bar.value === null ? "missing-bar" : ""}`} key={bar.time} title={`${bar.time.replace("T", " ")} · ${bar.value ?? "ไม่มีข้อมูล"} มม.`}><span className={`rain-bar ${bar.value === 0 ? "zero-rain" : ""}`} style={{ height: bar.value === null ? "0" : `${Math.max(2, bar.value / maxBar * 100)}%` }} /><span className="bar-time">{index % 4 === 0 && <><small>{bar.time.slice(8, 10)}/{bar.time.slice(5, 7)}</small>{bar.time.slice(11, 16)}</>}</span></div>)}</div>
      </div>
      <details className="hourly-details"><summary>ดูข้อมูลรายชั่วโมงและวันที่</summary><div className="hourly-scroll"><table><caption>พยากรณ์ฝน · {name} · {data.timezone}</caption><thead><tr><th>วัน / เวลา</th><th>ฝน (มม.)</th><th>โอกาสฝน</th></tr></thead><tbody>{hours.map((hour) => <tr key={hour.time}><td>{hour.time.replace("T", " ")}</td><td>{hour.rainMm ?? "ไม่มีข้อมูล"}</td><td>{hour.probability === null ? "ไม่มีข้อมูล" : `${hour.probability}%`}</td></tr>)}</tbody></table></div></details>
      <p className="watch-meta">ช่วงเริ่ม {hours[0]?.time.replace("T", " ")} · เวลา {data.timezone}<br />ดึงข้อมูลเมื่อ {thaiTime(data.fetchedAt)} (เวลาไทย)</p>
    </>}
    <p className="watch-note">พยากรณ์ฝนไม่ใช่การยืนยันว่าน้ำจะท่วม และโอกาสฝนไม่ใช่โอกาสน้ำท่วม</p>
    <SourceLink href="https://open-meteo.com/">ข้อมูลพยากรณ์โดย Open-Meteo</SourceLink>
  </section>;
}

function rainTone(mm) {
  return mm === null || mm === undefined ? "unknown" : mm >= 90.1 ? "danger" : mm >= 35.1 ? "watch" : "normal";
}

function roadTone(station) {
  return !station.available ? "unknown" : station.status === "น้ำท่วม" ? "danger" : station.flooded ? "watch" : "normal";
}

function rainLevel(mm) {
  if (mm >= 90.1) return "ฝนหนักมาก";
  if (mm >= 35.1) return "ฝนหนัก";
  if (mm >= 10.1) return "ฝนปานกลาง";
  return mm >= 0.1 ? "ฝนเล็กน้อย" : "ไม่มีฝนที่วัดได้ / น้อยกว่า 0.1 มม.";
}

function ObservedRain({ coordinates }) {
  const lat = coordinates?.lat ?? 13.7563;
  const lon = coordinates?.lon ?? 100.5018;
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    const fetchData = () => axios.get("/api/observed-rain", { params: { lat, lon } }).then((response) => {
      if (active) { setData(response.data); setError(false); }
    }).catch(() => { if (active) { setData(null); setError(true); } });
    fetchData();
    const timer = setInterval(fetchData, 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [lat, lon]);
  const nearest = data?.stations[0];
  return <section className="watch-card" aria-labelledby="observed-title">
    <span className="data-tag observation-tag">ตรวจวัดจริง · สถานีใกล้เมืองที่เลือก</span>
    <h3 id="observed-title">ฝนสะสมย้อนหลัง 24 ชั่วโมง</h3>
    {!data && !error && <p className="watch-placeholder" role="status">กำลังโหลดข้อมูลฝนตรวจวัด…</p>}
    {error && <p className="watch-unavailable" role="status">ยังโหลดข้อมูลไม่ได้ กรุณาตรวจแหล่งทางการ</p>}
    {data && !nearest && <p className="watch-unavailable">ไม่พบสถานีที่มีข้อมูลภายใน 3 ชั่วโมงล่าสุด ในระยะ 50 กม. ไม่ได้หมายความว่าไม่มีฝนตก</p>}
    {nearest && <>
      <div className="rain-summary"><div><span>สถานีใกล้ที่สุด · {nearest.name}</span><strong className={`value-${rainTone(nearest.rainMm)}`}>{nearest.rainMm}<small> มม.</small></strong></div></div>
      <p className={`rain-level ${nearest.rainMm >= 90.1 ? "rain-level-severe" : nearest.rainMm >= 35.1 ? "rain-level-heavy" : ""}`}>{rainLevel(nearest.rainMm)} · เกณฑ์ปริมาณฝนกรมอุตุฯ</p>
      <p className="watch-meta">{nearest.province} · ห่างจากพิกัดเมือง {nearest.distanceKm} กม.<br />ตรวจวัด {thaiTime(nearest.observedAt)} (เวลาไทย)<br />หน่วยงาน {nearest.agency}</p>
      <details className="station-details"><summary>ดูสถานีใกล้เคียง ({data.stations.length} จุด)</summary><div className="hourly-scroll"><table><thead><tr><th>สถานี / ระยะห่าง</th><th>ฝน 24 ชม.</th><th>เวลาตรวจวัด</th></tr></thead><tbody>{data.stations.map((station) => <tr key={station.id}><td>{station.name}<br /><small>{station.province} · {station.distanceKm} กม.</small></td><td><span className={`value-${rainTone(station.rainMm)}`}>{station.rainMm} มม.</span><br /><span className={`interpret-badge tone-${rainTone(station.rainMm)}`}>{rainLevel(station.rainMm)}</span></td><td>{thaiTime(station.observedAt)}</td></tr>)}</tbody></table></div></details>
    </>}
    {data && <p className="watch-meta">ดึงข้อมูลเมื่อ {thaiTime(data.fetchedAt)}</p>}
    <p className="watch-note">ค่า ณ สถานี ไม่ใช่ค่าเฉลี่ยทั้งเมือง ช่วงเวลาสะสมสิ้นสุดตามเวลาตรวจวัดของแต่ละสถานี ข้อมูลเกิน 3 ชั่วโมงไม่แสดง</p>
    <div className="rain-threshold-note"><strong>เมื่อไหร่ควรระวัง?</strong><p>ตั้งแต่ 35.1 มม. จัดเป็นฝนหนัก และตั้งแต่ 90.1 มม. เป็นฝนหนักมาก ควรติดตามประกาศเตือนภัยและระดับน้ำ โดยเฉพาะพื้นที่ลุ่มและใกล้ทางน้ำ</p><p>ไม่มีตัวเลขเดียวที่ยืนยันว่าจะน้ำท่วม ฝนต่ำกว่าเกณฑ์ก็เกิดน้ำท่วมได้ ขึ้นกับฝนสะสมก่อนหน้า น้ำจากต้นน้ำ และการระบายน้ำ</p><details><summary>ดูเกณฑ์ปริมาณฝน</summary><p>0.1–10.0 มม. · ฝนเล็กน้อย<br />10.1–35.0 มม. · ฝนปานกลาง<br />35.1–90.0 มม. · ฝนหนัก<br />ตั้งแต่ 90.1 มม. · ฝนหนักมาก</p><SourceLink href="https://www.tmd.go.th/info/เกณฑ์อากาศ">เกณฑ์อากาศ · กรมอุตุฯ</SourceLink></details></div>
    <SourceLink href="https://www.thaiwater.net/weather/rainfall">ตรวจข้อมูลฝน · ThaiWater</SourceLink>
  </section>;
}

function WaterLevels({ coordinates }) {
  const lat = coordinates?.lat ?? 13.7563;
  const lon = coordinates?.lon ?? 100.5018;
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    const fetchData = () => axios.get("/api/water-levels", { params: { lat, lon } }).then((response) => {
      if (active) { setData(response.data); setError(false); }
    }).catch(() => { if (active) { setData(null); setError(true); } });
    fetchData();
    const timer = setInterval(fetchData, 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [lat, lon]);
  const nearest = data?.stations[0];
  const trend = (station) => station.changeCm === null ? "ไม่มีค่าเปรียบเทียบ" : station.changeCm === 0 ? "เท่าเดิม" : `${station.changeCm > 0 ? "เพิ่ม" : "ลด"} ${Math.abs(station.changeCm)} ซม.`;
  return <section className="watch-card" aria-labelledby="water-level-title">
    <span className="data-tag observation-tag">ตรวจวัดจริง · แม่น้ำและคลอง</span>
    <h3 id="water-level-title">ระดับน้ำใกล้เมืองที่เลือก</h3>
    {!data && !error && <p className="watch-placeholder" role="status">กำลังโหลดระดับน้ำ…</p>}
    {error && <p className="watch-unavailable" role="status">ยังโหลดระดับน้ำไม่ได้ กรุณาตรวจแหล่งทางการ</p>}
    {data && !nearest && <p className="watch-unavailable">ไม่พบสถานีที่มีข้อมูลภายใน 3 ชั่วโมงล่าสุด ในระยะ 50 กม. ไม่สามารถสรุปสถานการณ์น้ำได้</p>}
    {nearest && <>
      <div className="rain-summary"><div><span>{nearest.name}</span><strong className={`value-${nearest.tone}`}>{nearest.levelMsl}<small> ม.รทก.</small></strong></div><div><span>เทียบค่าก่อนหน้าจากต้นทาง</span><strong className="peak-time">{trend(nearest)}</strong></div></div>
      <p className={`interpret-badge tone-${nearest.tone}`}>{nearest.status} · สถานะจาก ThaiWater</p>
      <p className="watch-meta">{nearest.river} · {nearest.province}<br />ห่างจากพิกัดเมือง {nearest.distanceKm} กม. · ตรวจวัด {thaiTime(nearest.observedAt)}</p>
      <details className="station-details"><summary>ดูสถานีใกล้เคียง ({data.stations.length} จุด)</summary><div className="hourly-scroll"><table><thead><tr><th>สถานี / ระยะห่าง</th><th>ระดับน้ำ (ม.รทก.)</th><th>เปลี่ยนแปลง / เวลา</th></tr></thead><tbody>{data.stations.map((station) => <tr key={station.id}><td>{station.name}<br /><small>{station.distanceKm} กม.</small></td><td><span className={`value-${station.tone}`}>{station.levelMsl}</span><br /><span className={`interpret-badge tone-${station.tone}`}>{station.status}</span></td><td>{trend(station)}<br /><small>{thaiTime(station.observedAt)}</small></td></tr>)}</tbody></table></div></details>
    </>}
    {data && <p className="watch-meta">ดึงข้อมูลเมื่อ {thaiTime(data.fetchedAt)}</p>}
    <p className="watch-note">สีแสดงสถานะน้ำจาก ThaiWater ไม่ได้ยืนยันความปลอดภัยของพื้นที่ ม.รทก. คือเมตรเทียบระดับทะเลปานกลาง ไม่ใช่ความลึกน้ำท่วม การเปลี่ยนแปลงเทียบค่าก่อนหน้าที่ต้นทางส่งมา ซึ่งไม่ระบุช่วงห่างเวลา จึงไม่ใช่อัตราน้ำขึ้นต่อชั่วโมง</p>
    <SourceLink href="https://www.thaiwater.net/water/waterlevel">ตรวจระดับน้ำ · ThaiWater</SourceLink>
  </section>;
}

function OfficialWarnings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const fetchWarnings = () => axios.get("/api/weather-warnings").then((response) => {
      if (active) { setData(response.data); setError(false); }
    }).catch(() => { if (active) { setData(null); setError(true); } });
    fetchWarnings();
    const timer = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <section className="official-warning watch-card" aria-labelledby="warning-title">
    <span className="data-tag official-tag">ประกาศทางการ · ประเทศไทย</span>
    <h3 id="warning-title">ประกาศเตือนภัย</h3>
    {!data && !error && <p className="watch-placeholder" role="status"><span className="spinner" />กำลังโหลดประกาศ…</p>}
    {error && <p className="watch-unavailable" role="status">ยังโหลดประกาศไม่ได้ กรุณาตรวจเว็บไซต์กรมอุตุฯ ไม่สามารถสรุปว่าไม่มีคำเตือนได้</p>}
    {data?.warnings.map((warning, index) => <article className="warning-bulletin" key={`${warning.issue}-${index}`}>
      <h4>{warning.title}</h4>
      <p className="watch-meta">เผยแพร่ {thaiTime(warning.announcedAt)} (เวลาไทย)</p>
      <p className="warning-summary">{warning.description.slice(0, 260)}{warning.description.length > 260 ? "…" : ""}</p>
      <details><summary>อ่านประกาศฉบับเต็ม</summary><p className="warning-body">{warning.description}</p></details>
    </article>)}
    {data && !data.warnings.length && <p className="watch-unavailable">แหล่งข้อมูลไม่ส่งประกาศในรอบนี้ กรุณาตรวจเว็บไซต์ทางการเพิ่มเติม</p>}
    {data && <p className="watch-meta">ดึงข้อมูลเมื่อ {thaiTime(data.fetchedAt)} (เวลาไทย)</p>}
    <p className="watch-note">ตรวจพื้นที่และช่วงเวลาจากเนื้อหาประกาศ ข้อมูลนี้ไม่ได้กรองตามเมืองที่เลือก</p>
    <SourceLink href={WARNING_URL}>ตรวจประกาศล่าสุดจากกรมอุตุฯ</SourceLink>
    <SourceLink href="https://www.disaster.go.th/">ติดตามสถานการณ์จาก ปภ.</SourceLink>
  </section>;
}

export default function FloodWatch({ coordinates }) {
  const [view, setView] = useState("overview");
  const [monitor, setMonitor] = useState(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [district, setDistrict] = useState("");
  const [filter, setFilter] = useState("flooded");
  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    setMonitor(null);
    setImageError(false);
    axios.get("/api/bangkok-monitor").then((response) => {
      if (active) setMonitor(response.data);
    }).catch(() => { if (active) setError(true); });
    const timer = setInterval(() => setRefresh((value) => value + 1), 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]);

  const stations = monitor?.roads?.stations || [];
  const districts = [...new Set(stations.map((station) => station.district))].sort((a, b) => a.localeCompare(b, "th"));
  const selected = stations.filter((station) => !district || station.district === district);
  const affected = selected.filter((station) => station.flooded);
  const unavailable = selected.filter((station) => !station.available);
  const shown = (filter === "flooded" ? affected : filter === "unavailable" ? unavailable : selected).slice().sort((a, b) => Number(b.flooded) - Number(a.flooded) || (b.depthCm ?? -1) - (a.depthCm ?? -1));
  const roadsUnavailable = error || monitor?.roads?.error;
  const radar = monitor?.radar;
  return <section id="flood-watch" className="flood-watch" aria-labelledby="watch-title" lang="th">
    <div className="watch-heading"><div><p className="eyebrow">RAIN & FLOOD WATCH</p><h2 id="watch-title">รู้ทันฝน ก่อนออกเดินทาง</h2><p>พยากรณ์ตามเมืองที่เลือก · ข้อมูลถนนและเรดาร์เฉพาะกรุงเทพฯ และบริเวณโดยรอบ</p></div><span className="watch-scope"><Icon name="pin" />{coordinates?.name || "Bangkok"}</span></div>
    <nav className="watch-view-tabs" aria-label="เลือกข้อมูลฝนและน้ำ"><button aria-pressed={view === "overview"} onClick={() => setView("overview")}>ภาพรวมฝนและประกาศ</button><button aria-pressed={view === "bangkok"} onClick={() => setView("bangkok")}>ถนนและเรดาร์ · กทม.</button><button aria-pressed={view === "water"} onClick={() => setView("water")}>สถานการณ์น้ำ</button></nav>
    <p className="interpret-legend"><span className="value-normal">● ปกติ / ฝนไม่ถึงเกณฑ์หนัก</span><span className="value-watch">● เฝ้าระวัง</span><span className="value-danger">● ฝนหนักมาก / น้ำท่วม / ล้นตลิ่ง</span><span className="value-unknown">● ไม่ทราบสถานะ</span></p>
    <p className="watch-section-scope">{view === "overview" ? `พยากรณ์ฝนสำหรับ ${coordinates?.name || "Bangkok"} · ประกาศกรมอุตุฯ ครอบคลุมประเทศไทย` : view === "water" ? `ฝนและระดับน้ำใกล้ ${coordinates?.name || "Bangkok"} · เฉพาะสถานีในประเทศไทย` : "ข้อมูลตรวจวัดเฉพาะกรุงเทพฯ และเรดาร์บริเวณโดยรอบ ไม่เปลี่ยนตามเมืองที่ค้นหา"}</p>
    <div hidden={view !== "overview"}><div className="watch-top-grid"><RainForecast coordinates={coordinates} /><OfficialWarnings /></div></div>
    <div hidden={view !== "water"}><div className="watch-top-grid"><ObservedRain coordinates={coordinates} /><WaterLevels coordinates={coordinates} /></div></div>
    <div hidden={view !== "bangkok"}><div className="watch-bottom-grid"><section className="roads-panel watch-card" aria-labelledby="roads-title"><div className="watch-card-heading"><div><span className="data-tag observation-tag">ตรวจวัดจากสถานี · กรุงเทพฯ</span><h3 id="roads-title">ระดับน้ำบนถนน</h3></div><button className="watch-refresh" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh Bangkok flood data"><Icon name="refresh" /></button></div>
      {!monitor && !error && <p role="status" className="watch-placeholder"><span className="spinner" />กำลังโหลดสถานีตรวจวัด…</p>}
      {roadsUnavailable && <p className="watch-unavailable" role="status">ยังโหลดข้อมูลถนนไม่ได้ ไม่สามารถสรุปสถานการณ์จากข้อมูลที่ขาดได้ กรุณาตรวจแหล่งทางการ</p>}
      {monitor?.roads?.stations && <>
        <div className="road-summary"><span><strong>{affected.length}</strong> จุดรายงานน้ำท่วม</span><span><strong>{unavailable.length}</strong> จุดข้อมูลเก่า / ขัดข้อง</span><span>จาก {selected.length} สถานี</span></div>
        <details className="station-details"><summary>ดูจุดตรวจวัดและเลือกเขต</summary>
        <div className="road-filters"><label htmlFor="road-district">เขต<select id="road-district" value={district} onChange={(event) => setDistrict(event.target.value)}><option value="">ทุกเขตในกรุงเทพฯ</option>{districts.map((name) => <option key={name}>{name}</option>)}</select></label><label htmlFor="road-status">ข้อมูลที่แสดง<select id="road-status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="flooded">รายงานน้ำท่วม</option><option value="all">ทุกสถานี</option><option value="unavailable">ข้อมูลเก่า / ขัดข้อง</option></select></label></div>
        <div className="road-table-scroll"><table className="road-table"><caption className="sr-only">ข้อมูลสถานีวัดน้ำบนถนนกรุงเทพฯ</caption><thead><tr><th>ถนน / จุดวัด</th><th>ระดับน้ำ</th><th>สถานะ / เวลาไทย</th></tr></thead><tbody>{shown.slice(0, 30).map((station) => <tr key={station.code}><td><a href={station.url} target="_blank" rel="noreferrer">{station.road}</a><small>{station.station} · {station.district}</small></td><td className={`value-${roadTone(station)}`}>{station.available ? `${station.depthCm} ซม.` : "—"}</td><td><span className={`road-status tone-${roadTone(station)}`}>{!station.available ? station.stale ? "ข้อมูลเก่า / ไม่ทราบสถานะ" : "สถานีขัดข้อง / ไม่มีข้อมูล" : station.status}</span><small>{thaiTime(station.observedAt)}</small></td></tr>)}</tbody></table></div>
        {!shown.length && <p className="watch-unavailable">ไม่พบรายการในตัวกรองนี้ ไม่ใช่การยืนยันว่าถนนทุกสายไม่มีน้ำท่วม</p>}
        {shown.length > 30 && <p className="watch-meta">แสดง 30 จาก {shown.length} จุด · เลือกเขตเพื่อดูจุดอื่น หรือเปิดแผนที่ทางการ</p>}
        </details>
        <p className="watch-meta">ดึงข้อมูลเมื่อ {thaiTime(monitor.roads.fetchedAt)} · ข้อมูลเกิน 60 นาทีถือว่าไม่ล่าสุด</p>
      </>}
      <p className="watch-note">ครอบคลุมเฉพาะจุดตรวจวัด ไม่ได้บอกว่าถนนขับผ่านได้ สถานะ “ปกติ” เป็นสถานะ ณ จุดวัดตามแหล่งข้อมูล</p><SourceLink href={ROAD_URL}>เปิดแผนที่น้ำท่วมถนน · สำนักการระบายน้ำ กทม.</SourceLink>
    </section>
    <section className="radar-panel watch-card" aria-labelledby="radar-title"><span className="data-tag observation-tag">ภาพเรดาร์ · กรุงเทพฯ และโดยรอบ</span><h3 id="radar-title">กลุ่มฝนจากเรดาร์หนองจอก</h3>
      {!monitor && !error && <p className="watch-placeholder" role="status">กำลังโหลดเรดาร์…</p>}
      {radar?.imageUrl && !imageError && <a href={radar.imageSource || RADAR_URL} target="_blank" rel="noreferrer" className="radar-image-link"><Image unoptimized src={radar.imageUrl} width={965} height={800} layout="responsive" alt="ภาพเรดาร์ฝนเคลื่อนไหวหนองจอกจากเว็บไซต์กรมอุตุนิยมวิทยา ตรวจวันเวลาในภาพก่อนใช้งาน" onError={() => setImageError(true)} /></a>}
      {(error || radar?.error || imageError) && <p className="watch-unavailable">ยังแสดงภาพเรดาร์ไม่ได้ กรุณาเปิดหน้าสถานีโดยตรง</p>}
      {radar?.imageSource && <SourceLink href={radar.imageSource}>ภาพเรดาร์หนองจอก · เว็บไซต์กรมอุตุฯ</SourceLink>}
      {radar?.bulletin && <p className="radar-bulletin">รายงานฝนจาก กทม. · {radar.bulletin}</p>}
      {radar?.fetchedAt && <p className="watch-meta">ตรวจแหล่งข้อมูลเมื่อ {thaiTime(radar.fetchedAt)} · เวลาในภาพอาจต่างจากเวลาที่ดึงข้อมูล</p>}
      <p className="watch-note">ดูวันเวลาและคำอธิบายสีในภาพ ภาพเรดาร์แสดงกลุ่มฝน ไม่ใช่แผนที่น้ำท่วม</p><SourceLink href={RADAR_URL}>เปิดเรดาร์พร้อมคำอธิบายสี · กทม.</SourceLink>
    </section></div></div>
  </section>;
}
