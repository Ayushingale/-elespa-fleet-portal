import { useEffect, useRef, useState } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080/ws';
const MAX_BACKOFF_MS = 15000;

/**
 * Subscribes to live telemetry for a single vehicle over WebSocket.
 * Reconnects automatically with exponential backoff if the connection drops.
 *
 * Usage: const { data, status } = useWebSocket(vehicleId)
 */
export function useWebSocket(vehicleId) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | open | closed | error
  const socketRef = useRef(null);
  const attemptRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;

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
          setData(JSON.parse(event.data));
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
      clearTimeout(timeoutRef.current);
      socketRef.current?.close();
    };
  }, [vehicleId]);

  return { data, status };
}
