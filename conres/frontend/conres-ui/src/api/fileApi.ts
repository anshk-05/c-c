const BASE_URL = 'http://localhost:5044';

export async function acquireRead(
  userId: number,
  signal?: AbortSignal,
): Promise<{ content: string; message: string }> {
  const res = await fetch(`${BASE_URL}/api/file/acquireRead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Read failed (${res.status})`);
  return data;
}

export async function releaseRead(userId: number): Promise<void> {
  await fetch(`${BASE_URL}/api/file/releaseRead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function acquireWrite(
  userId: number,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/file/acquireWrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Acquire write failed (${res.status})`);
  return data;
}

export async function releaseWrite(userId: number): Promise<void> {
  await fetch(`${BASE_URL}/api/file/releaseWrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function writeFile(userId: number, content: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/file/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Write failed (${res.status})`);
  }
}

export async function getFileStatus(): Promise<{
  readingUserIds: number[];
  writingUserId: number | null;
  fileName: string;
}> {
  const res = await fetch(`${BASE_URL}/api/file/status`);
  if (!res.ok) throw new Error(`File status fetch failed (${res.status})`);
  return res.json();
}
