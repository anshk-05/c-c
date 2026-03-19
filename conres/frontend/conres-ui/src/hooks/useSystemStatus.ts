import { useState, useEffect } from 'react';
import { getSystemStatus } from '../api/sessionApi';
import type { SystemStatus } from '../types';

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

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

    fetchStatus();
    const id = setInterval(fetchStatus, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { status, error };
}
