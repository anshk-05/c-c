import type { RealtimeFileUpdated } from '../api/realtimeApi';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

function userName(id: number) {
  return USERNAMES[id - 1] ?? `User ${id}`;
}

interface Props {
  content: string | null;
  error: string | null;
  lastFileUpdate: RealtimeFileUpdated | null;
}

export default function ScrollViewer({ content, error, lastFileUpdate }: Props) {
  const updateTime = lastFileUpdate
    ? new Date(lastFileUpdate.updatedAtUtc).toLocaleTimeString()
    : null;

  return (
    <div className="panel parchment h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-amber)' }}>
        Scroll Contents
      </h2>

      {lastFileUpdate && (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-xs"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.35)',
            color: 'var(--accent-green)',
          }}
        >
          Update propagated from <strong className="capitalize">{userName(lastFileUpdate.userId)}</strong>
          {' '}· version {lastFileUpdate.fileVersion}
          {updateTime && <> · {updateTime}</>}
        </div>
      )}

      <div
        className="flex-1 rounded-lg p-4 font-mono text-sm overflow-auto"
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(210,180,140,0.12)',
          color: 'var(--text-secondary)',
          minHeight: '160px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {error ? (
          <span style={{ color: 'var(--accent-crimson)' }}>⚠ {error}</span>
        ) : content !== null ? (
          <span style={{ color: 'rgba(245,222,179,0.85)' }}>{content}</span>
        ) : (
          <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
            Use the controls below to read the scroll.
          </span>
        )}
      </div>
    </div>
  );
}
