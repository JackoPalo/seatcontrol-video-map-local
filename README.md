# SeatControl · Video Map (showcase)

A small demo site for showing a client what the **video capture** feature of the
SeatControl fleet devices can do. Each on-vehicle device records a short clip
when the vehicle stays parked long enough with sufficient ambient light, then
uploads it together with its GPS position. This site plots those uploads on a
map and lets you browse them **day by day**.

> This is a **Future Feature preview**. The data here is mock data
> (`backend/data/videos.json`) — no real backend or database is wired in yet.

## Stack

| Part     | Tech                                           |
| -------- | --------------------------------------------- |
| Backend  | Go (stdlib `net/http`), JSON embedded at build |
| Frontend | Vite + React + TypeScript, Tailwind + shadcn-style UI, Leaflet / OpenStreetMap |
| Runtime  | Docker Compose (nginx serves the SPA and proxies `/api`) |

## Run with Docker

```bash
docker compose up --build
```

Then open <http://localhost:8080>. The API is also exposed on
<http://localhost:8081/api/summary> for debugging.

## Run locally (without Docker)

```bash
# terminal 1 — API on :8080
cd backend
go run .

# terminal 2 — dev server on :5173, proxies /api to :8080
cd frontend
npm install
npm run dev
```

## API

| Endpoint             | Description                                             |
| -------------------- | ----------------------------------------------------- |
| `GET /api/summary`   | `[{ date, count }]` — one entry per active day, oldest first |
| `GET /api/videos`    | All videos. Filter with `?date=YYYY-MM-DD`, or `?from=&to=` |
| `GET /api/health`    | Liveness + loaded video count                          |

### Video shape

```jsonc
{
  "id": 1000,
  "deviceId": "SC-118",
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
cd backend/data
node gen-mock.mjs > videos.json
```

The generator is seeded, so re-running it produces the same set unless you
change the seed or parameters.

## Wiring a real backend later

Replace the `videos.json` embed in `backend/main.go` with a real data source
(the SeatControl devices API already reports `id / lat / lng / time` per
`videoUploaded` event over WebSocket). The frontend only depends on the two
endpoints above, so it needs no changes.
