import type { SystemStatus } from '../types';
import { requestJson } from './http';

const BASE_URL = 'http://localhost:5044';

export async function login(
  userId: number,
  username: string,
  password: string,
): Promise<{ userId: number | null; message: string; queued: boolean }> {
  const data = await requestJson<{ session?: { userId: number }; message: string }>(
    `${BASE_URL}/api/session/login`,
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, username, password }),
    },
  );

  return { userId: data.session?.userId ?? null, message: data.message, queued: data.session === undefined };
}

export async function logout(userId: number): Promise<void> {
  await requestJson<{ message: string }>(`${BASE_URL}/api/session/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return requestJson<SystemStatus>(`${BASE_URL}/api/session/status`);
}

export async function sendHeartbeat(userId: number): Promise<void> {
  await requestJson<{ message: string }>(`${BASE_URL}/api/session/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}
