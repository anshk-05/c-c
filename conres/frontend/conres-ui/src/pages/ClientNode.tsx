import { useEffect, useRef, useState } from 'react';
import ParticleCanvas from '../components/ParticleCanvas';
import { acquireRead, acquireWrite, releaseRead, releaseWrite, writeFile } from '../api/fileApi';
import { login, logout, sendHeartbeat } from '../api/sessionApi';
import { useSystemStatus } from '../hooks/useSystemStatus';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];
const CLIENT_SESSION_KEY = 'distres-client-node-session';

type ActionResult = { ok: boolean; msg: string } | null;

interface StoredClientSession {
  userId: number;
  username: string;
}

function userName(id: number) {
  return USERNAMES[id - 1] ?? `User ${id}`;
}

function readStoredSession(): StoredClientSession | null {
  try {
    const raw = window.localStorage.getItem(CLIENT_SESSION_KEY);
    return raw ? JSON.parse(raw) as StoredClientSession : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredClientSession | null) {
  if (session) {
    window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(CLIENT_SESSION_KEY);
  }
}

export default function ClientNode() {
  const { status, error, connectionState, lastRealtimeEvent, lastFileUpdate } = useSystemStatus();
  const storedSessionRef = useRef<StoredClientSession | null>(readStoredSession());
  const [selectedUser, setSelectedUser] = useState(storedSessionRef.current?.userId ?? 1);
  const [session, setSession] = useState<StoredClientSession | null>(storedSessionRef.current);
  const [password, setPassword] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [writeContent, setWriteContent] = useState('');
  const [writeEditorOpen, setWriteEditorOpen] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [pendingRead, setPendingRead] = useState(false);
  const [pendingWrite, setPendingWrite] = useState(false);
  const [submittingWrite, setSubmittingWrite] = useState(false);
  const readAbortRef = useRef<AbortController | null>(null);
  const writeAbortRef = useRef<AbortController | null>(null);

  const clientUserId = session?.userId ?? null;
  const isActive = clientUserId !== null && !!status?.activeUserIds.includes(clientUserId);
  const isWaiting = clientUserId !== null && !!status?.waitingUserIds.includes(clientUserId);
  const isReading = clientUserId !== null && !!status?.readingUserIds.includes(clientUserId);
  const isWriting = clientUserId !== null && status?.writingUserId === clientUserId;
  const readQueuePosition = clientUserId === null
    ? null
    : status?.fileQueue?.find((entry) => entry.userId === clientUserId && !entry.isWrite)?.position ?? null;
  const writeQueuePosition = clientUserId === null
    ? null
    : status?.fileQueue?.find((entry) => entry.userId === clientUserId && entry.isWrite)?.position ?? null;

  const realtimeColor =
    connectionState === 'connected'
      ? 'var(--accent-green)'
      : connectionState === 'reconnecting' || connectionState === 'connecting'
        ? 'var(--accent-amber)'
        : 'var(--accent-crimson)';

  const lockState = isWriting
    ? 'Write lock held'
    : isReading
      ? 'Read lock held'
      : pendingWrite
        ? writeQueuePosition
          ? `Queued for write #${writeQueuePosition}`
          : 'Waiting for write lock'
        : pendingRead
          ? readQueuePosition
            ? `Queued for read #${readQueuePosition}`
            : 'Waiting for read lock'
          : 'No file lock held';

  const sessionState = session
    ? isActive
      ? 'Active on server'
      : isWaiting
        ? 'Queued by server'
        : 'Session not active'
    : 'Not connected';

  useEffect(() => {
    if (!session) {
      return;
    }

    const heartbeatSession = session;
    let cancelled = false;

    async function pulse() {
      try {
        await sendHeartbeat(heartbeatSession.userId);
      } catch (err) {
        if (!cancelled && err instanceof Error && err.message.includes('Session not found')) {
          saveStoredSession(null);
          setSession(null);
          setResult({ ok: false, msg: 'Server session expired. Connect again.' });
        }
      }
    }

    void pulse();
    const id = window.setInterval(pulse, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session]);

  useEffect(() => {
    if (!isWriting) {
      setWriteEditorOpen(false);
    }
  }, [isWriting]);

  async function handleLogin() {
    const username = USERNAMES[selectedUser - 1];
    setLoginBusy(true);
    setResult(null);

    try {
      const response = await login(selectedUser, username, password);
      const nextSession = { userId: selectedUser, username };
      saveStoredSession(nextSession);
      setSession(nextSession);
      setPassword('');
      setResult({
        ok: true,
        msg: response.queued
          ? `${username} is queued by the server`
          : `${username} is connected to the server`,
      });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Login failed' });
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    if (!clientUserId) {
      return;
    }

    setLogoutBusy(true);
    setResult(null);

    try {
      readAbortRef.current?.abort();
      writeAbortRef.current?.abort();
      if (isReading) {
        await releaseRead(clientUserId);
      }
      if (isWriting) {
        await releaseWrite(clientUserId);
      }
      await logout(clientUserId);
      saveStoredSession(null);
      setSession(null);
      setFileContent(null);
      setWriteContent('');
      setWriteEditorOpen(false);
      setResult({ ok: true, msg: 'Client disconnected from the server' });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Logout failed' });
    } finally {
      setLogoutBusy(false);
    }
  }

  async function handleRead() {
    if (!clientUserId) {
      return;
    }

    if (pendingRead) {
      readAbortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    readAbortRef.current = controller;
    setPendingRead(true);
    setResult(null);

    try {
      const response = await acquireRead(clientUserId, controller.signal);
      setFileContent(response.content);
      setResult({ ok: true, msg: 'Read lock acquired and shared file loaded' });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setResult({ ok: false, msg: 'Read request cancelled' });
      } else {
        setResult({ ok: false, msg: err instanceof Error ? err.message : 'Read failed' });
      }
    } finally {
      setPendingRead(false);
      readAbortRef.current = null;
    }
  }

  async function handleReleaseRead() {
    if (!clientUserId) {
      return;
    }

    try {
      await releaseRead(clientUserId);
      setResult({ ok: true, msg: 'Read lock released' });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Release failed' });
    }
  }

  async function handleAcquireWrite() {
    if (!clientUserId) {
      return;
    }

    if (pendingWrite) {
      writeAbortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    writeAbortRef.current = controller;
    setPendingWrite(true);
    setResult(null);

    try {
      await acquireWrite(clientUserId, controller.signal);
      setWriteEditorOpen(true);
      setResult({ ok: true, msg: 'Write lock acquired' });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setResult({ ok: false, msg: 'Write request cancelled' });
      } else {
        setResult({ ok: false, msg: err instanceof Error ? err.message : 'Write lock request failed' });
      }
    } finally {
      setPendingWrite(false);
      writeAbortRef.current = null;
    }
  }

  async function handleReleaseWrite() {
    if (!clientUserId) {
      return;
    }

    try {
      await releaseWrite(clientUserId);
      setWriteEditorOpen(false);
      setResult({ ok: true, msg: 'Write lock released' });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Release failed' });
    }
  }

  async function handleSubmitWrite() {
    if (!clientUserId || !writeContent.trim()) {
      return;
    }

    setSubmittingWrite(true);
    setResult(null);

    try {
      await writeFile(clientUserId, writeContent.trim());
      setFileContent(writeContent.trim());
      setWriteContent('');
      setWriteEditorOpen(false);
      setResult({ ok: true, msg: 'Shared file updated on the server' });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Write failed' });
    } finally {
      setSubmittingWrite(false);
    }
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: `linear-gradient(rgba(10,10,15,0.82), rgba(10,10,15,0.94)), url('/gojo_vs_sukuna_domain_clash.png') center/cover no-repeat fixed`,
      }}
    >
      <ParticleCanvas />

      <div className="relative p-4 md:p-6 max-w-6xl mx-auto" style={{ zIndex: 1 }}>
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <a
              href="/"
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold mb-3"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Server Monitor
            </a>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(90deg, var(--accent-green), var(--accent-blue), var(--accent-purple))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              DistRes Client Node
            </h1>
            <p className="mt-1 max-w-2xl text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
              Independent browser client for login, shared file access, lock requests, and realtime update notifications.
            </p>
          </div>

          <div
            className="rounded-lg px-4 py-3 text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${realtimeColor}`,
              color: realtimeColor,
            }}
          >
            <div className="capitalize">Pub-sub channel {connectionState}</div>
            {lastRealtimeEvent && (
              <div style={{ color: 'var(--text-secondary)' }}>Last event: {lastRealtimeEvent}</div>
            )}
          </div>
        </header>

        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid var(--accent-crimson)',
              color: 'var(--accent-crimson)',
            }}
          >
            Backend unreachable: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <section className="panel lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--accent-blue)' }}>
              Client Session
            </h2>

            {!session ? (
              <>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Client Identity
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {USERNAMES.map((name, index) => {
                    const id = index + 1;
                    const selected = selectedUser === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedUser(id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
                        style={{
                          background: selected ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                          color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        }}
                      >
                        {name} <span className="text-xs opacity-60">#{id}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  autoComplete="current-password"
                />

                <button
                  onClick={handleLogin}
                  disabled={loginBusy || !password.trim()}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(59,130,246,0.2)',
                    border: '1px solid var(--accent-blue)',
                    color: 'var(--accent-blue)',
                  }}
                >
                  {loginBusy ? 'Connecting...' : 'Connect to Server'}
                </button>
              </>
            ) : (
              <>
                <div
                  className="rounded-lg px-4 py-3 mb-4"
                  style={{
                    background: isActive ? 'rgba(16,185,129,0.12)' : isWaiting ? 'rgba(245,158,11,0.12)' : 'rgba(220,38,38,0.1)',
                    border: `1px solid ${isActive ? 'var(--accent-green)' : isWaiting ? 'var(--accent-amber)' : 'var(--accent-crimson)'}`,
                  }}
                >
                  <div className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {session.username} <span className="text-xs opacity-60">#{session.userId}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: isActive ? 'var(--accent-green)' : isWaiting ? 'var(--accent-amber)' : 'var(--accent-crimson)' }}>
                    {sessionState}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={logoutBusy}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(220,38,38,0.15)',
                    border: '1px solid var(--accent-crimson)',
                    color: 'var(--accent-crimson)',
                  }}
                >
                  {logoutBusy ? 'Disconnecting...' : 'Disconnect Client'}
                </button>
              </>
            )}

            {result && (
              <div
                className="mt-4 rounded-lg px-3 py-2 text-xs"
                style={{
                  background: result.ok ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)',
                  border: `1px solid ${result.ok ? 'rgba(16,185,129,0.35)' : 'rgba(220,38,38,0.35)'}`,
                  color: result.ok ? 'var(--accent-green)' : 'var(--accent-crimson)',
                }}
              >
                {result.msg}
              </div>
            )}
          </section>

          <section className="panel lg:col-span-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--accent-purple)' }}>
                  Shared File Access
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {status?.fileName ?? 'ProductSpecification.txt'} - {lockState}
                </p>
              </div>

              {status && (
                <div className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                  <div>Version <strong style={{ color: 'var(--accent-amber)' }}>{status.fileVersion || 1}</strong></div>
                  <div>
                    Server writer:{' '}
                    <strong style={{ color: status.writingUserId ? 'var(--accent-crimson)' : 'var(--text-secondary)' }}>
                      {status.writingUserId ? userName(status.writingUserId) : 'none'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {lastFileUpdate && (
              <div
                className="mb-4 rounded-lg px-3 py-2 text-xs"
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.35)',
                  color: 'var(--accent-green)',
                }}
              >
                File update received from {userName(lastFileUpdate.userId)} - version {lastFileUpdate.fileVersion}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {isReading ? (
                <button
                  onClick={handleReleaseRead}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid var(--accent-amber)',
                    color: 'var(--accent-amber)',
                  }}
                >
                  Release Read Lock
                </button>
              ) : (
                <button
                  onClick={handleRead}
                  disabled={!isActive || isWriting}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid var(--accent-green)',
                    color: 'var(--accent-green)',
                  }}
                >
                  {pendingRead ? 'Cancel Read Request' : 'Read Shared File'}
                </button>
              )}

              {isWriting ? (
                <button
                  onClick={handleReleaseWrite}
                  disabled={submittingWrite}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid var(--accent-amber)',
                    color: 'var(--accent-amber)',
                  }}
                >
                  Release Write Lock
                </button>
              ) : (
                <button
                  onClick={handleAcquireWrite}
                  disabled={!isActive || isReading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(220,38,38,0.14)',
                    border: '1px solid var(--accent-crimson)',
                    color: 'var(--accent-crimson)',
                  }}
                >
                  {pendingWrite ? 'Cancel Write Request' : 'Request Write Lock'}
                </button>
              )}
            </div>

            {writeEditorOpen && isWriting && (
              <div
                className="mb-4 rounded-lg p-3"
                style={{
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.35)',
                }}
              >
                <textarea
                  value={writeContent}
                  onChange={(event) => setWriteContent(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg p-3 text-sm outline-none resize-y"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(220,38,38,0.35)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Enter replacement content for the shared file..."
                />
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={handleReleaseWrite}
                    disabled={submittingWrite}
                    className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitWrite}
                    disabled={submittingWrite || !writeContent.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(220,38,38,0.18)',
                      border: '1px solid var(--accent-crimson)',
                      color: 'var(--accent-crimson)',
                    }}
                  >
                    {submittingWrite ? 'Writing...' : 'Write to Server'}
                  </button>
                </div>
              </div>
            )}

            <div
              className="rounded-lg p-4 font-mono text-sm overflow-auto"
              style={{
                minHeight: '240px',
                background: 'rgba(0,0,0,0.42)',
                border: '1px solid rgba(210,180,140,0.12)',
                color: 'rgba(245,222,179,0.85)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {fileContent ?? (
                <span style={{ color: 'var(--text-secondary)', opacity: 0.65 }}>
                  No shared file content loaded in this client.
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
