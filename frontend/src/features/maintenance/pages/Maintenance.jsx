import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  listMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} from '../../../api/maintenance';
import { listVehicles } from '../../../api/vehicles';
import {
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Check,
  RotateCcw,
  Zap,
  Activity,
  Thermometer,
  ShieldAlert,
  Car,
  FileText,
  Filter,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

/* Standard Maintenance Type Categories and Presets */
const SERVICE_TYPE_PRESETS = [
  { name: 'Battery Cell Balancing & Inspection', category: 'battery', icon: Zap, cycle: '6 Months / 20,000 km' },
  { name: 'Motor Controller Replacement & Calibration', category: 'powertrain', icon: Activity, cycle: 'As Flagged / 50,000 km' },
  { name: 'Thermal Fluid & Coolant Flush', category: 'thermal', icon: Thermometer, cycle: '12 Months / 40,000 km' },
  { name: 'High Voltage Isolation & Contactor Service', category: 'safety', icon: ShieldAlert, cycle: 'Annual Safety Check' },
  { name: 'Tire Rotation & Regenerative Brake Inspection', category: 'chassis', icon: Car, cycle: '10,000 km Routine' },
  { name: 'Annual HEV Regulatory Safety Certification', category: 'compliance', icon: FileText, cycle: 'Annual Regulatory' },
];

export default function Maintenance() {
  const queryClient = useQueryClient();
  const location = useLocation();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, scheduled, overdue, completed
  const [vehicleFilter, setVehicleFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null); // null when creating, record object when editing

  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    type: 'Battery Cell Balancing & Inspection',
    scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'scheduled',
    notes: '',
  });

  // Queries
  const {
    data: records = [],
    isLoading: isRecordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => listMaintenanceRecords(),
    refetchInterval: 5000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: listVehicles,
  });

  // Check if opened with prefilled state from Diagnostics
  useEffect(() => {
    if (location.state?.prefillVehicleId) {
      setFormData({
        vehicle_id: location.state.prefillVehicleId,
        type: location.state.prefillType || 'Battery Cell Balancing & Inspection',
        scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        status: 'scheduled',
        notes: location.state.prefillNotes || '',
      });
      setEditingRecord(null);
      setIsModalOpen(true);
      // Clean up browser history state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createMaintenanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateMaintenanceRecord(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
  });

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      vehicle_id: vehicles[0]?.id || '',
      type: 'Battery Cell Balancing & Inspection',
      scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'scheduled',
      notes: '',
    });
  };

  const handleOpenCreateModal = (presetVehicleId = null, presetType = null) => {
    setEditingRecord(null);
    setFormData({
      vehicle_id: presetVehicleId || vehicles[0]?.id || '',
      type: presetType || 'Battery Cell Balancing & Inspection',
      scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'scheduled',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      vehicle_id: record.vehicle_id,
      type: record.type,
      scheduled_date: record.scheduled_date || '',
      status: record.status || 'scheduled',
      notes: record.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        payload: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleQuickStatusChange = (record, newStatus) => {
    updateMutation.mutate({
      id: record.id,
      payload: { status: newStatus },
    });
  };

  // Stats calculation
  const totalTasks = records.length;
  const scheduledTasks = records.filter((r) => r.status === 'scheduled');
  const overdueTasks = records.filter((r) => r.status === 'overdue');
  const completedTasks = records.filter((r) => r.status === 'completed');

  // Smart Preventative Maintenance Recommendations based on fleet status
  const preventativeRecommendations = vehicles
    .filter((v) => v.battery_pct < 25 || v.motor_temp_c > 65 || v.status === 'offline')
    .slice(0, 3)
    .map((v) => {
      if (v.motor_temp_c > 65) {
        return {
          vehicleId: v.id,
          title: 'High Motor Temperature - Coolant Flush Recommended',
          type: 'Thermal Fluid & Coolant Flush',
          reason: `Motor temp is running high at ${Math.round(v.motor_temp_c)}°C`,
          icon: Thermometer,
          accent: 'amber',
        };
      }
      if (v.battery_pct < 25) {
        return {
          vehicleId: v.id,
          title: 'Deep Discharge Alert - Battery Balancing Recommended',
          type: 'Battery Cell Balancing & Inspection',
          reason: `Battery SoC low (${Math.round(v.battery_pct)}%) with potential cell drift`,
          icon: Zap,
          accent: 'rose',
        };
      }
      return {
        vehicleId: v.id,
        title: 'Offline Vehicle - Safety & Contactor Inspection',
        type: 'High Voltage Isolation & Contactor Service',
        reason: 'Vehicle currently offline; verify contactor telemetry and 12V rail',
        icon: ShieldAlert,
        accent: 'indigo',
      };
    });

  // Filtered list
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      r.vehicle_id?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      r.vehicle_name?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'ALL' || r.vehicle_id === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              Fleet Operations & Depots
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Maintenance & Service
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Work order tracking, preventative servicing schedules, and compliance audits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold px-4 py-2.5 shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95"
          >
            <Plus size={16} />
            Schedule Maintenance
          </button>

          <button
            onClick={() => refetchRecords()}
            title="Refresh maintenance records"
            className="rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 p-2.5 transition-colors"
          >
            <RefreshCw size={16} className={isRecordsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scheduled Tasks */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scheduled Tasks
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{scheduledTasks.length}</span>
            <span className="text-xs text-indigo-400 font-medium">upcoming</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Pending workshop execution</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Overdue Work Orders */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overdue Orders
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">{overdueTasks.length}</span>
            <span className="text-xs text-rose-400 font-medium">urgent</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Passed target service date</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Completed Service */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed Records
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{completedTasks.length}</span>
            <span className="text-xs text-slate-400">logged</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Successfully serviced & signed</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Service Compliance */}
        <div className="p-5 rounded-2xl bg-[#1E2333] border border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Service Compliance
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Wrench size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {totalTasks > 0 ? Math.round(((totalTasks - overdueTasks.length) / totalTasks) * 100) : 100}%
            </span>
            <span className="text-xs text-cyan-400 font-medium">on schedule</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Fleet PM schedule compliance</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* ── Smart Preventative Maintenance Suggestions ─────────────────── */}
      {preventativeRecommendations.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#1C2234] to-slate-900 border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Telemetry-Driven Preventative Maintenance Advisories
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {preventativeRecommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <rec.icon size={14} className="text-amber-400" />
                      {rec.vehicleId}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                      Advisory
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{rec.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{rec.reason}</p>
                </div>
                <button
                  onClick={() => handleOpenCreateModal(rec.vehicleId, rec.type)}
                  className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus size={13} /> Schedule This Task
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters & Search Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E2333] border border-white/5 rounded-2xl p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vehicle ID, service type, or work order notes..."
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
          {/* Vehicle Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
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

          {/* Status Tabs */}
          <div className="flex items-center rounded-xl bg-[#151821] p-1 border border-white/10 text-xs">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'completed', label: 'Completed' },
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

      {/* ── Maintenance Records Table ─────────────────────────────────── */}
      <div className="rounded-2xl bg-[#1E2333] border border-white/5 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white">Fleet Maintenance Records & Work Orders</h2>
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-slate-300 font-semibold">
              {filteredRecords.length} records
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Depot Work Order System
          </span>
        </div>

        {isRecordsLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
            <p className="text-sm">Loading maintenance work orders...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400 opacity-80" />
            <h3 className="text-base font-bold text-white">No Maintenance Records Found</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              {searchQuery || vehicleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No maintenance tasks match your active filters. Try clearing your search.'
                : 'All scheduled maintenance tasks are complete.'}
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus size={14} /> Schedule New Service
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#181C2A] text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3.5">Vehicle</th>
                  <th className="px-6 py-3.5">Service Type</th>
                  <th className="px-6 py-3.5">Scheduled Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Technician / Work Order Notes</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecords.map((record) => {
                  const isCompleted = record.status === 'completed';
                  const isOverdue = record.status === 'overdue';
                  const isScheduled = record.status === 'scheduled';

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isCompleted ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Vehicle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-white text-sm">{record.vehicle_id}</span>
                          <p className="text-xs text-slate-500">
                            {record.vehicle_name || `Transit ${record.vehicle_id}`}
                          </p>
                        </div>
                      </td>

                      {/* Service Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white/5 text-slate-300">
                            <Wrench size={15} />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200">{record.type}</span>
                            <p className="text-[11px] text-slate-500">Preventative Maintenance</p>
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar size={14} className="text-slate-500" />
                          <span className="font-medium">{record.scheduled_date || '--'}</span>
                        </div>
                        {isOverdue && (
                          <span className="text-[11px] text-rose-400 font-semibold block mt-0.5">
                            Action required
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                              : isOverdue
                              ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
                              : 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-400'
                                : isOverdue
                                ? 'bg-rose-400 animate-ping'
                                : 'bg-indigo-400'
                            }`}
                          />
                          {record.status}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-6 py-4 min-w-[240px]">
                        <p className="text-xs text-slate-300 leading-snug">
                          {record.notes || <span className="text-slate-500 italic">No notes attached</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick complete / reschedule button */}
                          {isScheduled && (
                            <button
                              onClick={() => handleQuickStatusChange(record, 'completed')}
                              title="Mark as completed"
                              className="px-2.5 py-1.5 rounded-lg font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition-all"
                            >
                              <Check size={13} /> Complete
                            </button>
                          )}

                          {isOverdue && (
                            <button
                              onClick={() => handleQuickStatusChange(record, 'completed')}
                              title="Complete overdue service"
                              className="px-2.5 py-1.5 rounded-lg font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1 transition-all"
                            >
                              <Check size={13} /> Complete Now
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => handleQuickStatusChange(record, 'scheduled')}
                              title="Re-open work order"
                              className="px-2.5 py-1.5 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 flex items-center gap-1 transition-all"
                            >
                              <RotateCcw size={13} /> Reopen
                            </button>
                          )}

                          {/* Edit Modal */}
                          <button
                            onClick={() => handleOpenEditModal(record)}
                            title="Edit work order"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Delete maintenance record for ${record.vehicle_id}?`)) {
                                deleteMutation.mutate(record.id);
                              }
                            }}
                            title="Delete maintenance record"
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

      {/* ── MODAL: Schedule / Edit Maintenance Record ──────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E2333] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingRecord ? 'Edit Maintenance Work Order' : 'Schedule New Maintenance Service'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingRecord ? `Updating work order #${editingRecord.id}` : 'Assign vehicle service task'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Target Vehicle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Vehicle *
                </label>
                <select
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} — {v.name} (SoC: {v.battery_pct}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Preset Select or Custom */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Maintenance Service Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {SERVICE_TYPE_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.cycle})
                    </option>
                  ))}
                  <option value="Custom Service / Repair">Custom Service / Repair</option>
                </select>
              </div>

              {/* Scheduled Date & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#151821] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="overdue">Overdue</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Technician Instructions / Work Order Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Inspect cell delta, tighten high voltage contactors, log torque specs..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#151821] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {editingRecord
                    ? updateMutation.isPending
                      ? 'Updating...'
                      : 'Save Changes'
                    : createMutation.isPending
                    ? 'Scheduling...'
                    : 'Schedule Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

