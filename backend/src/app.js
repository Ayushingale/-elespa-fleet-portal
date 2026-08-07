import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-not-for-production';
const app = express();

app.use(cors());
app.use(express.json());

function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ---------------- AUTH ---------------- */

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: signToken(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.sub, name: req.user.name, role: req.user.role });
});

/* ---------------- VEHICLES ---------------- */

app.get('/api/vehicles', requireAuth, (req, res) => {
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  res.json(vehicles);
});

app.get('/api/vehicles/:id', requireAuth, (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
});

app.post('/api/vehicles', requireAuth, (req, res) => {
  const { id, name, model } = req.body;
  db.prepare('INSERT INTO vehicles (id, name, model) VALUES (?, ?, ?)').run(id, name, model);
  res.status(201).json({ id, name, model, status: 'offline' });
});

/* ---------------- TELEMETRY (historical) ---------------- */

app.get('/api/vehicles/:id/telemetry', requireAuth, (req, res) => {
  const { from, to } = req.query;
  let query = 'SELECT * FROM telemetry_history WHERE vehicle_id = ?';
  const params = [req.params.id];
  if (from) { query += ' AND timestamp >= ?'; params.push(from); }
  if (to) { query += ' AND timestamp <= ?'; params.push(to); }
  query += ' ORDER BY timestamp DESC LIMIT 200';
  res.json(db.prepare(query).all(...params));
});

/* ---------------- DIAGNOSTICS ---------------- */

app.get('/api/vehicles/:id/diagnostics', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM diagnostics WHERE vehicle_id = ? ORDER BY reported_at DESC').all(req.params.id);
  res.json(rows);
});

/* ---------------- MAINTENANCE ---------------- */

app.get('/api/maintenance', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM maintenance_records ORDER BY scheduled_date').all());
});

app.post('/api/maintenance', requireAuth, (req, res) => {
  const { vehicle_id, type, scheduled_date, notes } = req.body;
  const result = db
    .prepare('INSERT INTO maintenance_records (vehicle_id, type, scheduled_date, notes) VALUES (?, ?, ?, ?)')
    .run(vehicle_id, type, scheduled_date, notes ?? null);
  res.status(201).json({ id: result.lastInsertRowid, vehicle_id, type, scheduled_date, status: 'scheduled' });
});

/* ---------------- ADMIN ---------------- */

app.get('/api/admin/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  res.json(db.prepare('SELECT id, username, name, role FROM users').all());
});

app.post('/api/admin/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  const { username, password, name, role } = req.body;
  const result = db
    .prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    .run(username, password, name, role);
  res.status(201).json({ id: result.lastInsertRowid, username, name, role });
});

app.get('/health', (req, res) => res.json({ ok: true }));

export default app;
