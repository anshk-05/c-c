import type { SystemStatus } from '../types';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

function userName(id: number) {
  return USERNAMES[id - 1] ?? `User ${id}`;
}

interface Props {
  status: SystemStatus;
}

export default function WaitingUsers({ status }: Props) {
  const { waitingUserIds } = status;

  return (
    <div className="panel h-full">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-amber)' }}>
        Queued Sorcerers
      </h2>
      {waitingUserIds.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Queue is empty.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {waitingUserIds.map((id, idx) => (
            <div
              key={id}
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'rgba(245,158,11,0.2)',
                    color: 'var(--accent-amber)',
                  }}
                >
                  #{idx + 1}
                </div>
                <div>
                  <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {userName(id)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    ID #{id} · position {idx + 1}
                  </div>
                </div>
              </div>
              <div
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: 'var(--accent-amber)',
                }}
              >
                ⏸ WAITING
              </div>
            </div>
          ))}
        </div>
      )}
      {waitingUserIds.length > 0 && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Will enter when a slot opens (FIFO queue)
        </p>
      )}
    </div>
  );
}
