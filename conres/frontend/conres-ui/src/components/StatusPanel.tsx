import type { SystemStatus } from '../types';

interface Props {
  status: SystemStatus;
}

export default function StatusPanel({ status }: Props) {
  const { maxConcurrentUsers, availableSlots, activeUserIds } = status;
  const usedSlots = maxConcurrentUsers - availableSlots;
  const fillPct = (usedSlots / maxConcurrentUsers) * 100;
  const isFull = availableSlots === 0;

  return (
    <div className="panel mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--accent-purple)' }}>
          ⚡ Barrier Capacity
        </h2>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {usedSlots} / {maxConcurrentUsers} sorcerers active
        </span>
      </div>

      <div className="gauge-track h-4 mb-3">
        <div
          className="gauge-fill h-4"
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="flex gap-4 text-sm">
        {Array.from({ length: maxConcurrentUsers }).map((_, i) => {
          const occupied = i < usedSlots;
          return (
            <div
              key={i}
              className="flex-1 rounded-lg py-2 text-center font-mono text-xs"
              style={{
                background: occupied ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${occupied ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                color: occupied ? 'var(--accent-blue)' : 'var(--text-secondary)',
                boxShadow: occupied ? '0 0 8px var(--glow-purple)' : 'none',
              }}
            >
              {occupied ? '◈ SLOT' : '○ OPEN'}
            </div>
          );
        })}
      </div>

      {isFull && (
        <div
          className="mt-3 rounded-lg py-2 px-4 text-center font-bold text-sm pulse-amber"
          style={{
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid var(--accent-amber)',
            color: 'var(--accent-amber)',
          }}
        >
          ⚠ BARRIER FULL — Incoming sorcerers are queued
        </div>
      )}

      <div className="mt-3 flex gap-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Active: <strong style={{ color: 'var(--accent-blue)' }}>{activeUserIds.length}</strong></span>
        <span>Waiting: <strong style={{ color: 'var(--accent-amber)' }}>{status.waitingUserIds.length}</strong></span>
        <span>Available slots: <strong style={{ color: 'var(--accent-green)' }}>{availableSlots}</strong></span>
        <span>Readers: <strong style={{ color: 'var(--accent-blue)' }}>{status.readingUserIds.length}</strong></span>
        <span>Writer: <strong style={{ color: status.writingUserId ? 'var(--accent-crimson)' : 'var(--text-secondary)' }}>
          {status.writingUserId ? 'YES' : 'none'}
        </strong></span>
      </div>
    </div>
  );
}
