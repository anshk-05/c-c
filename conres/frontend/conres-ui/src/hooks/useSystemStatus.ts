import { useState, useEffect } from 'react';
import { getSystemStatus } from '../api/sessionApi';
import type { SystemStatus } from '../types';
import { createRealtimeConnection } from '../api/realtimeApi';
import type { RealtimeConnectionState, RealtimeEventName, RealtimeFileUpdated } from '../api/realtimeApi';

export interface RealtimeEventLogEntry {
  id: number;
  eventName: RealtimeEventName;
  occurredAt: string;
  detail: string;
}

interface RealtimePayload {
  reason?: string;
  occurredAtUtc?: string;
  connectedAtUtc?: string;
  fileName?: string;
  fileVersion?: number;
  userId?: number;
  updatedAtUtc?: string;
  status?: {
    fileVersion?: number;
    writingUserId?: number | null;
    readingUserIds?: number[];
    queue?: unknown[];
  };
}

function describeRealtimeEvent(eventName: RealtimeEventName, payload?: RealtimePayload) {
  if (eventName === 'ServerConnected') {
    return 'client subscribed to coordination broker';
  }

  if (eventName === 'FileUpdated') {
    return `${payload?.fileName ?? 'shared file'} v${payload?.fileVersion ?? '?'} updated by user #${payload?.userId ?? '?'}`;
  }

  if (eventName === 'FileAccessChanged') {
    const writer = payload?.status?.writingUserId;
    const readers = payload?.status?.readingUserIds?.length ?? 0;
    const queued = payload?.status?.queue?.length ?? 0;
    return `${payload?.reason ?? 'file access changed'}; readers=${readers}; writer=${writer ?? 'none'}; queued=${queued}`;
  }

  return payload?.reason ?? 'status refresh requested';
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<RealtimeEventName | null>(null);
  const [lastFileUpdate, setLastFileUpdate] = useState<RealtimeFileUpdated | null>(null);
  const [eventLog, setEventLog] = useState<RealtimeEventLogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    let nextEventId = 1;
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

    function recordRealtimeEvent(eventName: RealtimeEventName, payload?: RealtimePayload) {
      if (!cancelled) {
        setLastRealtimeEvent(eventName);
        setEventLog((current) => [
          {
            id: nextEventId++,
            eventName,
            occurredAt: payload?.occurredAtUtc ?? payload?.updatedAtUtc ?? payload?.connectedAtUtc ?? new Date().toISOString(),
            detail: describeRealtimeEvent(eventName, payload),
          },
          ...current,
        ].slice(0, 12));
      }
    }

    async function refreshFromRealtime(eventName: RealtimeEventName, payload?: RealtimePayload) {
      recordRealtimeEvent(eventName, payload);
      await fetchStatus();
    }

    const statusRefreshEvents: RealtimeEventName[] = [
      'ServerConnected',
      'SessionStateChanged',
      'FileAccessChanged',
      'SystemStatusChanged',
    ];

    statusRefreshEvents.forEach((eventName) => {
      connection.on(eventName, (payload?: RealtimePayload) => {
        void refreshFromRealtime(eventName, payload);
      });
    });

    connection.on('FileUpdated', (payload: RealtimeFileUpdated) => {
      if (!cancelled) {
        setLastFileUpdate(payload);
      }
      void refreshFromRealtime('FileUpdated', payload);
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

  return { status, error, connectionState, lastRealtimeEvent, lastFileUpdate, eventLog };
}
