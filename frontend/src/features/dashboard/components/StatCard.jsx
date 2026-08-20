/**
 * StatCard — a single KPI tile for the Dashboard summary row.
 *
 * Props:
 *  label      string   — short description (e.g. "Total Vehicles")
 *  value      number|string
 *  icon       ReactNode
 *  accent     string   — "indigo" | "emerald" | "rose" | "amber"
 *  sub        string?  — optional sub-line below the value
 */
export default function StatCard({ label, value, icon, accent = 'indigo', sub }) {
  const accentMap = {
    indigo: {
      ring: 'ring-indigo-500/30',
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      bar: 'bg-indigo-500',
    },
    emerald: {
      ring: 'ring-emerald-500/30',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
    },
    rose: {
      ring: 'ring-rose-500/30',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
    },
    amber: {
      ring: 'ring-amber-500/30',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
    },
  };

  const c = accentMap[accent] ?? accentMap.indigo;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl bg-[#1E2333]
        ring-1 ${c.ring}
        p-5 flex flex-col gap-3
        transition-all duration-300
        hover:ring-2 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40
      `}
    >
      {/* top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.bar} opacity-70`} />

      {/* icon + label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
          {label}
        </span>
        <div className={`${c.bg} ${c.text} rounded-lg p-2`}>
          {icon}
        </div>
      </div>

      {/* value */}
      <div className="text-4xl font-extrabold text-white tabular-nums leading-none">
        {value}
      </div>

      {/* sub-line */}
      {sub && (
        <p className="text-xs text-slate-500 leading-tight">{sub}</p>
      )}
    </div>
  );
}
