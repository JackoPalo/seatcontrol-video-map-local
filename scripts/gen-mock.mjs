// Deterministic mock-data generator for the SeatControl video map showcase.
// Run:  node scripts/gen-mock.mjs > src/data/videos.json
// The output is committed, so this only needs re-running when you want new samples.

// --- tiny seeded PRNG (mulberry32) so output is stable across runs ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260827);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const jitter = (v, d) => v + between(-d, d);

// --- fleet operating regions (Argentina) ---
const regions = [
  { city: "Buenos Aires", lat: -34.6037, lng: -58.3816, spread: 0.09 },
  { city: "La Plata", lat: -34.9215, lng: -57.9545, spread: 0.05 },
  { city: "Rosario", lat: -32.9442, lng: -60.6505, spread: 0.06 },
  { city: "Córdoba", lat: -31.4201, lng: -64.1888, spread: 0.07 },
  { city: "Mar del Plata", lat: -38.0055, lng: -57.5426, spread: 0.05 },
  { city: "Mendoza", lat: -32.8895, lng: -68.8458, spread: 0.05 },
];

// --- fleet devices (the id each on-vehicle Kotlin app reports over WebSocket,
// plus the nickname the operator gives the vehicle). Each device has a home
// region so filtering by device shows a real cluster; ~1 in 5 clips is a "trip"
// recorded somewhere else.
const names = [
  "Nacho", "El Rojo", "La Negra", "Pumita", "Rulo",
  "Colo", "Tano", "Zeta", "Carmona",
];
const fleet = names.map((name, i) => ({
  deviceId: `SC-${101 + i}`,
  name,
  home: regions[i % regions.length],
}));

const streets = [
  "Av. Corrientes", "Av. Rivadavia", "Calle 7", "Bv. Oroño", "Av. Colón",
  "Ruta Nacional 9", "Av. Libertador", "Calle San Martín", "Av. Pellegrini",
  "Camino Centenario", "Av. Costanera", "Ruta Provincial 2", "Av. Juan B. Justo",
];

// sample media (Google's public test-video bucket)
const bucket = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";
const clips = [
  "BigBuckBunny", "ElephantsDream", "ForBiggerBlazes", "ForBiggerEscapes",
  "ForBiggerFun", "ForBiggerJoyrides", "ForBiggerMeltdowns", "Sintel",
  "SubaruOutbackOnStreetAndDirt", "TearsOfSteel", "VolkswagenGTIReview",
  "WeAreGoingOnBunny",
];

const pad = (n) => String(n).padStart(2, "0");

// --- generate ~8 days of activity ---
const days = [];
const start = new Date("2026-08-18T00:00:00-03:00");
for (let d = 0; d < 8; d++) {
  const day = new Date(start);
  day.setDate(day.getDate() + d);
  days.push(day);
}

const videos = [];
let id = 1000;
for (const day of days) {
  const count = 4 + Math.floor(rand() * 7); // 4..10 videos that day
  for (let i = 0; i < count; i++) {
    const device = pick(fleet);
    const region = rand() < 0.2 ? pick(regions) : device.home;
    const clip = pick(clips);
    const hour = 6 + Math.floor(rand() * 13); // daylight-ish: 06..18
    const recordedAt = new Date(day);
    recordedAt.setHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
    const y = recordedAt.getFullYear();
    const mo = pad(recordedAt.getMonth() + 1);
    const da = pad(recordedAt.getDate());
    const iso = `${y}-${mo}-${da}T${pad(recordedAt.getHours())}:${pad(
      recordedAt.getMinutes()
    )}:${pad(recordedAt.getSeconds())}-03:00`;

    videos.push({
      id: id++,
      deviceId: device.deviceId,
      deviceName: device.name,
      city: region.city,
      address: `${pick(streets)} ${100 + Math.floor(rand() * 4900)}`,
      lat: Number(jitter(region.lat, region.spread).toFixed(6)),
      lng: Number(jitter(region.lng, region.spread).toFixed(6)),
      recordedAt: iso,
      date: `${y}-${mo}-${da}`,
      durationSec: 15 + Math.floor(rand() * 46), // 15..60s
      lightLux: 400 + Math.floor(rand() * 9000), // passed the on-device light check
      url: `${bucket}/${clip}.mp4`,
      thumbnail: `${bucket}/images/${clip}.jpg`,
    });
  }
}

videos.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
process.stdout.write(JSON.stringify(videos, null, 2) + "\n");
