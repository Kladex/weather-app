# Bangkok road collector

Use this only on a server whose outbound IP can reach the original Bangkok source.
Changing host does not guarantee access: verify it before pointing Vercel at it.

Requires Node 20+ and `npm ci` in the repository root. Start with:

```sh
BANGKOK_COLLECTOR_TOKEN=<random-secret-at-least-32-characters> node services/bangkok-collector.cjs
```

The service binds to localhost:8080 by default. Put it behind an HTTPS reverse proxy.
Set `HOST=0.0.0.0` only when deployment networking requires it. Keep the token in the
hosting platform's secret store; do not commit it or put it in a browser variable.

Before switching production, call `GET https://<collector-host>/roads` with
`Authorization: Bearer <token>`. Verify HTTP 200, a nonempty `dtTbl`, and current
station observation timestamps. HTTP 200 alone is not proof of current readings.

Set Vercel server environment variables and redeploy:

- `BANGKOK_COLLECTOR_URL=https://<collector-host>/roads`
- `BANGKOK_COLLECTOR_TOKEN=<same-secret>`

Vercel tries the original source first and uses the collector only after failure.
The service fetches on demand, coalesces concurrent requests, and caches successful
responses for at most five minutes. It preserves observation timestamps and never
serves an expired snapshot when the source fails. The web app still applies its
60-minute observation freshness rule; stale readings never count as current floods.

No collector is provisioned or connected by this code alone. Unset the two Vercel
variables and redeploy to disable it.
