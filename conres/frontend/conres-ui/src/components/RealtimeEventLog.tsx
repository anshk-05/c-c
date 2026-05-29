import type { RealtimeEventLogEntry } from '../hooks/useSystemStatus';

interface Props {
  events: RealtimeEventLogEntry[];
}

export default function RealtimeEventLog({ events }: Props) {
  return (
    <section className="panel h-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--accent-green)' }}>
            Pub-Sub Event Log
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            SignalR broker events received by this server monitor
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.35)',
            color: 'var(--accent-green)',
          }}
        >
          live
        </span>
      </div>

      <div
        className="rounded-lg p-3 font-mono text-xs"
        style={{
          minHeight: '220px',
          maxHeight: '280px',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.48)',
          border: '1px solid rgba(16,185,129,0.25)',
          color: 'rgba(220,252,231,0.92)',
        }}
      >
        {events.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>
            $ waiting for broker events...
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="mb-2 last:mb-0">
              <span style={{ color: 'var(--accent-amber)' }}>
                [{new Date(event.occurredAt).toLocaleTimeString()}]
              </span>{' '}
              <span style={{ color: 'var(--accent-blue)' }}>
                {event.eventName}
              </span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                - {event.detail}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
