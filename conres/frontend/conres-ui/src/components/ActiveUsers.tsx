import { useState } from 'react';
import type { SystemStatus } from '../types';
import { acquireRead, releaseRead, writeFile, acquireWrite, releaseWrite } from '../api/fileApi';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

function userName(id: number) {
  return USERNAMES[id - 1] ?? `User ${id}`;
}

interface Props {
  status: SystemStatus;
  onScrollRead: (content: string) => void;
  onScrollError: (msg: string) => void;
}

export default function ActiveUsers({ status, onScrollRead }: Props) {
  const { activeUserIds, readingUserIds, writingUserId } = status;

  // Per-user busy state, write content, and last result
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  // Only one user can have the write panel open at a time (frontend write-intent lock)
  const [formOpenId, setFormOpenId] = useState<number | null>(null);
  const [writeContent, setWriteContent] = useState<Record<number, string>>({});
  const [opResult, setOpResult] = useState<Record<number, { ok: boolean; msg: string }>>({});

  function setUserBusy(id: number, val: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function handleToggleWrite(id: number) {
    // Cancel: release the write lock and close the panel
    if (formOpenId === id) {
      try { await releaseWrite(id); } catch { /* ignore */ }
      setFormOpenId(null);
      return;
    }
    // Already locked by someone else (reflected in status)
    if (writingUserId !== null) {
      setResult(id, { ok: false, msg: `File is write-locked — ${userName(writingUserId)} is writing` });
      return;
    }
    if (formOpenId !== null) {
      setResult(id, { ok: false, msg: `File is write-locked — ${userName(formOpenId)} has the write panel open` });
      return;
    }
    // Try to acquire the write lock from the backend
    setUserBusy(id, true);
    try {
      await acquireWrite(id);
      setFormOpenId(id);
    } catch (e) {
      setResult(id, { ok: false, msg: e instanceof Error ? e.message : 'Could not acquire write lock' });
    } finally {
      setUserBusy(id, false);
    }
  }

  function setResult(id: number, result: { ok: boolean; msg: string }) {
    setOpResult((prev) => ({ ...prev, [id]: result }));
    // Auto-clear after 4 s
    setTimeout(() => setOpResult((prev) => { const n = { ...prev }; delete n[id]; return n; }), 4000);
  }

  async function handleRead(id: number) {
    // Fail fast on the frontend if write lock is known to be held
    if (writingUserId !== null) {
      setResult(id, { ok: false, msg: `File is write-locked — ${userName(writingUserId)} is writing` });
      return;
    }
    setUserBusy(id, true);
    try {
      const res = await acquireRead(id);
      onScrollRead(res.content);
      setResult(id, { ok: true, msg: 'Reading…' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Read failed';
      setResult(id, { ok: false, msg });
    } finally {
      setUserBusy(id, false);
    }
  }

  async function handleStopReading(id: number) {
    try {
      await releaseRead(id);
      setResult(id, { ok: true, msg: 'Lock released' });
    } catch (e) {
      setResult(id, { ok: false, msg: e instanceof Error ? e.message : 'Release failed' });
    }
  }

  async function handleWrite(id: number) {
    const content = writeContent[id]?.trim();
    if (!content) return;
    setUserBusy(id, true);
    try {
      await writeFile(id, content);
      setResult(id, { ok: true, msg: 'Write complete' });
      onScrollRead(content);
      setWriteContent((prev) => ({ ...prev, [id]: '' }));
      setFormOpenId(null);
    } catch (e) {
      setResult(id, { ok: false, msg: e instanceof Error ? e.message : 'Write failed' });
    } finally {
      setUserBusy(id, false);
    }
  }

  function cardState(id: number): 'writer' | 'reader' | 'idle' {
    if (id === writingUserId) return 'writer';
    if (readingUserIds.includes(id)) return 'reader';
    return 'idle';
  }

  const btnSm = 'px-3 py-1 rounded-md text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="panel h-full">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-blue)' }}>
        Active Sorcerers
      </h2>
      {activeUserIds.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No sorcerers are active. Login one below.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {activeUserIds.map((id) => {
            const state = cardState(id);
            const isWriter = state === 'writer';
            const isReader = state === 'reader';
            const isBusy = busyIds.has(id);
            const isWriteOpen = formOpenId === id;
            const result = opResult[id];

            return (
              <div key={id}>
                <div
                  className={`rounded-lg px-4 py-3 ${isWriter ? 'pulse-crimson' : isReader ? 'glow-blue' : ''}`}
                  style={{
                    background: isWriter
                      ? 'rgba(220,38,38,0.15)'
                      : isReader
                      ? 'rgba(59,130,246,0.12)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isWriter ? 'var(--accent-crimson)' : isReader ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    borderBottomLeftRadius: isWriteOpen ? 0 : undefined,
                    borderBottomRightRadius: isWriteOpen ? 0 : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: isWriter ? 'rgba(220,38,38,0.3)' : isReader ? 'rgba(59,130,246,0.3)' : 'rgba(124,58,237,0.2)',
                        color: isWriter ? 'var(--accent-crimson)' : isReader ? 'var(--accent-blue)' : 'var(--accent-purple)',
                      }}
                    >
                      {id}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                        {userName(id)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {isWriter ? '✍ writing…' : isReader ? 'reading…' : 'idle'}
                        {result && (
                          <span className="ml-2" style={{ color: result.ok ? 'var(--accent-green)' : 'var(--accent-crimson)' }}>
                            {result.ok ? '✓' : '✗'} {result.msg}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Read / Stop Reading */}
                      {isReader ? (
                        <button
                          onClick={() => handleStopReading(id)}
                          className={btnSm}
                          style={{
                            background: 'rgba(245,158,11,0.2)',
                            border: '1px solid var(--accent-amber)',
                            color: 'var(--accent-amber)',
                          }}
                        >
                          ■ Stop Reading
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRead(id)}
                          disabled={isBusy}
                          className={btnSm}
                          style={{
                            background: 'rgba(16,185,129,0.15)',
                            border: '1px solid var(--accent-green)',
                            color: 'var(--accent-green)',
                          }}
                        >
                          {isBusy && !isWriteOpen ? '⏳' : 'Read'}
                        </button>
                      )}
                      {/* Write — clicking when locked shows an inline message instead of opening a form */}
                      <button
                        onClick={() => handleToggleWrite(id)}
                        disabled={isBusy}
                        className={btnSm}
                        style={{
                          background: isWriteOpen ? 'rgba(220,38,38,0.25)' : 'rgba(220,38,38,0.12)',
                          border: `1px solid ${isWriteOpen ? 'var(--accent-crimson)' : 'rgba(220,38,38,0.4)'}`,
                          color: 'var(--accent-crimson)',
                        }}
                      >
                        {isBusy && isWriteOpen ? '⏳' : isWriteOpen ? '✕ Cancel' : (writingUserId !== null || (formOpenId !== null && formOpenId !== id)) ? '🔒 Write' : 'Write'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline write panel */}
                {isWriteOpen && (
                  <div
                    className="flex gap-2 px-4 py-3 rounded-b-lg"
                    style={{
                      background: 'rgba(220,38,38,0.08)',
                      border: '1px solid var(--accent-crimson)',
                      borderTop: 'none',
                    }}
                  >
                    <input
                      type="text"
                      value={writeContent[id] ?? ''}
                      onChange={(e) => setWriteContent((prev) => ({ ...prev, [id]: e.target.value }))}
                      placeholder="New scroll content…"
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-md text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(220,38,38,0.3)',
                        color: 'var(--text-primary)',
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleWrite(id)}
                    />
                    <button
                      onClick={() => handleWrite(id)}
                      disabled={isBusy || !writeContent[id]?.trim()}
                      className={btnSm}
                      style={{
                        background: 'rgba(220,38,38,0.2)',
                        border: '1px solid var(--accent-crimson)',
                        color: 'var(--accent-crimson)',
                      }}
                    >
                      {isBusy ? 'Writing…' : 'Submit'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
