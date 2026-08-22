# Fleet Portal — Demo Backend

⚠️ **This is NOT CSE-IOT-05.** This is a small Express + SQLite server built purely
so the CSE-IOT-06 frontend has something real to test against, per our team guide.
The real backend, database design, and business logic belong entirely to the
CSE-IOT-05 team. This demo will be deleted or ignored once we integrate with them.

## Stack
- Express — REST API
- better-sqlite3 — a single-file SQLite database (`data/fleet.db`)
- ws — WebSocket server for fake live telemetry
- jsonwebtoken — issues demo JWTs on login

## Setup
```bash
npm install
cp .env.example .env
npm run seed   # creates + populates data/fleet.db
npm run dev    # starts on http://localhost:4000
```

## Demo login
| username | password    | role     |
|----------|-------------|----------|
| admin    | admin123    | admin    |
| operator | operator123 | operator |

## Endpoints
Matches the contract the frontend team already agreed on:

| Purpose | Endpoint |
|---|---|
| Login | `POST /api/auth/login` |
| Current user | `GET /api/auth/me` |
| List vehicles | `GET /api/vehicles` |
| Vehicle detail | `GET /api/vehicles/:id` |
| Register vehicle | `POST /api/vehicles` |
| Historical telemetry | `GET /api/vehicles/:id/telemetry?from=&to=` |
| Live telemetry | `WS /ws/telemetry?vehicleId=EV-1001` |
| Diagnostics | `GET /api/vehicles/:id/diagnostics` |
| Maintenance | `GET/POST /api/maintenance` |
| Admin users | `GET/POST /api/admin/users` |

All routes except `/api/auth/login` and `/health` require `Authorization: Bearer <token>`.

Live telemetry updates every 2 seconds per subscribed vehicle, random-walked from
its last known values, and is also logged into `telemetry_history` so the
historical-telemetry endpoint has real data to return too.
