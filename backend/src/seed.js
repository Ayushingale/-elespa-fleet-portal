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
    // Generate more varied data for UI monitoring
    const isOffline = i % 4 === 0;
    const baseBattery = [15, 85, 45, 95, 25, 65, 10, 100][i % 8];
    const baseSpeed = isOffline ? 0 : [0, 45, 80, 25, 110, 60, 15, 30][i % 8];
    const status = isOffline ? 'offline' : 'online';

    insertVehicle.run(
      id,
      `Elespa Transit ${id}`,
      'Elespa HEV-200',
      status,
      baseBattery,
      baseSpeed,
      Math.round(35 + Math.random() * 25),
      'OK'
    );
  });

  const insertDiag = db.prepare(`
    INSERT INTO diagnostics (vehicle_id, fault_code, severity, description, resolved)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertDiag.run('EV-1002', 'P0A80', 'warning', 'Battery pack temperature sensor drift (Module 4 cell imbalance)', 0);
  insertDiag.run('EV-1005', 'P0A0F', 'critical', 'Motor controller high-voltage gate driver communication timeout', 0);
  insertDiag.run('EV-1007', 'P0AA6', 'critical', 'Hybrid battery isolation resistance below threshold (0.8 MΩ)', 0);
  insertDiag.run('EV-1004', 'P0C68', 'warning', 'Generator inverter current transducer out-of-range signal', 0);
  insertDiag.run('EV-1001', 'P0A1F', 'info', 'Scheduled auxiliary 12V DC-DC converter self-test passed', 1);
  insertDiag.run('EV-1003', 'P0A78', 'info', 'Drive motor phase-U inverter performance verified nominal', 1);
  insertDiag.run('EV-1006', 'P0A93', 'warning', 'Inverter cooling system performance degraded - low coolant flow', 0);

  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (vehicle_id, type, scheduled_date, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMaint.run('EV-1003', 'Battery Cell Balancing & Inspection', '2026-08-28', 'scheduled', 'Routine 6-month high-voltage pack health check');
  insertMaint.run('EV-1005', 'Motor Controller Replacement', '2026-08-14', 'overdue', 'Urgent replacement flagged by critical DTC P0A0F');
  insertMaint.run('EV-1007', 'High Voltage Isolation & Contactor Service', '2026-08-18', 'overdue', 'Isolation degradation repair before return to revenue route');
  insertMaint.run('EV-1002', 'Thermal Fluid & Coolant Flush', '2026-09-02', 'scheduled', 'Preventative cooling loop maintenance and sensor calibration');
  insertMaint.run('EV-1004', 'Inverter Transducer Recalibration', '2026-09-10', 'scheduled', 'Scheduled diagnostic follow-up on generator inverter');
  insertMaint.run('EV-1001', 'Tire Rotation & Regenerative Brake Inspection', '2026-08-01', 'completed', 'Completed 20,000 km routine service with pad wear check');
  insertMaint.run('EV-1008', 'Annual HEV Safety Certification', '2026-07-15', 'completed', 'Full regulatory safety and telemetry compliance certified');

  console.log(`Seeded ${users.length} users, ${vehicleNames.length} vehicles, 7 diagnostics, 7 maintenance records.`);
  console.log('Login with: admin / admin123  or  operator / operator123');
}

seed();
