import { useEffect, useRef, useState } from 'react';
import { getHistoricalTelemetry } from '../api/telemetry';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:4000/ws';
const MAX_BACKOFF_MS = 15000;
const THROTTLE_MS = 500;
const FALLBACK_POLL_MS = 5000;

/**
 * Subscribes to live telemetry for a single vehicle over WebSocket.
 * Reconnects automatically with exponential backoff if the connection drops.
 * Features packet buffering/throttling to prevent excessive re-renders,
 * and a REST fallback if the WebSocket connection is unavailable.
 *
 * Usage: const { data, status } = useWebSocket(vehicleId)
 */
export function useWebSocket(vehicleId) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | open | closed | error
  const socketRef = useRef(null);
  const attemptRef = useRef(0);
  const timeoutRef = useRef(null);
  const latestDataRef = useRef(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;

    // Buffer processing loop (throttles updates to UI)
    const throttleInterval = setInterval(() => {
      if (latestDataRef.current) {
        setData(latestDataRef.current);
        latestDataRef.current = null;
      }
    }, THROTTLE_MS);

    const connect = () => {
      const socket = new WebSocket(`${WS_BASE_URL}/telemetry?vehicleId=${vehicleId}`);
      socketRef.current = socket;
      setStatus('connecting');

      socket.onopen = () => {
        if (cancelled) return;
        attemptRef.current = 0;
        setStatus('open');
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          // Buffer the latest packet instead of triggering immediate re-render
          latestDataRef.current = JSON.parse(event.data);
        } catch {
          // Ignore malformed packets rather than crash the UI.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus('closed');
        const backoff = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF_MS);
        attemptRef.current += 1;
        timeoutRef.current = setTimeout(connect, backoff);
      };

      socket.onerror = () => {
        if (cancelled) return;
        setStatus('error');
        socket.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearInterval(throttleInterval);
      clearTimeout(timeoutRef.current);
      socketRef.current?.close();
    };
  }, [vehicleId]);

  // REST Fallback Effect
  useEffect(() => {
    if (!vehicleId || status === 'open') return;

    let fallbackInterval;

    const pollFallback = async () => {
      try {
        const records = await getHistoricalTelemetry(vehicleId);
        if (records && records.length > 0) {
          // Map DB columns back to WS packet format for consistency
          const latest = records[0];
          setData({
            vehicleId: latest.vehicle_id,
            timestamp: latest.timestamp,
            speedKmph: latest.speed_kmph,
            batteryPct: latest.battery_pct,
            motorTempC: latest.motor_temp_c,
            controllerStatus: latest.controller_status,
          });
        }
      } catch (err) {
        console.error('Fallback polling failed', err);
      }
    };

    // Delay the initial fallback poll slightly so it doesn't fire immediately if WS connects fast
    const initialDelay = setTimeout(() => {
      if (status !== 'open') {
        pollFallback();
        fallbackInterval = setInterval(pollFallback, FALLBACK_POLL_MS);
      }
    }, 2000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(fallbackInterval);
    };
  }, [vehicleId, status]);

  return { data, status };
}
