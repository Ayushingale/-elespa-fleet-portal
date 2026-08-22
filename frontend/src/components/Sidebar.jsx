import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/monitoring', label: 'Monitoring' },
  { to: '/diagnostics', label: 'Diagnostics' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-56 shrink-0 bg-[#1E2333] min-h-screen p-4 space-y-1">
      <div className="text-white font-bold text-lg px-2 mb-6">Fleet Portal</div>
      {links
        .filter((l) => !l.roles || l.roles.includes(user?.role))
        .map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/5'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
    </aside>
  );
}
