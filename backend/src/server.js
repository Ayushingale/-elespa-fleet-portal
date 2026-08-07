import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import db from './db.js';

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// WebSocket endpoint: ws://localhost:4000/ws/telemetry?vehicleId=EV-1001
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const vehicleId = url.searchParams.get('vehicleId');

  if (!vehicleId || !db.prepare('SELECT 1 FROM vehicles WHERE id = ?').get(vehicleId)) {
    socket.close(1008, 'Unknown vehicleId');
    return;
  }

  console.log(`[ws] client subscribed to ${vehicleId}`);

  // Random-walk the vehicle's numbers so the live view has something realistic to render.
  const interval = setInterval(() => {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    if (!vehicle) return;

    const speed = Math.max(0, Math.min(120, vehicle.speed_kmph + (Math.random() * 10 - 5)));
    const battery = Math.max(0, Math.min(100, vehicle.battery_pct - Math.random() * 0.3));
    const motorTemp = Math.max(25, Math.min(95, vehicle.motor_temp_c + (Math.random() * 4 - 2)));

    db.prepare(
      'UPDATE vehicles SET speed_kmph = ?, battery_pct = ?, motor_temp_c = ? WHERE id = ?'
    ).run(speed, battery, motorTemp, vehicleId);

    const packet = {
      vehicleId,
      timestamp: new Date().toISOString(),
      speedKmph: Math.round(speed),
      batteryPct: Math.round(battery),
      motorTempC: Math.round(motorTemp),
      controllerStatus: 'OK',
    };

    db.prepare(
      `INSERT INTO telemetry_history (vehicle_id, timestamp, speed_kmph, battery_pct, motor_temp_c, controller_status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(vehicleId, packet.timestamp, packet.speedKmph, packet.batteryPct, packet.motorTempC, packet.controllerStatus);

    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(packet));
    }
  }, 2000);

  socket.on('close', () => {
    clearInterval(interval);
    console.log(`[ws] client for ${vehicleId} disconnected`);
  });
});

server.listen(PORT, () => {
  console.log(`Fleet Portal demo backend running on http://localhost:${PORT}`);
  console.log(`WebSocket telemetry on ws://localhost:${PORT}/ws/telemetry?vehicleId=EV-1001`);
});
