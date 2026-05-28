import { useEffect, useState } from 'react';
import { login, logout, sendHeartbeat } from '../api/sessionApi';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

type ActionResult = { ok: boolean; msg: string } | null;

export default function ControlsPanel() {
  const [selectedUser, setSelectedUser] = useState<number>(1);
  const [password, setPassword] = useState('');
  const [loginResult, setLoginResult] = useState<ActionResult>(null);
  const [logoutResult, setLogoutResult] = useState<ActionResult>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [heartbeatUserIds, setHeartbeatUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (heartbeatUserIds.size === 0) {
      return;
    }

    let cancelled = false;

    async function pulse() {
      await Promise.all([...heartbeatUserIds].map(async (userId) => {
        try {
          await sendHeartbeat(userId);
        } catch (err) {
          if (!cancelled && err instanceof Error && err.message.includes('Session not found')) {
            setHeartbeatUserIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          }
        }
      }));
    }

    void pulse();
    const id = window.setInterval(pulse, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [heartbeatUserIds]);

  async function handleLogin() {
    // The username is derived from the selected ID so it stays aligned with the seeded backend users.
    const username = USERNAMES[selectedUser - 1];
    setLoginBusy(true);
    setLoginResult(null);
    try {
      const res = await login(selectedUser, username, password);
      setHeartbeatUserIds((prev) => new Set(prev).add(selectedUser));
      if (res.queued) {
        setLoginResult({ ok: true, msg: `${username} queued, server capacity full` });
      } else {
        setLoginResult({ ok: true, msg: `${username} connected as a client node` });
      }
    } catch (e) {
      setLoginResult({ ok: false, msg: e instanceof Error ? e.message : 'Login failed' });
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    setLogoutBusy(true);
    setLogoutResult(null);
    try {
      await logout(selectedUser);
      setHeartbeatUserIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedUser);
        return next;
      });
      setLogoutResult({ ok: true, msg: `${USERNAMES[selectedUser - 1]} disconnected from the server` });
    } catch (e) {
      setLogoutResult({ ok: false, msg: e instanceof Error ? e.message : 'Logout failed' });
    } finally {
      setLogoutBusy(false);
    }
  }

  const btnBase =
    'px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="panel">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Demo Session Controls
      </h2>

      {/* User selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Select Client Identity
        </label>
        <div className="flex flex-wrap gap-2">
          {USERNAMES.map((name, i) => {
            const id = i + 1;
            return (
              <button
                key={id}
                // User selection is kept separate from login state so different users can be tested quickly.
                onClick={() => setSelectedUser(id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
                style={{
                  background: selectedUser === id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedUser === id ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                  color: selectedUser === id ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  boxShadow: selectedUser === id ? '0 0 8px var(--glow-purple)' : 'none',
                }}
              >
                {name} <span className="text-xs opacity-60">#{id}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full max-w-xs px-3 py-2 rounded-lg text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          autoComplete="current-password"
        />
      </div>

      {/* Login / Logout */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleLogin}
          disabled={loginBusy}
          className={btnBase}
          style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }}
        >
          {loginBusy ? 'Connecting...' : 'Connect Client'}
        </button>
        <button
          onClick={handleLogout}
          disabled={logoutBusy}
          className={btnBase}
          style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)' }}
        >
          {logoutBusy ? 'Disconnecting...' : 'Disconnect Client'}
        </button>
        {loginResult && (
          <span className="text-xs" style={{ color: loginResult.ok ? 'var(--accent-green)' : 'var(--accent-crimson)' }}>
            {loginResult.ok ? '✓' : '✗'} {loginResult.msg}
          </span>
        )}
        {logoutResult && (
          <span className="text-xs" style={{ color: logoutResult.ok ? 'var(--accent-green)' : 'var(--accent-crimson)' }}>
            {logoutResult.ok ? '✓' : '✗'} {logoutResult.msg}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
        Max 4 active client nodes. Extra clients are queued by the server. Read/write controls above demonstrate server-side coordination.
      </p>
    </div>
  );
}
