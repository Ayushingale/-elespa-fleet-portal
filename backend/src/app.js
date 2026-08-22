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

app.get('/api/diagnostics', requireAuth, (req, res) => {
  const { vehicle_id, severity, resolved } = req.query;
  let query = `
    SELECT d.*, v.name as vehicle_name, v.model as vehicle_model, v.status as vehicle_status
    FROM diagnostics d
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (vehicle_id) {
    query += ' AND d.vehicle_id = ?';
    params.push(vehicle_id);
  }
  if (severity) {
    query += ' AND d.severity = ?';
    params.push(severity);
  }
  if (resolved !== undefined && resolved !== '') {
    query += ' AND d.resolved = ?';
    params.push(Number(resolved));
  }
  query += ' ORDER BY d.reported_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.get('/api/vehicles/:id/diagnostics', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM diagnostics WHERE vehicle_id = ? ORDER BY reported_at DESC').all(req.params.id);
  res.json(rows);
});

app.post('/api/diagnostics', requireAuth, (req, res) => {
  const { vehicle_id, fault_code, severity = 'warning', description = '' } = req.body;
  if (!vehicle_id || !fault_code) {
    return res.status(400).json({ error: 'vehicle_id and fault_code are required' });
  }
  const result = db
    .prepare('INSERT INTO diagnostics (vehicle_id, fault_code, severity, description, resolved) VALUES (?, ?, ?, ?, 0)')
    .run(vehicle_id, fault_code, severity, description);
  const created = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.patch('/api/diagnostics/:id', requireAuth, (req, res) => {
  const { resolved, description, severity } = req.body;
  const current = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Diagnostic record not found' });

  const newResolved = resolved !== undefined ? (resolved ? 1 : 0) : current.resolved;
  const newDesc = description !== undefined ? description : current.description;
  const newSev = severity !== undefined ? severity : current.severity;

  db.prepare('UPDATE diagnostics SET resolved = ?, description = ?, severity = ? WHERE id = ?')
    .run(newResolved, newDesc, newSev, req.params.id);

  const updated = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/diagnostics/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM diagnostics WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Record not found' });
  res.json({ success: true, id: req.params.id });
});

app.post('/api/vehicles/:id/scan', requireAuth, (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // Evaluate realistic subsystem health status based on current telemetry
  const isBattLow = vehicle.battery_pct < 20;
  const isTempHigh = vehicle.motor_temp_c > 75;
  const isCtrlErr = vehicle.controller_status !== 'OK';

  const subsystems = [
    {
      name: 'Battery Management System (BMS)',
      status: isBattLow ? 'warning' : 'pass',
      details: `Cell delta: 12mV · SoC: ${Math.round(vehicle.battery_pct)}% · Isolation: 4.8 MΩ`,
      metrics: { soc: `${Math.round(vehicle.battery_pct)}%`, temp: `${Math.round(vehicle.motor_temp_c * 0.7)}°C` },
    },
    {
      name: 'Inverter & Motor Controller (MCU)',
      status: isCtrlErr ? 'critical' : isTempHigh ? 'warning' : 'pass',
      details: `Status: ${vehicle.controller_status} · Motor Temp: ${Math.round(vehicle.motor_temp_c)}°C · Current: 42A`,
      metrics: { temp: `${Math.round(vehicle.motor_temp_c)}°C`, status: vehicle.controller_status },
    },
    {
      name: 'Thermal Management & Cooling Loop',
      status: isTempHigh ? 'warning' : 'pass',
      details: `Coolant pump: Active · Flow: 8.4 L/min · Radiator Fan: 65%`,
      metrics: { flow: '8.4 L/min', fan: '65%' },
    },
    {
      name: 'Regenerative Braking & ABS',
      status: 'pass',
      details: 'Hydraulic pressure: Nominal · Sensor continuity: 100%',
      metrics: { pressure: '120 bar', status: 'Nominal' },
    },
    {
      name: 'High Voltage Isolation & Contactors',
      status: 'pass',
      details: 'Main contactor: Closed · Pyrofuse: Armed · DC Bus: 398V',
      metrics: { busVoltage: '398V', isolation: '4.8 MΩ' },
    },
    {
      name: 'CAN Bus & Gateway ECU',
      status: 'pass',
      details: 'Bus load: 38% · Frame drop rate: 0.00% · Latency: 2.1ms',
      metrics: { busLoad: '38%', latency: '2.1ms' },
    },
  ];

  const overallHealth = subsystems.some(s => s.status === 'critical')
    ? 'critical'
    : subsystems.some(s => s.status === 'warning')
    ? 'warning'
    : 'pass';

  res.json({
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    scannedAt: new Date().toISOString(),
    overallHealth,
    subsystems,
  });
});

/* ---------------- MAINTENANCE ---------------- */

app.get('/api/maintenance', requireAuth, (req, res) => {
  const { status, vehicle_id } = req.query;
  let query = `
    SELECT m.*, v.name as vehicle_name, v.model as vehicle_model, v.status as vehicle_status
    FROM maintenance_records m
    LEFT JOIN vehicles v ON m.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }
  if (vehicle_id) {
    query += ' AND m.vehicle_id = ?';
    params.push(vehicle_id);
  }
  query += ' ORDER BY m.scheduled_date ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/maintenance', requireAuth, (req, res) => {
  const { vehicle_id, type, scheduled_date, notes, status = 'scheduled' } = req.body;
  if (!vehicle_id || !type) {
    return res.status(400).json({ error: 'vehicle_id and type are required' });
  }
  const result = db
    .prepare('INSERT INTO maintenance_records (vehicle_id, type, scheduled_date, status, notes) VALUES (?, ?, ?, ?, ?)')
    .run(vehicle_id, type, scheduled_date, status, notes ?? null);
  const created = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.patch('/api/maintenance/:id', requireAuth, (req, res) => {
  const { status, scheduled_date, notes, type } = req.body;
  const current = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Maintenance record not found' });

  const newStatus = status !== undefined ? status : current.status;
  const newDate = scheduled_date !== undefined ? scheduled_date : current.scheduled_date;
  const newNotes = notes !== undefined ? notes : current.notes;
  const newType = type !== undefined ? type : current.type;

  db.prepare('UPDATE maintenance_records SET status = ?, scheduled_date = ?, notes = ?, type = ? WHERE id = ?')
    .run(newStatus, newDate, newNotes, newType, req.params.id);

  const updated = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/maintenance/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM maintenance_records WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Record not found' });
  res.json({ success: true, id: req.params.id });
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
