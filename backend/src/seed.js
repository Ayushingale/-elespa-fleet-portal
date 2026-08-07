import db from './db.js';

const users = [
  { username: 'admin', password: 'admin123', name: 'Asha Rao', role: 'admin' },
  { username: 'operator', password: 'operator123', name: 'Vikram Shah', role: 'operator' },
];

const vehicleNames = [
  'EV-1001', 'EV-1002', 'EV-1003', 'EV-1004', 'EV-1005',
  'EV-1006', 'EV-1007', 'EV-1008',
];

const faultCodes = ['P0A80', 'P0AA6', 'P0A0F', 'P0C68'];

function seed() {
  db.exec('DELETE FROM maintenance_records; DELETE FROM diagnostics; DELETE FROM telemetry_history; DELETE FROM vehicles; DELETE FROM users;');

  const insertUser = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  users.forEach((u) => insertUser.run(u.username, u.password, u.name, u.role));

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, name, model, status, battery_pct, speed_kmph, motor_temp_c, controller_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  vehicleNames.forEach((id, i) => {
    insertVehicle.run(
      id,
      `Elespa Transit ${id}`,
      'Elespa HEV-200',
      i % 4 === 0 ? 'offline' : 'online',
      Math.round(40 + Math.random() * 55),
      i % 4 === 0 ? 0 : Math.round(20 + Math.random() * 60),
      Math.round(35 + Math.random() * 25),
      'OK'
    );
  });

  const insertDiag = db.prepare(`
    INSERT INTO diagnostics (vehicle_id, fault_code, severity, description, resolved)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertDiag.run('EV-1002', faultCodes[0], 'warning', 'Battery temperature sensor drift detected', 0);
  insertDiag.run('EV-1005', faultCodes[2], 'critical', 'Motor controller communication timeout', 0);
  insertDiag.run('EV-1001', faultCodes[3], 'info', 'Scheduled diagnostic check completed', 1);

  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (vehicle_id, type, scheduled_date, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMaint.run('EV-1003', 'Battery inspection', '2026-08-10', 'scheduled', 'Routine 6-month check');
  insertMaint.run('EV-1005', 'Motor controller replacement', '2026-08-06', 'overdue', 'Flagged by diagnostics');
  insertMaint.run('EV-1001', 'Tire rotation', '2026-07-20', 'completed', null);

  console.log(`Seeded ${users.length} users, ${vehicleNames.length} vehicles, 3 diagnostics, 3 maintenance records.`);
  console.log('Login with: admin / admin123  or  operator / operator123');
}

seed();
