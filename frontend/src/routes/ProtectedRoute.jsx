import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps protected routes. Redirects to /login if not authenticated.
 * Pass `roles` to additionally restrict by role, e.g. <ProtectedRoute roles={['admin']} />
 */
export default function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
