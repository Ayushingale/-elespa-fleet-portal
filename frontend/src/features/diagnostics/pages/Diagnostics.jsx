import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  listDiagnostics,
  createDiagnostic,
  resolveDiagnostic,
  deleteDiagnostic,
  runVehicleScan,
} from '../../../api/diagnostics';
import { listVehicles } from '../../../api/vehicles';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  Zap,
  Activity,
  Cpu,
  Thermometer,
  Wrench,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';

/* Standard EV / HEV Diagnostic Trouble Codes reference */
const COMMON_DTC_PRESETS = [
  { code: 'P0A80', severity: 'warning', desc: 'Hybrid Battery Pack Degradation - Cell voltage variance detected' },
  { code: 'P0AA6', severity: 'critical', desc: 'Hybrid Battery Voltage System Isolation Fault - High voltage leak risk' },
  { code: 'P0A0F', severity: 'critical', desc: 'Motor Controller Gate Driver Communication Timeout - Controller fail' },
  { code: 'P0C68', severity: 'warning', desc: 'Generator Inverter Phase-U Current Transducer Out of Range' },
  { code: 'P0A93', severity: 'warning', desc: 'Inverter Cooling System Performance Degraded - Low coolant flow' },
  { code: 'P0A1F', severity: 'info', desc: 'Auxiliary 12V DC-DC Converter Self-Test - Verification check' },
  { code: 'P0A78', severity: 'info', desc: 'Drive Motor Inverter Phase Circuit Calibration Nominal' },
  { code: 'P0A10', severity: 'critical', desc: 'DC-DC Converter High Voltage Input Interlock Circuit Open' },
];

