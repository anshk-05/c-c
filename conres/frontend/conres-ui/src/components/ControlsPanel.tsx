import { useState } from 'react';
import { login, logout } from '../api/sessionApi';

const USERNAMES = ['gojo', 'sukuna', 'itadori', 'nobara', 'todo', 'toji'];

type ActionResult = { ok: boolean; msg: string } | null;

export default function ControlsPanel() {
  const [selectedUser, setSelectedUser] = useState<number>(1);
  const [loginResult, setLoginResult] = useState<ActionResult>(null);
  const [logoutResult, setLogoutResult] = useState<ActionResult>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  async function handleLogin() {
    const username = USERNAMES[selectedUser - 1];
    setLoginBusy(true);
    setLoginResult(null);
    try {
      const res = await login(username);
      if (res.queued) {
        setLoginResult({ ok: true, msg: `${username} queued — barrier full` });
      } else {
        setLoginResult({ ok: true, msg: `${username} entered the barrier` });
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
      setLogoutResult({ ok: true, msg: `${USERNAMES[selectedUser - 1]} left the barrier` });
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
        Session Controls
      </h2>

      {/* User selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Select Sorcerer
        </label>
        <div className="flex flex-wrap gap-2">
          {USERNAMES.map((name, i) => {
            const id = i + 1;
            return (
              <button
                key={id}
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

      {/* Login / Logout */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleLogin}
          disabled={loginBusy}
          className={btnBase}
          style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }}
        >
          {loginBusy ? '⏳ Entering…' : '→ Enter Barrier'}
        </button>
        <button
          onClick={handleLogout}
          disabled={logoutBusy}
          className={btnBase}
          style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)' }}
        >
          {logoutBusy ? '⏳ Leaving…' : '← Leave Barrier'}
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
        Max 4 sorcerers active simultaneously · Extras are queued · Read/Write controls appear on each active sorcerer's card above
      </p>
    </div>
  );
}
