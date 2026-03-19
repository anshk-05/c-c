import type { SystemStatus } from '../types';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

function userName(id: number) {
  return USERNAMES[id - 1] ?? `User ${id}`;
}

interface Props {
  status: SystemStatus;
}

export default function ScrollStatus({ status }: Props) {
  const { readingUserIds, writingUserId, fileName } = status;
  const hasReaders = readingUserIds.length > 0;
  const hasWriter = writingUserId !== null;

  return (
    <div className="panel h-full">
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--accent-purple)' }}>
        Scroll Access
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {fileName || 'ProductSpecification.txt'} · Reader-Writer Lock
      </p>

      {/* Lock state indicator */}
      <div
        className="rounded-lg px-4 py-2 mb-4 text-center text-sm font-semibold"
        style={{
          background: hasWriter
            ? 'rgba(220,38,38,0.15)'
            : hasReaders
            ? 'rgba(59,130,246,0.12)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasWriter ? 'var(--accent-crimson)' : hasReaders ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
          color: hasWriter ? 'var(--accent-crimson)' : hasReaders ? 'var(--accent-blue)' : 'var(--text-secondary)',
        }}
      >
        {hasWriter
          ? 'WRITE LOCK Exclusive access'
          : hasReaders
          ? 'READ LOCK Shared access'
          : 'UNLOCKED No active access'}
      </div>

      {/* Readers */}
      <div className="mb-3">
        <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Readers ({readingUserIds.length})
        </div>
        {readingUserIds.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>None currently reading.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {readingUserIds.map((id) => (
              <div
                key={id}
                className="glow-blue rounded-lg px-3 py-1 text-sm"
                style={{
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid var(--accent-blue)',
                  color: 'var(--accent-blue)',
                }}
              >
                {userName(id)} <span className="text-xs opacity-60">#{id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Writer */}
      <div>
        <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Writer
        </div>
        {writingUserId === null ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No active writer.</p>
        ) : (
          <div
            className="pulse-crimson rounded-lg px-3 py-2 text-sm inline-block"
            style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid var(--accent-crimson)',
              color: 'var(--accent-crimson)',
            }}
          >
            ✍ {userName(writingUserId)} <span className="text-xs opacity-60">#{writingUserId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
