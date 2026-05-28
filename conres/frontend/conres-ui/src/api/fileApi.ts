import { requestJson } from './http';

const BASE_URL = 'http://localhost:5044';

export async function acquireRead(
  userId: number,
  signal?: AbortSignal,
): Promise<{ content: string; message: string }> {
  return requestJson<{ content: string; message: string }>(`${BASE_URL}/api/file/acquireRead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    signal,
  });
}

export async function releaseRead(userId: number): Promise<void> {
  await requestJson<{ message: string }>(`${BASE_URL}/api/file/releaseRead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function acquireWrite(
  userId: number,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(`${BASE_URL}/api/file/acquireWrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    signal,
  });
}

export async function releaseWrite(userId: number): Promise<void> {
  await requestJson<{ message: string }>(`${BASE_URL}/api/file/releaseWrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function writeFile(userId: number, content: string): Promise<void> {
  await requestJson<{ message: string }>(`${BASE_URL}/api/file/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content }),
  });
}

export async function getFileStatus(): Promise<{
  readingUserIds: number[];
  writingUserId: number | null;
  fileName: string;
  fileVersion: number;
  lastUpdatedUtc: string;
  lastUpdatedByUserId: number | null;
}> {
  return requestJson(`${BASE_URL}/api/file/status`);
}
