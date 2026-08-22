import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/Layout';
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import VehicleList from '../features/vehicles/pages/VehicleList';
import Monitoring from '../features/monitoring/pages/Monitoring';
import Diagnostics from '../features/diagnostics/pages/Diagnostics';
import Maintenance from '../features/maintenance/pages/Maintenance';
import Admin from '../features/admin/pages/Admin';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<VehicleList />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/monitoring/:vehicleId" element={<Monitoring />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/maintenance" element={<Maintenance />} />

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
