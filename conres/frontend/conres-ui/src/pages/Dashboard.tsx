import { useCallback, useEffect, useState } from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import ParticleCanvas from '../components/ParticleCanvas';
import StatusPanel from '../components/StatusPanel';
import ClientNodeMonitor from '../components/ClientNodeMonitor';
import WaitingUsers from '../components/WaitingUsers';
import ScrollStatus from '../components/ScrollStatus';
import ScrollViewer from '../components/ScrollViewer';
import { getSharedFileContent } from '../api/fileApi';

export default function Dashboard() {
  const { status, error, connectionState, lastRealtimeEvent, lastFileUpdate } = useSystemStatus();
  const [scrollContent, setScrollContent] = useState<string | null>(null);
  const [scrollError, setScrollError] = useState<string | null>(null);

  const refreshSharedFile = useCallback(async () => {
    try {
      const snapshot = await getSharedFileContent();
      setScrollContent(snapshot.content);
      setScrollError(null);
    } catch (err) {
      setScrollError(err instanceof Error ? err.message : 'Failed to load shared file');
    }
  }, []);

  useEffect(() => {
    void refreshSharedFile();
    const id = window.setInterval(refreshSharedFile, 10000);

    return () => window.clearInterval(id);
  }, [refreshSharedFile]);

  useEffect(() => {
    void refreshSharedFile();
  }, [lastFileUpdate, status?.fileVersion, refreshSharedFile]);

  const realtimeColor =
    connectionState === 'connected'
      ? 'var(--accent-green)'
      : connectionState === 'reconnecting' || connectionState === 'connecting'
        ? 'var(--accent-amber)'
        : 'var(--accent-crimson)';

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: `linear-gradient(rgba(10,10,15,0.85), rgba(10,10,15,0.92)), url('/gojo_vs_sukuna_domain_clash.png') center/cover no-repeat fixed`,
      }}
    >
      <ParticleCanvas />

      <div className="relative p-4 md:p-6 max-w-7xl mx-auto" style={{ zIndex: 1 }}>
        <header className="mb-6 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-1"
            style={{
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple), var(--accent-crimson))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            DistRes Server Monitor
          </h1>

          <p className="mx-auto max-w-3xl text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
            Central server node for client sessions, shared resource locks, and publish-subscribe events.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
            {[
              'Server Node',
              'HTTP API Coordination',
              'SignalR Pub-Sub Hub',
              'SQLite User Store',
              'Shared File: ProductSpecification.txt',
            ].map((label) => (
              <span
                key={label}
                className="rounded-full px-3 py-1"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          <div
            className="mt-2 inline-flex flex-wrap items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${realtimeColor}`,
              color: realtimeColor,
            }}
          >
            <span className="capitalize">Pub-sub channel {connectionState}</span>
            {lastRealtimeEvent && (
              <span style={{ color: 'var(--text-secondary)' }}>
                last event: {lastRealtimeEvent}
              </span>
            )}
          </div>

          <a
            href="/client"
            className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.35)',
              color: 'var(--accent-green)',
            }}
          >
            Open Client Node
          </a>
        
          {error && (
            <div
              className="mt-2 text-xs px-3 py-1 rounded inline-block"
              style={{ background: 'rgba(220,38,38,0.15)', color: 'var(--accent-crimson)', border: '1px solid var(--accent-crimson)' }}
            >
              ⚠ Backend unreachable: {error}
            </div>
          )}
        </header>

        {status ? (
          <>
            {/* Status panel full width */}
            <StatusPanel status={status} />

            {/* Active + Waiting 2/3 + 1/3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <ClientNodeMonitor status={status} />
              </div>
              <div>
                <WaitingUsers status={status} />
              </div>
            </div>

            {/* Shared resource status + viewer 1/2 + 1/2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <ScrollStatus status={status} />
              <ScrollViewer
                content={scrollContent}
                error={scrollError}
                lastFileUpdate={lastFileUpdate}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>
            {error
              ? 'Connect to the backend to begin.'
              : 'Connecting to backend...'}
          </div>
        )}
      </div>
    </div>
  );
}
