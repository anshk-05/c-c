import { useState, useEffect } from 'react';
import { getSystemStatus } from '../api/sessionApi';
import type { SystemStatus } from '../types';
import { createRealtimeConnection } from '../api/realtimeApi';
import type { RealtimeConnectionState, RealtimeEventName, RealtimeFileUpdated } from '../api/realtimeApi';

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<RealtimeEventName | null>(null);
  const [lastFileUpdate, setLastFileUpdate] = useState<RealtimeFileUpdated | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connection = createRealtimeConnection();

    async function fetchStatus() {
      try {
        const data = await getSystemStatus();
        if (!cancelled) {
          setStatus(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch status');
        }
      }
    }

    async function refreshFromRealtime(eventName: RealtimeEventName) {
      if (!cancelled) {
        setLastRealtimeEvent(eventName);
      }
      await fetchStatus();
    }

    const statusRefreshEvents: RealtimeEventName[] = [
      'ServerConnected',
      'SessionStateChanged',
      'FileAccessChanged',
      'SystemStatusChanged',
    ];

    statusRefreshEvents.forEach((eventName) => {
      connection.on(eventName, () => {
        void refreshFromRealtime(eventName);
      });
    });

    connection.on('FileUpdated', (payload: RealtimeFileUpdated) => {
      if (!cancelled) {
        setLastFileUpdate(payload);
      }
      void refreshFromRealtime('FileUpdated');
    });

    connection.onreconnecting(() => {
      if (!cancelled) {
        setConnectionState('reconnecting');
      }
    });

    connection.onreconnected(() => {
      if (!cancelled) {
        setConnectionState('connected');
      }
      void refreshFromRealtime('ServerConnected');
    });

    connection.onclose(() => {
      if (!cancelled) {
        setConnectionState('disconnected');
      }
    });

    fetchStatus();
    void connection
      .start()
      .then(() => {
        if (!cancelled) {
          setConnectionState('connected');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionState('disconnected');
        }
      });

    const id = setInterval(fetchStatus, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
      statusRefreshEvents.forEach((eventName) => connection.off(eventName));
      connection.off('FileUpdated');
      void connection.stop();
    };
  }, []);

  return { status, error, connectionState, lastRealtimeEvent, lastFileUpdate };
}
