import type { SystemStatus } from '../types';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

function userName(id: number) {
  return USERNAMES[id - 1] ?? `User ${id}`;
}

interface Props {
  status: SystemStatus;
}

export default function ClientNodeMonitor({ status }: Props) {
  const { activeUserIds, readingUserIds, writingUserId, fileQueue } = status;

  function clientState(id: number) {
    const queuedRead = fileQueue?.find((entry) => entry.userId === id && !entry.isWrite);
    const queuedWrite = fileQueue?.find((entry) => entry.userId === id && entry.isWrite);

    if (writingUserId === id) {
      return { label: 'Writing', color: 'var(--accent-crimson)', background: 'rgba(220,38,38,0.14)' };
    }

    if (readingUserIds.includes(id)) {
      return { label: 'Reading', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.12)' };
    }

    if (queuedWrite) {
      return { label: `Queued write #${queuedWrite.position}`, color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)' };
    }

    if (queuedRead) {
      return { label: `Queued read #${queuedRead.position}`, color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)' };
    }

    return { label: 'Connected', color: 'var(--accent-green)', background: 'rgba(16,185,129,0.1)' };
  }

  return (
    <div className="panel h-full">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-blue)' }}>
        Connected Client Nodes
      </h2>

      {activeUserIds.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No client nodes are currently connected.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {activeUserIds.map((id) => {
            const state = clientState(id);

            return (
              <div
                key={id}
                className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                style={{
                  background: state.background,
                  border: `1px solid ${state.color}`,
                }}
              >
                <div className="min-w-0">
                  <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {userName(id)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Client ID #{id}
                  </div>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: 'rgba(0,0,0,0.18)',
                    color: state.color,
                  }}
                >
                  {state.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
