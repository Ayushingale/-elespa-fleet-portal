import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import db from './db.js';

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// WebSocket endpoint: ws://localhost:4000/ws/telemetry?vehicleId=EV-1001
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

// Keep track of connected clients per vehicle ID
const vehicleClients = new Map();

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const vehicleId = url.searchParams.get('vehicleId');

  if (!vehicleId || !db.prepare('SELECT 1 FROM vehicles WHERE id = ?').get(vehicleId)) {
    socket.close(1008, 'Unknown vehicleId');
    return;
  }

  console.log(`[ws] client subscribed to ${vehicleId}`);
  
  if (!vehicleClients.has(vehicleId)) {
    vehicleClients.set(vehicleId, new Set());
  }
  vehicleClients.get(vehicleId).add(socket);

  socket.on('close', () => {
    const clients = vehicleClients.get(vehicleId);
    if (clients) {
      clients.delete(socket);
      if (clients.size === 0) vehicleClients.delete(vehicleId);
    }
    console.log(`[ws] client for ${vehicleId} disconnected`);
  });
});

// Global simulation loop: update all online vehicles every 3 seconds
setInterval(() => {
  const onlineVehicles = db.prepare(`SELECT * FROM vehicles WHERE status = 'online'`).all();
  const timestamp = new Date().toISOString();
  
  const updateStmt = db.prepare('UPDATE vehicles SET speed_kmph = ?, battery_pct = ?, motor_temp_c = ? WHERE id = ?');
  const insertTelemetry = db.prepare(
    'INSERT INTO telemetry_history (vehicle_id, timestamp, speed_kmph, battery_pct, motor_temp_c, controller_status) VALUES (?, ?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    for (const v of onlineVehicles) {
      const speed = Math.max(0, Math.min(120, v.speed_kmph + (Math.random() * 10 - 5)));
      const battery = Math.max(0, Math.min(100, v.battery_pct - Math.random() * 0.3));
      const motorTemp = Math.max(25, Math.min(95, v.motor_temp_c + (Math.random() * 4 - 2)));

      updateStmt.run(speed, battery, motorTemp, v.id);
      
      const speedInt = Math.round(speed);
      const batteryInt = Math.round(battery);
      const tempInt = Math.round(motorTemp);
      
      insertTelemetry.run(v.id, timestamp, speedInt, batteryInt, tempInt, v.controller_status);

      // Broadcast to any clients listening to this vehicle
      const clients = vehicleClients.get(v.id);
      if (clients && clients.size > 0) {
        const packet = JSON.stringify({
          vehicleId: v.id,
          timestamp,
          speedKmph: speedInt,
          batteryPct: batteryInt,
          motorTempC: tempInt,
          controllerStatus: v.controller_status,
        });
        for (const client of clients) {
          if (client.readyState === client.OPEN) {
            client.send(packet);
          }
        }
      }
    }
  })();
}, 3000);

server.listen(PORT, () => {
  console.log(`Fleet Portal demo backend running on http://localhost:${PORT}`);
  console.log(`WebSocket telemetry on ws://localhost:${PORT}/ws/telemetry?vehicleId=EV-1001`);
});
