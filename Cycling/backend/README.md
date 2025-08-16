# Pedal Map Backend

A minimal Node.js + Express + MongoDB API to store and retrieve cycling hazards.

## Endpoints
- GET /health → { ok: true }
- GET /getHazards?lat=..&lon=..&radius=3000 → list hazards near point (radius in meters)
- POST /addHazards { lat, lon, type, description?, userId? } → create a hazard

## Dev
1. Copy .env.example to .env and set MONGO_URI
2. Install deps and run:
   npm install
   npm run dev

Deploy anywhere (Render, Railway, Fly.io, etc.). Set env vars accordingly.
