import React, { useState, useEffect } from 'react';
import { listVehicles } from '../../../api/vehicles';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { getHistoricalTelemetry } from '../../../api/telemetry';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Battery, Activity, Thermometer, Zap, AlertCircle } from 'lucide-react';

export default function Monitoring() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [history, setHistory] = useState([]);
  
  const { data: liveData, status: wsStatus } = useWebSocket(selectedVehicle);

  useEffect(() => {
    listVehicles().then((data) => {
      setVehicles(data);
      if (data.length > 0) setSelectedVehicle(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    getHistoricalTelemetry(selectedVehicle, { limit: 50 }).then((data) => {
      setHistory(data.reverse()); // Chronological for chart
    });
  }, [selectedVehicle]);

  // Update history with live data
  useEffect(() => {
    if (liveData) {
      setHistory((prev) => {
        const next = [...prev, liveData];
        if (next.length > 50) next.shift();
        return next;
      });
    }
  }, [liveData]);

  const MetricCard = ({ title, value, unit, icon: Icon, colorClass }) => (
    <div className={`p-6 rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-sm flex items-center space-x-4 ${colorClass}`}>
      <div className={`p-4 rounded-full bg-white/5`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white">
          {value !== undefined ? value : '--'}
          <span className="text-lg font-normal text-slate-500 ml-1">{unit}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Vehicle Monitoring</h1>
          <p className="text-slate-400 text-sm">Real-time telemetry and diagnostics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${wsStatus === 'open' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${wsStatus === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-slate-300 capitalize">{wsStatus === 'open' ? 'Live' : 'Polling Fallback'}</span>
          </div>
          <select 
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Speed" 
          value={liveData?.speedKmph} 
          unit="km/h" 
          icon={Activity} 
          colorClass="text-blue-400"
        />
        <MetricCard 
          title="Battery" 
          value={liveData?.batteryPct} 
          unit="%" 
          icon={Battery} 
          colorClass={liveData?.batteryPct < 20 ? 'text-red-400' : 'text-emerald-400'}
        />
        <MetricCard 
          title="Motor Temp" 
          value={liveData?.motorTempC} 
          unit="°C" 
          icon={Thermometer} 
          colorClass={liveData?.motorTempC > 80 ? 'text-orange-400' : 'text-purple-400'}
        />
        <MetricCard 
          title="Status" 
          value={liveData?.controllerStatus} 
          unit="" 
          icon={liveData?.controllerStatus === 'OK' ? Zap : AlertCircle} 
          colorClass={liveData?.controllerStatus === 'OK' ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-[400px]">
        <h2 className="text-lg font-bold text-white mb-6">Telemetry History</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} stroke="#94a3b8" />
            <YAxis yAxisId="left" stroke="#94a3b8" />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              labelFormatter={(t) => new Date(t).toLocaleTimeString()}
            />
            <Line yAxisId="left" type="monotone" dataKey="speedKmph" stroke="#3b82f6" strokeWidth={2} name="Speed (km/h)" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="batteryPct" stroke="#10b981" strokeWidth={2} name="Battery (%)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
