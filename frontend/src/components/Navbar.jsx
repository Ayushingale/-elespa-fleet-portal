import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-white/10 flex items-center justify-between px-6">
      <span className="text-slate-400 text-sm">Elespa HEV Fleet Management</span>
      <div className="flex items-center gap-4">
        <span className="text-slate-300 text-sm">{user?.name} · {user?.role}</span>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-white">
          Log out
        </button>
      </div>
    </header>
  );
}
