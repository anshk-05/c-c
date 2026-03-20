import { useRef, useState } from 'react';
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
  const { activeUserIds, readingUserIds, writingUserId, fileQueue } = status;


  const [formOpenId, setFormOpenId] = useState<number | null>(null);
  const [writeContent, setWriteContent] = useState<Record<number, string>>({});
  const [opResult, setOpResult] = useState<Record<number, { ok: boolean; msg: string }>>({});

  const [pendingReadIds, setPendingReadIds] = useState<Set<number>>(new Set());
  const [pendingWriteIds, setPendingWriteIds] = useState<Set<number>>(new Set());
  // Per-user AbortControllers so we can cancel in-flight requests
  const abortControllersRef = useRef<Record<number, AbortController>>({});

  // Users currently submitting file content (writeFile call)
  const [submittingIds, setSubmittingIds] = useState<Set<number>>(new Set());

  function setResult(id: number, result: { ok: boolean; msg: string }) {
    setOpResult((prev) => ({ ...prev, [id]: result }));
    setTimeout(
      () => setOpResult((prev) => { const n = { ...prev }; delete n[id]; return n; }),
      4000,
    );
  }

  function queuePosition(id: number, isWrite: boolean): number | null {
    const entry = fileQueue?.find((q) => q.userId === id && q.isWrite === isWrite);
    return entry ? entry.position : null;
  }

  async function handleRead(id: number) {
    if (pendingReadIds.has(id)) {
      abortControllersRef.current[id]?.abort();
      return;
    }

    const controller = new AbortController();
    abortControllersRef.current[id] = controller;
    setPendingReadIds((prev) => new Set([...prev, id]));

    try {
      const res = await acquireRead(id, controller.signal);
      onScrollRead(res.content);
      setResult(id, { ok: true, msg: 'Reading…' });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setResult(id, { ok: false, msg: 'Read request cancelled' });
      } else {
        setResult(id, { ok: false, msg: e instanceof Error ? e.message : 'Read failed' });
      }
    } finally {
      setPendingReadIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
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

  async function handleToggleWrite(id: number) {
    if (formOpenId === id) {
      try { await releaseWrite(id); } catch { /* ignore */ }
      setFormOpenId(null);
      return;
    }

    if (pendingWriteIds.has(id)) {
      abortControllersRef.current[id]?.abort();
      return;
    }

    const controller = new AbortController();
    abortControllersRef.current[id] = controller;
    setPendingWriteIds((prev) => new Set([...prev, id]));

    try {
      await acquireWrite(id, controller.signal);
      setFormOpenId(id);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setResult(id, { ok: false, msg: 'Write request cancelled' });
      } else {
        setResult(id, { ok: false, msg: e instanceof Error ? e.message : 'Could not acquire write lock' });
      }
    } finally {
      setPendingWriteIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleWrite(id: number) {
    const content = writeContent[id]?.trim();
    if (!content) return;
    setSubmittingIds((prev) => new Set([...prev, id]));
    try {
      await writeFile(id, content);
      setResult(id, { ok: true, msg: 'Write complete' });
      onScrollRead(content);
      setWriteContent((prev) => ({ ...prev, [id]: '' }));
      setFormOpenId(null);
    } catch (e) {
      setResult(id, { ok: false, msg: e instanceof Error ? e.message : 'Write failed' });
    } finally {
      setSubmittingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function cardState(id: number): 'writer' | 'reader' | 'pendingRead' | 'pendingWrite' | 'idle' {
    if (id === writingUserId) return 'writer';
    if (readingUserIds.includes(id)) return 'reader';
    if (pendingReadIds.has(id)) return 'pendingRead';
    if (pendingWriteIds.has(id)) return 'pendingWrite';
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
            const isPendingRead = state === 'pendingRead';
            const isPendingWrite = state === 'pendingWrite';
            const isWriteOpen = formOpenId === id;
            const isSubmitting = submittingIds.has(id);
            const result = opResult[id];
            const readQueuePos = queuePosition(id, false);
            const writeQueuePos = queuePosition(id, true);

            const cardBg = isWriter
              ? 'rgba(220,38,38,0.15)'
              : isReader
              ? 'rgba(59,130,246,0.12)'
              : isPendingRead || isPendingWrite
              ? 'rgba(245,158,11,0.08)'
              : 'rgba(255,255,255,0.04)';

            const cardBorder = isWriter
              ? 'var(--accent-crimson)'
              : isReader
              ? 'var(--accent-blue)'
              : isPendingRead || isPendingWrite
              ? 'var(--accent-amber)'
              : 'var(--border-subtle)';

            const cardGlow = isWriter ? 'pulse-crimson' : isReader ? 'glow-blue' : '';

            // Status line text
            const statusText = isWriter
              ? '✍ writing…'
              : isReader
              ? 'reading…'
              : isPendingRead
              ? readQueuePos
                ? `⌛ queued for read — #${readQueuePos}`
                : '⌛ waiting for read lock…'
              : isPendingWrite
              ? writeQueuePos
                ? `⌛ queued for write — #${writeQueuePos}`
                : '⌛ waiting for write lock…'
              : 'idle';

            return (
              <div key={id}>
                <div
                  className={`rounded-lg px-4 py-3 ${cardGlow}`}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderBottomLeftRadius: isWriteOpen ? 0 : undefined,
                    borderBottomRightRadius: isWriteOpen ? 0 : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: isWriter
                          ? 'rgba(220,38,38,0.3)'
                          : isReader
                          ? 'rgba(59,130,246,0.3)'
                          : isPendingRead || isPendingWrite
                          ? 'rgba(245,158,11,0.25)'
                          : 'rgba(124,58,237,0.2)',
                        color: isWriter
                          ? 'var(--accent-crimson)'
                          : isReader
                          ? 'var(--accent-blue)'
                          : isPendingRead || isPendingWrite
                          ? 'var(--accent-amber)'
                          : 'var(--accent-purple)',
                      }}
                    >
                      {id}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                        {userName(id)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {statusText}
                        {result && (
                          <span
                            className="ml-2"
                            style={{ color: result.ok ? 'var(--accent-green)' : 'var(--accent-crimson)' }}
                          >
                            {result.ok ? '✓' : '✗'} {result.msg}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Read / Stop Reading / Cancel read queue */}
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
                      ) : isPendingRead ? (
                        <button
                          onClick={() => handleRead(id)}
                          className={btnSm}
                          style={{
                            background: 'rgba(245,158,11,0.15)',
                            border: '1px solid var(--accent-amber)',
                            color: 'var(--accent-amber)',
                          }}
                        >
                          ⌛ Waiting… ✕
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRead(id)}
                          disabled={isWriter}
                          className={btnSm}
                          style={{
                            background: 'rgba(16,185,129,0.15)',
                            border: '1px solid var(--accent-green)',
                            color: 'var(--accent-green)',
                          }}
                        >
                          Read
                        </button>
                      )}

                      {/* Write / Cancel write queue / Cancel form */}
                      {isPendingWrite ? (
                        <button
                          onClick={() => handleToggleWrite(id)}
                          className={btnSm}
                          style={{
                            background: 'rgba(245,158,11,0.15)',
                            border: '1px solid var(--accent-amber)',
                            color: 'var(--accent-amber)',
                          }}
                        >
                          ⌛ Waiting… ✕
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleWrite(id)}
                          disabled={isSubmitting || isReader}
                          className={btnSm}
                          style={{
                            background: isWriteOpen ? 'rgba(220,38,38,0.25)' : 'rgba(220,38,38,0.12)',
                            border: `1px solid ${isWriteOpen ? 'var(--accent-crimson)' : 'rgba(220,38,38,0.4)'}`,
                            color: 'var(--accent-crimson)',
                          }}
                        >
                          {isWriteOpen ? '✕ Cancel' : 'Write'}
                        </button>
                      )}
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
                      disabled={isSubmitting || !writeContent[id]?.trim()}
                      className={btnSm}
                      style={{
                        background: 'rgba(220,38,38,0.2)',
                        border: '1px solid var(--accent-crimson)',
                        color: 'var(--accent-crimson)',
                      }}
                    >
                      {isSubmitting ? 'Writing…' : 'Submit'}
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