export default function Diagnostics() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL'); // ALL, critical, warning, info
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, active, resolved

  // Modals & Panels
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isDtcGuideOpen, setIsDtcGuideOpen] = useState(false);

  // New Fault Form State
  const [newFault, setNewFault] = useState({
    vehicle_id: '',
    fault_code: '',
    severity: 'warning',
    description: '',
  });

  // Scanner State
  const [scanVehicleId, setScanVehicleId] = useState('');
  const [scanStage, setScanStage] = useState('idle'); // idle, scanning, complete
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);

  // Queries
  const {
    data: diagnostics = [],
    isLoading: isDiagLoading,
    refetch: refetchDiag,
  } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: () => listDiagnostics(),
    refetchInterval: 5000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: listVehicles,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createDiagnostic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
      setIsLogModalOpen(false);
      setNewFault({ vehicle_id: '', fault_code: '', severity: 'warning', description: '' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }) => resolveDiagnostic(id, resolved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiagnostic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
    },
  });

  // Scan simulation handler
  const handleStartScan = async () => {
    if (!scanVehicleId) return;
    setScanStage('scanning');
    setScanProgress(10);
    setScanResult(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 250);

    try {
      const result = await runVehicleScan(scanVehicleId);
      clearInterval(interval);
      setScanProgress(100);
      setTimeout(() => {
        setScanResult(result);
        setScanStage('complete');
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setScanStage('idle');
      alert('Diagnostic scan failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Pre-fill fault creation from Preset
  const handleSelectPreset = (preset) => {
    setNewFault((prev) => ({
      ...prev,
      fault_code: preset.code,
      severity: preset.severity,
      description: preset.desc,
    }));
  };

  // Stats calculation
  const totalFaults = diagnostics.length;
  const activeFaults = diagnostics.filter((d) => !d.resolved);
  const criticalFaults = activeFaults.filter((d) => d.severity === 'critical');
  const warningFaults = activeFaults.filter((d) => d.severity === 'warning');
  const resolvedFaults = diagnostics.filter((d) => d.resolved);

  const totalVehiclesCount = vehicles.length || 1;
  const healthyVehiclesCount = vehicles.filter(
    (v) => !activeFaults.some((d) => d.vehicle_id === v.id)
  ).length;
  const fleetHealthIndex = Math.round((healthyVehiclesCount / totalVehiclesCount) * 100);

  // Filtered list
  const filteredDiagnostics = diagnostics.filter((d) => {
    // Search query
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      d.fault_code?.toLowerCase().includes(q) ||
      d.vehicle_id?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.vehicle_name?.toLowerCase().includes(q);

    // Vehicle
    const matchesVehicle = selectedVehicleFilter === 'ALL' || d.vehicle_id === selectedVehicleFilter;

    // Severity
    const matchesSeverity = severityFilter === 'ALL' || d.severity === severityFilter;

    // Status
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'active' && !d.resolved) ||
      (statusFilter === 'resolved' && d.resolved);

    return matchesSearch && matchesVehicle && matchesSeverity && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30">
              ECU & Powertrain Telemetry
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Diagnostics & Health
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Diagnostic Trouble Code (DTC) tracking, real-time subsystem scans, and anomaly triage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setScanVehicleId(vehicles[0]?.id || '');
              setScanStage('idle');
              setScanProgress(0);
              setScanResult(null);
              setIsScanModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold px-4 py-2.5 shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95"
          >
            <Sparkles size={16} />
            Run Diagnostic Scan
          </button>

          <button
            onClick={() => {
              setNewFault({
                vehicle_id: vehicles[0]?.id || '',
                fault_code: '',
                severity: 'warning',
                description: '',
              });
              setIsLogModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-sm font-medium px-3.5 py-2.5 transition-all"
          >
            <Plus size={16} />
            Log DTC Fault
          </button>

          <button
            onClick={() => refetchDiag()}
            title="Refresh diagnostics"
            className="rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 p-2.5 transition-colors"
          >
            <RefreshCw size={16} className={isDiagLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Issues */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active DTCs
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{activeFaults.length}</span>
            <span className="text-xs text-rose-400 font-medium">
              {criticalFaults.length} critical
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Unresolved system fault codes</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Fleet Health Index */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fleet Health Index
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{fleetHealthIndex}%</span>
            <span className="text-xs text-slate-400">
              ({healthyVehiclesCount}/{totalVehiclesCount} clean)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Vehicles with 0 active DTCs</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Warnings */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Warning Alerts
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{warningFaults.length}</span>
            <span className="text-xs text-slate-500">sensors/thermal</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Imbalance & drift advisories</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Resolved */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resolved Faults
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{resolvedFaults.length}</span>
            <span className="text-xs text-indigo-400 font-medium">cleared</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Historical faults remediated</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* ── Subsystem Quick Status Strip ──────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#1B2030] to-slate-900 border border-white/10 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Cpu size={18} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Core Powertrain & ECU Subsystems
            </h2>
          </div>
          <button
            onClick={() => setIsDtcGuideOpen(!isDtcGuideOpen)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 self-start"
          >
            <Info size={14} />
            {isDtcGuideOpen ? 'Hide DTC Guide' : 'View DTC Code Reference Library'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'BMS Battery Pack', status: 'pass', icon: Zap, val: 'Nominal (400V)' },
            { name: 'Inverter & MCU', status: criticalFaults.some(f => f.fault_code.includes('0F') || f.fault_code.includes('78')) ? 'critical' : 'pass', icon: Cpu, val: 'Active PWM' },
            { name: 'Thermal Loop', status: warningFaults.some(f => f.fault_code.includes('93') || f.fault_code.includes('80')) ? 'warning' : 'pass', icon: Thermometer, val: 'Pump 8.4L/m' },
            { name: 'Regen Braking', status: 'pass', icon: Activity, val: '120 bar Press.' },
            { name: 'HV Isolation', status: activeFaults.some(f => f.fault_code === 'P0AA6') ? 'critical' : 'pass', icon: ShieldAlert, val: '4.8 MΩ Nominal' },
            { name: 'CAN Gateway', status: 'pass', icon: Radio, val: '2.1ms Latency' },
          ].map((sub, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <sub.icon size={16} className="text-slate-400" />
                <span
                  className={`h-2 w-2 rounded-full ${
                    sub.status === 'pass'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : sub.status === 'warning'
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'
                      : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-ping'
                  }`}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 truncate">{sub.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{sub.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expandable DTC Reference Guide */}
        {isDtcGuideOpen && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Standard HEV Diagnostic Trouble Codes (DTCs) Reference
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {COMMON_DTC_PRESETS.map((item) => (
                <div
                  key={item.code}
                  className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-indigo-300">{item.code}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold ${
                        item.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400'
                          : item.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Filters & Search Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E2333] border border-white/5 rounded-2xl p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by DTC code (e.g. P0A80), vehicle ID, or description..."
            className="w-full bg-[#151821] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Vehicle Dropdown Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="bg-[#151821] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} ({v.name})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center rounded-xl bg-[#151821] p-1 border border-white/10 text-xs">
            {['ALL', 'critical', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                  severityFilter === sev
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-xl bg-[#151821] p-1 border border-white/10 text-xs">
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'active', label: 'Active Faults' },
              { id: 'resolved', label: 'Resolved' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diagnostic Faults Table & Log List ─────────────────────────── */}
      <div className="rounded-2xl bg-[#1E2333] border border-white/5 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white">Diagnostic Trouble Code (DTC) Log</h2>
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-slate-300 font-semibold">
              {filteredDiagnostics.length} records
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Auto-syncing with ECU logs
          </span>
        </div>

        {isDiagLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
            <p className="text-sm">Loading vehicle diagnostic telemetry...</p>
          </div>
        ) : filteredDiagnostics.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400 opacity-80" />
            <h3 className="text-base font-bold text-white">No Diagnostic Faults Found</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              {searchQuery || selectedVehicleFilter !== 'ALL' || severityFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No DTC records match your active search filters. Try resetting the filters.'
                : 'All vehicle subsystems and controllers are operating within nominal parameters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#181C2A] text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3.5">Fault Code (DTC)</th>
                  <th className="px-6 py-3.5">Vehicle</th>
                  <th className="px-6 py-3.5">Severity</th>
                  <th className="px-6 py-3.5">Description & Impact</th>
                  <th className="px-6 py-3.5">Reported</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDiagnostics.map((fault) => {
                  const isResolved = !!fault.resolved;
                  const isCritical = fault.severity === 'critical';
                  const isWarning = fault.severity === 'warning';

                  return (
                    <tr
                      key={fault.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isResolved ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Fault Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${
                              isCritical
                                ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                                : isWarning
                                ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                                : 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                            }`}
                          >
                            {fault.fault_code}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-white">{fault.vehicle_id}</span>
                          <p className="text-xs text-slate-500">
                            {fault.vehicle_name || `Transit ${fault.vehicle_id}`}
                          </p>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                              : isWarning
                              ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                              : 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCritical
                                ? 'bg-rose-400 animate-ping'
                                : isWarning
                                ? 'bg-amber-400'
                                : 'bg-blue-400'
                            }`}
                          />
                          {fault.severity}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 min-w-[260px]">
                        <p className="text-slate-200 font-medium text-sm leading-snug">
                          {fault.description || 'System anomaly flagged by ECU controller.'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Subsystem: {fault.fault_code?.startsWith('P0A') ? 'High Voltage Powertrain' : 'CAN / Chassis'}
                        </p>
                      </td>

                      {/* Reported At */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-500" />
                          <span>
                            {new Date(fault.reported_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isResolved
                              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
                          }`}
                        >
                          {isResolved ? (
                            <>
                              <Check size={12} /> Resolved
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} /> Active
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          {/* Resolve / Reopen toggle */}
                          <button
                            onClick={() =>
                              resolveMutation.mutate({
                                id: fault.id,
                                resolved: !isResolved,
                              })
                            }
                            title={isResolved ? 'Reopen fault code' : 'Mark as resolved'}
                            className={`px-2.5 py-1.5 rounded-lg font-medium border flex items-center gap-1.5 transition-all ${
                              isResolved
                                ? 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            {isResolved ? (
                              <>
                                <RotateCcw size={13} /> Reopen
                              </>
                            ) : (
                              <>
                                <Check size={13} /> Clear / Resolve
                              </>
                            )}
                          </button>

                          {/* Quick Schedule Maintenance */}
                          {!isResolved && (
                            <button
                              onClick={() => {
                                navigate('/maintenance', {
                                  state: {
                                    prefillVehicleId: fault.vehicle_id,
                                    prefillNotes: `Follow-up on Diagnostic Fault [${fault.fault_code}]: ${fault.description}`,
                                    prefillType: fault.fault_code.includes('80')
                                      ? 'Battery Cell Balancing & Inspection'
                                      : fault.fault_code.includes('0F')
                                      ? 'Motor Controller Replacement'
                                      : 'High Voltage Isolation & Contactor Service',
                                  },
                                });
                              }}
                              title="Schedule maintenance service for this vehicle"
                              className="px-2.5 py-1.5 rounded-lg font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center gap-1 transition-all"
                            >
                              <Wrench size={13} /> Service
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Delete diagnostic record ${fault.fault_code} for ${fault.vehicle_id}?`)) {
                                deleteMutation.mutate(fault.id);
                              }
                            }}
                            title="Delete log entry"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Run Diagnostic Scan ─────────────────────────────────── */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E2333] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Interactive ECU Diagnostic Scanner</h3>
                  <p className="text-xs text-slate-400">
                    Real-time CAN bus telemetry and subsystem validation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Select Target Vehicle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Target Vehicle to Scan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={scanStage === 'scanning'}
                      onClick={() => setScanVehicleId(v.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        scanVehicleId === v.id
                          ? 'border-indigo-500 bg-indigo-600/15 text-white ring-2 ring-indigo-500/30'
                          : 'border-white/10 bg-[#151821] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{v.id}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            v.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">SoC: {v.battery_pct}%</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanning Progress */}
              {scanStage === 'scanning' && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-indigo-400" />
                      Interrogating ECU gateway for {scanVehicleId}...
                    </span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400" /> BMS Cell Balancing
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400" /> Inverter Gate Drive
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400" /> High Voltage Isolation
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400" /> CAN Bus J1939 Stack
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Results */}
              {scanStage === 'complete' && scanResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/80 border border-white/10">
                    <div>
                      <span className="text-xs text-slate-400">Scan Complete for</span>
                      <h4 className="text-base font-bold text-white">
                        {scanResult.vehicleName} ({scanResult.vehicleId})
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        scanResult.overallHealth === 'pass'
                          ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                          : scanResult.overallHealth === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                          : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40'
                      }`}
                    >
                      {scanResult.overallHealth === 'pass'
                        ? '✔ All Systems Operational'
                        : `⚠ Issues Detected (${scanResult.overallHealth})`}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {scanResult.subsystems.map((sub, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#151821] border border-white/5 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-200">{sub.name}</p>
                          <p className="text-slate-400 mt-0.5">{sub.details}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            sub.status === 'pass'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : sub.status === 'warning'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-[#181C2A] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>

              {scanStage !== 'scanning' && (
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={!scanVehicleId}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  {scanStage === 'complete' ? 'Run Scan Again' : 'Execute System Scan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Log DTC Fault Code ──────────────────────────────────── */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E2333] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Log Diagnostic Trouble Code (DTC)</h3>
                  <p className="text-xs text-slate-400">Manually flag a vehicle diagnostic code</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newFault);
              }}
              className="p-6 space-y-4"
            >
              {/* Target Vehicle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Vehicle *
                </label>
                <select
                  required
                  value={newFault.vehicle_id}
                  onChange={(e) => setNewFault({ ...newFault, vehicle_id: e.target.value })}
                  className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} — {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Quick Standard Code Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DTC_PRESETS.slice(0, 5).map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                        newFault.fault_code === p.code
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-[#151821] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* DTC Fault Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fault Code (DTC) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. P0A80"
                    value={newFault.fault_code}
                    onChange={(e) => setNewFault({ ...newFault, fault_code: e.target.value.toUpperCase() })}
                    className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Severity *
                  </label>
                  <select
                    value={newFault.severity}
                    onChange={(e) => setNewFault({ ...newFault, severity: e.target.value })}
                    className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="critical">Critical (Immediate stop/service)</option>
                    <option value="warning">Warning (Degraded performance)</option>
                    <option value="info">Info (Advisory / Self-test)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fault Description & Telemetry Observations
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe sensor telemetry, symptom, or diagnostic reason..."
                  value={newFault.description}
                  onChange={(e) => setNewFault({ ...newFault, description: e.target.value })}
                  className="w-full bg-[#151821] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Logging...' : 'Save Diagnostic Fault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

