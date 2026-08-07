# Fleet Portal — Frontend (CSE-IOT-06)

The React frontend. This is the actual deliverable — everything in `../backend`
exists only to make this testable before the real CSE-IOT-05 backend is ready.

## Stack
Vite + React 18 · Tailwind CSS · TanStack Query · React Router v6 · Axios ·
Recharts · custom WebSocket hook (reconnect + backoff) · JWT kept in memory

## Setup
```bash
npm install
cp .env.example .env
npm run dev   # http://localhost:5173
```

Make sure the backend is running first (`../backend`, `npm run dev` on port 4000) —
this app has nothing to talk to otherwise.

## Folder structure
```
src/
├─ api/          one Axios module per backend resource
├─ components/   shared UI (Sidebar, Navbar, Layout)
├─ features/     one folder per module — components/, pages/, hooks/, api.js
├─ hooks/        useWebSocket (reconnect + backoff)
├─ context/      AuthContext, ThemeContext
├─ routes/       AppRoutes, ProtectedRoute (RBAC)
├─ utils/        tokenStore (JWT kept in memory, never localStorage)
└─ mocks/        (unused now that the demo backend exists)
```

## Module ownership
| Person | Modules |
|---|---|
| P1 | Auth + Admin |
| P2 | Dashboard + Vehicle Management |
| P3 | Monitoring + API Integration |
| P4 | Diagnostics + Maintenance |
