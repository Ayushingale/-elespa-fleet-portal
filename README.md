# Elespa HEV — Fleet Management & Vehicle Diagnostics Portal (CSE-IOT-06)

Team repo for the frontend, plus a small demo backend used only for local testing.

```
elespa-fleet-portal/
├─ frontend/    ← the actual deliverable (React app, CSE-IOT-06)
└─ backend/     ← demo-only Express + SQLite server, stands in for CSE-IOT-05
                  until the real backend is ready. Not graded, not the real thing.
```

## Running everything locally

```bash
# terminal 1 — backend
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev        # http://localhost:4000

# terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev         # http://localhost:5173
```

Log in with `admin` / `admin123` or `operator` / `operator123`.

## Pushing this to GitHub

```bash
git init
git add .
git commit -m "Initial scaffold: frontend structure + demo backend"
git branch -M main
git remote add origin https://github.com/<your-username>/elespa-fleet-portal.git
git push -u origin main
```

Then on GitHub: **Settings → Collaborators** to add your 3 teammates, and set up
a **Projects** board with columns matching the roadmap phases (P0–P6) from the deck.

## Team
| Person | Owns |
|---|---|
| P1 | Auth + Admin |
| P2 | Dashboard + Vehicle Management |
| P3 | Monitoring + API Integration |
| P4 | Diagnostics + Maintenance |
