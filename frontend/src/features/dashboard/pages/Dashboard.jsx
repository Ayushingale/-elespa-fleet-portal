import { useQuery } from '@tanstack/react-query';
import { listVehicles } from '../../../api/vehicles';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import StatCard from '../components/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

/* ── tiny inline SVG icons (no extra dep) ──────────────────────────── */
function IconFleet() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}
function IconOnline() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
    </svg>
  );
}
function IconOffline() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
function IconBattery() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2" y="7" width="16" height="11" rx="2" />
      <path strokeLinecap="round" d="M22 11v3" strokeWidth={2} />
      <rect x="5" y="10" width="8" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Recharts custom tooltip ─────────────────────────────────────────── */
function BatteryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#252B3E] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      <p className="text-indigo-400">Battery: <span className="text-white font-bold">{payload[0].value}%</span></p>
    </div>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[#1E2333] ring-1 ring-white/5 p-5 animate-pulse h-36" />
  );
}

/* ── Status badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const isOnline = status === 'online';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isOnline
          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}
      />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

/* ── Battery bar ──────────────────────────────────────────────────── */
function BatteryBar({ pct }) {
  const colour =
    pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${colour} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-300 w-9 text-right">{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Dashboard page
   ═══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth();

  const {
    data: vehicles = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['vehicles'],
    queryFn: listVehicles,
    refetchInterval: 3000,
  });

  /* ── derived stats ─────────────────────────────────────────────── */
  const total = vehicles.length;
  const online = vehicles.filter((v) => v.status === 'online').length;
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const avgBatt = total
    ? Math.round(vehicles.reduce((s, v) => s + v.battery_pct, 0) / total)
    : 0;

  /* ── chart data ────────────────────────────────────────────────── */
  const chartData = vehicles.map((v) => ({
    name: v.id,          // short id, e.g. "EV-1001"
    battery: v.battery_pct,
    status: v.status,
  }));

  /* ── greeting ──────────────────────────────────────────────────── */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* ── error state ───────────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-rose-400 text-5xl">⚠</div>
        <p className="text-slate-300 text-lg font-semibold">Failed to load fleet data</p>
        <p className="text-slate-500 text-sm">Make sure the backend is running on port 4000.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-slate-500 text-sm">{greeting}, <span className="text-slate-300">{user?.name}</span></p>
          <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
            Fleet Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 transition-colors shadow-lg shadow-indigo-500/25"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Manage Vehicles
        </Link>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Vehicles"
              value={total}
              icon={<IconFleet />}
              accent="indigo"
              sub="Entire registered fleet"
            />
            <StatCard
              label="Online"
              value={online}
              icon={<IconOnline />}
              accent="emerald"
              sub={`${Math.round((online / total) * 100)}% of fleet active`}
            />
            <StatCard
              label="Offline"
              value={offline}
              icon={<IconOffline />}
              accent="rose"
              sub={offline > 0 ? 'Requires attention' : 'All clear'}
            />
            <StatCard
              label="Avg Battery"
              value={`${avgBatt}%`}
              icon={<IconBattery />}
              accent="amber"
              sub="Fleet-wide average"
            />
          </>
        )}
      </div>

      {/* ── Charts + mini table row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Battery chart — spans 3/5 columns on xl */}
        <div className="xl:col-span-3 rounded-2xl bg-[#1E2333] ring-1 ring-white/5 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Battery Levels</h2>
              <p className="text-xs text-slate-500 mt-0.5">All vehicles · current %</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 opacity-80" />
                ≥ 60%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500 opacity-80" />
                30–59%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500 opacity-80" />
                &lt; 30%
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<BatteryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="battery" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => {
                    const colour =
                      entry.battery >= 60
                        ? '#10b981'
                        : entry.battery >= 30
                          ? '#f59e0b'
                          : '#f43f5e';
                    return <Cell key={entry.name} fill={colour} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fleet status mini table — spans 2/5 columns on xl */}
        <div className="xl:col-span-2 rounded-2xl bg-[#1E2333] ring-1 ring-white/5 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Fleet Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live snapshot</p>
            </div>
            <Link
              to="/vehicles"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group"
                >
                  {/* status dot */}
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${v.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                  />
                  {/* vehicle id */}
                  <span className="text-sm text-slate-200 font-medium w-16 shrink-0">{v.id}</span>
                  {/* battery bar */}
                  <BatteryBar pct={v.battery_pct} />
                  {/* speed */}
                  <span className="text-xs text-slate-500 w-14 text-right tabular-nums shrink-0">
                    {v.speed_kmph} km/h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick alerts strip ──────────────────────────────────────── */}
      {!isLoading && offline > 0 && (
        <div className="rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 px-5 py-4 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-rose-400 mt-0.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-rose-300">
              {offline} vehicle{offline > 1 ? 's are' : ' is'} currently offline
            </p>
            <p className="text-xs text-rose-400/70 mt-0.5">
              {vehicles.filter((v) => v.status === 'offline').map((v) => v.id).join(', ')}
              {' '}— check the{' '}
              <Link to="/vehicles" className="underline hover:text-rose-300">Vehicles</Link>
              {' '}page for details.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
