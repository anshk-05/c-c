interface Props {
  content: string | null;
  error: string | null;
}

export default function ScrollViewer({ content, error }: Props) {
  return (
    <div className="panel parchment h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-amber)' }}>
        Scroll Contents
      </h2>

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
