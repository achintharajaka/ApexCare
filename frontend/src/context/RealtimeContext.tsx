import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

export interface TelemetryData {
  timestamp: string;
  liveSync: boolean;
  activeClients: number;
  kpis: {
    totalPatients: number;
    inpatientCount: number;
    outpatientCount: number;
    appointments: {
      total: number;
      active: number;
      completed: number;
    };
    laboratory: {
      total: number;
      urgent: number;
      pending: number;
    };
    pharmacy: {
      totalItems: number;
      alerts: number;
    };
    bedOccupancy: {
      occupied: number;
      total: number;
      percentage: number;
    };
    revenueToday: number;
    latestAudit?: any;
  };
}

interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastSyncTime: Date | null;
  telemetry: TelemetryData | null;
  triggerManualSync: () => void;
  latencyMs: number;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(12);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dispatch global custom event for any module component to react
  const broadcastSyncEvent = useCallback((detail: any) => {
    window.dispatchEvent(new CustomEvent('apexcare:sync', { detail }));
  }, []);

  // Fetch initial or polling telemetry snapshot
  const fetchTelemetrySnapshot = useCallback(async () => {
    const startTime = Date.now();
    try {
      const res = await axios.get('/api/realtime/snapshot');
      if (res.data) {
        setTelemetry(res.data);
        setLastSyncTime(new Date());
        setIsConnected(true);
        setConnectionStatus('connected');
        setLatencyMs(Math.max(4, Date.now() - startTime));
      }
    } catch (_err) {
      // Offline or network lag
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, []);

  const triggerManualSync = useCallback(() => {
    fetchTelemetrySnapshot();
    broadcastSyncEvent({ type: 'manual_sync', timestamp: new Date().toISOString() });
  }, [fetchTelemetrySnapshot, broadcastSyncEvent]);

  useEffect(() => {
    let isMounted = true;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionStatus('connecting');

      // Resolve URL (handling Vite proxy or remote baseURL)
      const baseUrl = axios.defaults.baseURL || '';
      const sseUrl = `${baseUrl.replace(/\/+$/, '')}/api/events`;

      try {
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          setConnectionStatus('connected');
          setLastSyncTime(new Date());
        };

        es.addEventListener('connected', (e: MessageEvent) => {
          if (!isMounted) return;
          setIsConnected(true);
          setConnectionStatus('connected');
          setLastSyncTime(new Date());
          try {
            const data = JSON.parse(e.data);
            broadcastSyncEvent({ type: 'connected', ...data });
          } catch (_) {}
        });

        es.addEventListener('snapshot', (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const data: TelemetryData = JSON.parse(e.data);
            setTelemetry(data);
            setLastSyncTime(new Date());
            broadcastSyncEvent({ type: 'snapshot', data });
          } catch (_) {}
        });

        es.addEventListener('telemetry', (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const data: TelemetryData = JSON.parse(e.data);
            setTelemetry(data);
            setLastSyncTime(new Date());
            broadcastSyncEvent({ type: 'telemetry', data });
          } catch (_) {}
        });

        es.addEventListener('data_change', (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(e.data);
            if (payload.snapshot) {
              setTelemetry(payload.snapshot);
            }
            setLastSyncTime(new Date());
            // Broadcast targeted entity change
            broadcastSyncEvent({ type: 'data_change', ...payload });
          } catch (_) {}
        });

        es.onerror = () => {
          if (!isMounted) return;
          setIsConnected(false);
          setConnectionStatus('connecting');
          es.close();

          // Exponential backoff reconnect
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        };
      } catch (_err) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
    };

    // Initial snapshot fetch and SSE connect
    fetchTelemetrySnapshot();
    connectSSE();

    // Constant background polling fallback (every 8s) to ensure continuous reception
    pollIntervalRef.current = setInterval(() => {
      fetchTelemetrySnapshot();
    }, 8000);

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchTelemetrySnapshot, broadcastSyncEvent]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        connectionStatus,
        lastSyncTime,
        telemetry,
        triggerManualSync,
        latencyMs,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

