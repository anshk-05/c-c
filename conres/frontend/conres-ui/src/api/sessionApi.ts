import type { SystemStatus } from '../types';

const BASE_URL = 'http://localhost:5044';

export async function login(username: string): Promise<{ userId: number | null; message: string; queued: boolean }> {
  const res = await fetch(`${BASE_URL}/api/session/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  const data = await res.json();

  if (res.status === 200) {
    return { userId: data.session?.userId ?? null, message: data.message, queued: false };
  }
  if (res.status === 202) {
    return { userId: null, message: data.message, queued: true };
  }
  throw new Error(data.message || `Login failed (${res.status})`);
}

export async function logout(userId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/session/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || `Logout failed (${res.status})`);
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${BASE_URL}/api/session/status`);
  if (!res.ok) throw new Error(`Status fetch failed (${res.status})`);
  return res.json();
}
