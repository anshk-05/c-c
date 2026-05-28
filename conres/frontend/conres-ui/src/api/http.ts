const RETRY_DELAYS_MS = [300, 900, 1800];

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => null);

      if (res.ok) {
        return data as T;
      }

      if (!isRetryableStatus(res.status) || attempt === RETRY_DELAYS_MS.length) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }

      lastError = err;

      if (attempt === RETRY_DELAYS_MS.length) {
        break;
      }
    }

    await wait(RETRY_DELAYS_MS[attempt]);
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
