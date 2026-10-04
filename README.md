This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out my [Deployment Weather App](https://weather-app-kladex.vercel.app/)

## Rain & flood watch

- Rain forecast: Open-Meteo, hourly precipitation (mm) and precipitation probability, with 24/48/72-hour views. Defaults to Bangkok before a weather search; follows the selected city afterwards. Missing values stay missing.
- Bangkok roads: public station data from https://weather.bangkok.go.th/floodbangkok/. Filters by district and station status. Readings older than 60 minutes, faulty stations, missing readings and unexpected future timestamps do not count as current flood observations. Normal is the source's station status, not a road safety assessment.
- Radar: official Nong Chok radar and the source's dated rain bulletin. Direct image embedding can return HTTP 403; the UI provides a link to the official viewer instead. It does not proxy or bypass the source's image restrictions.
- Official warnings: links to TMD and DDPM. The TMD warning API returned an empty response during integration; no automatic warning feed, locality matching or all-clear indicator is claimed.

New endpoints: GET /api/rain-forecast?lat=13.75&lon=100.5 and GET /api/bangkok-monitor. Sources are fetched independently with bounded timeouts, a five-minute server cache and five-minute refresh while the page is open. Partial failures remain visible. Retrieval time is separate from station observation time and radar image time.

Run `npm test`, `npm run lint`, and `npm run build` for validation. The free Open-Meteo endpoint is for non-commercial use; check https://open-meteo.com/en/pricing before commercial deployment. Bangkok's public website endpoints and markup are not a versioned API contract; keep their source links available if formats change.
