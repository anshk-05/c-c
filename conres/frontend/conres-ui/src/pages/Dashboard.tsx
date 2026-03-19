import { useState } from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import ParticleCanvas from '../components/ParticleCanvas';
import StatusPanel from '../components/StatusPanel';
import ActiveUsers from '../components/ActiveUsers';
import WaitingUsers from '../components/WaitingUsers';
import ScrollStatus from '../components/ScrollStatus';
import ScrollViewer from '../components/ScrollViewer';
import ControlsPanel from '../components/ControlsPanel';

export default function Dashboard() {
  const { status, error } = useSystemStatus();
  const [scrollContent, setScrollContent] = useState<string | null>(null);
  const [scrollError, setScrollError] = useState<string | null>(null);

  function handleScrollRead(content: string) {
    setScrollError(null);
    setScrollContent(content);
  }

  function handleScrollError(msg: string) {
    setScrollError(msg);
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: `linear-gradient(rgba(10,10,15,0.85), rgba(10,10,15,0.92)), url('/gojo_vs_sukuna_domain_clash.png') center/cover no-repeat fixed`,
      }}
    >
      <ParticleCanvas />

      <div className="relative p-4 md:p-6 max-w-7xl mx-auto" style={{ zIndex: 1 }}>
        {/* Header */}
        <header className="mb-6 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-1"
            style={{
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple), var(--accent-crimson))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Jujutsu Command Center
          </h1>
        
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
            {/* Status panel — full width */}
            <StatusPanel status={status} />

            {/* Active + Waiting — 2/3 + 1/3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <ActiveUsers
                  status={status}
                  onScrollRead={handleScrollRead}
                  onScrollError={handleScrollError}
                />
              </div>
              <div>
                <WaitingUsers status={status} />
              </div>
            </div>

            {/* Scroll status + viewer — 1/2 + 1/2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <ScrollStatus status={status} />
              <ScrollViewer
                content={scrollContent}
                error={scrollError}
              />
            </div>

            {/* Session controls — full width */}
            <ControlsPanel />
          </>
        ) : (
          <div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>
            {error
              ? 'Connect to the backend to begin.'
              : '⏳ Connecting to backend…'}
          </div>
        )}
      </div>
    </div>
  );
}
