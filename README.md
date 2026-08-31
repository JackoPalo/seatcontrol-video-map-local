# SeatControl · Video Map (showcase)

A small demo site for showing a client what the **video capture** feature of the
SeatControl fleet devices can do. Each on-vehicle device records a short clip
when the vehicle stays parked long enough with sufficient ambient light, then
uploads it together with its GPS position. This site plots those uploads on a
map and lets you browse them **day by day**, with a device filter.

> This is a **Future Feature preview**. The data here is mock data
> (`src/data/videos.json`) — no real backend or database is wired in yet.

## Stack

| Part     | Tech                                                              |
| -------- | ------------------------------------------------------------------ |
| Framework | Next.js (App Router) + TypeScript                                 |
| API      | Next.js Route Handlers under `src/app/api/*`, serving the mock JSON |
| UI       | Tailwind + shadcn-style UI, Leaflet / OpenStreetMap via react-leaflet |
| Deploy   | Vercel                                                             |

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploy to Vercel

This is a standard Next.js app, so it deploys with zero config:

```bash
npx vercel
```

or connect the repo in the Vercel dashboard and it will detect Next.js
automatically (`npm run build` / `.next` output).

## API

| Endpoint             | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `GET /api/summary`   | `[{ date, count }]` — one entry per active day, oldest first |
| `GET /api/devices`   | `[{ deviceId, name, count }]` — one entry per device that has uploaded |
| `GET /api/videos`    | All videos. Filter with `?date=YYYY-MM-DD` (or `?from=&to=`) and/or `?device=<deviceId>` |
| `GET /api/health`    | Liveness + loaded video count                          |

### Video shape

```jsonc
{
  "id": 1000,
  "deviceId": "SC-118",
  "deviceName": "Nacho",
  "city": "Rosario",
  "address": "Bv. Oroño 2450",
  "lat": -32.9442,
  "lng": -60.6505,
  "recordedAt": "2026-08-19T10:22:41-03:00",
  "date": "2026-08-19",
  "durationSec": 32,
  "lightLux": 5400,
  "url": "https://.../clip.mp4",
  "thumbnail": "https://.../clip.jpg"
}
```

## Regenerating mock data

```bash
node scripts/gen-mock.mjs > src/data/videos.json
```

The generator is seeded, so re-running it produces the same set unless you
change the seed or parameters.

## Wiring a real backend later

Replace the `src/data/videos.json` import in `src/lib/videos.ts` with a real
data source (the SeatControl devices API already reports `id / lat / lng /
time` per `videoUploaded` event over WebSocket, and each on-vehicle device is
identified by its `deviceId`). The frontend only depends on the `/api/*`
endpoints above, so it needs no changes as long as they keep returning the
same shapes.
