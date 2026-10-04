const http = require("node:http");
const { timingSafeEqual } = require("node:crypto");
const axios = require("axios");

const SOURCE = "https://weather.bangkok.go.th/floodbangkok/PageMap/GetData?id=0";

function createCollector({ token, fetchSource = () => axios.get(SOURCE, { timeout: 12000, maxContentLength: 5 * 1024 * 1024 }) }) {
  if (typeof token !== "string" || token.length < 32) throw new Error("BANGKOK_COLLECTOR_TOKEN must contain at least 32 characters");
  let cached;
  let pending;
  return http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    if (req.method !== "GET") return reply(405, { error: "Method not allowed" });
    const supplied = Buffer.from(req.headers.authorization || "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(401, { error: "Unauthorized" });
    if (req.url !== "/roads") return reply(404, { error: "Not found" });
    try {
      if (!cached || Date.now() - Date.parse(cached.fetchedAt) >= 300000) {
        if (!pending) pending = (async () => {
          const response = await fetchSource();
          if (!Array.isArray(response.data?.dtTbl) || !response.data.dtTbl.length) throw new Error("Invalid source format");
          cached = { dtTbl: response.data.dtTbl, fetchedAt: new Date().toISOString() };
        })().finally(() => { pending = null; });
        await pending;
      }
      return reply(200, cached);
    } catch (error) {
      // Do not pass old snapshots, source bodies, or request credentials to callers.
      return reply(502, { error: "Bangkok source unavailable", upstreamStatus: error.response?.status || null });
    }
  });
}

module.exports = { createCollector };
if (require.main === module) {
  const server = createCollector({ token: process.env.BANGKOK_COLLECTOR_TOKEN });
  server.listen(Number(process.env.PORT || 8080), process.env.HOST || "127.0.0.1", () => console.log("Bangkok collector listening"));
}
