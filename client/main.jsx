import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { AdminComplaints } from './AdminComplaints.jsx';
import { StudentComplaints } from './StudentComplaints.jsx';

async function api(path, data, method = 'POST') {
  const options = data === undefined ? {} : {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
  const response = await fetch('/api/' + path, options);
  const result = await response.json().catch(() => null);
  if (!response.ok || (response.status !== 204 && !result)) {
    throw Object.assign(new Error(result?.message ?? 'Could not reach the service. Try again.'), {
      status: response.status,
    });
  }
  return result;
}

function AuthForm({ mode, onChangeMode, onLogin, notice, onRegister }) {
  const isRegister = mode === 'register';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError('');
    try {
      const result = await api(isRegister ? 'auth/register' : 'auth/login', fields);
      if (isRegister) onRegister(result.message);
      else onLogin(result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 id="title">{isRegister ? 'Create a student account' : 'Sign in'}</h1>
      {notice && <p className="notice" role="status">{notice}</p>}
      <form onSubmit={submit}>
        {isRegister && <>
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" maxLength={100} required />
        </>}
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" maxLength={128} required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 12 : undefined}
          aria-describedby={isRegister ? 'password-help' : undefined} />
        {isRegister && <small id="password-help">Use at least 12 characters.</small>}
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={pending}>{isRegister ? 'Create account' : 'Sign in'}</button>
      </form>
      <button type="button" className="secondary" disabled={pending}
        onClick={() => onChangeMode(isRegister ? 'login' : 'register')}>
        {isRegister ? 'Already registered? Sign in' : 'Create a student account'}
      </button>
    </>
  );
}

function Dashboard({ user, onLogout }) {
  const isAdmin = user.role === 'admin';
  const [title, setTitle] = useState(isAdmin ? 'Loading dashboard…' : 'Student dashboard');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    api('admin/dashboard').then((result) => {
      if (active) setTitle(result.title);
    }).catch((error) => {
      if (!active) return;
      setTitle('Dashboard unavailable');
      setError(error.message);
    });
    return () => { active = false; };
  }, [isAdmin]);

  async function logout() {
    setPending(true);
    try {
      await api('auth/logout', {});
      onLogout();
    } catch (error) {
      setError(error.message);
      setPending(false);
    }
  }

  const signOut = (
    <button onClick={logout} disabled={pending}>{pending ? 'Signing out…' : 'Sign out'}</button>
  );

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1 id="title">{title}</h1>
          <p>Signed in as {user.name} ({user.email}).</p>
        </div>
        {signOut}
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      {isAdmin ? title === 'Admin dashboard' && <AdminComplaints api={api} />
        : <StudentComplaints api={api} />}
    </>
  );
}

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api('auth/me')
      .then((result) => setUser(result.user))
      .catch((error) => {
        if (error.status !== 401) setNotice('Could not check your session. Try signing in again.');
      })
      .finally(() => setLoading(false));
  }, []);

  function changeMode(nextMode) {
    setNotice('');
    setMode(nextMode);
  }

  return (
    <main className={user ? 'dashboard-shell' : undefined}>
      <p className="brand">Smart Campus Complaints</p>
      <section aria-labelledby="title">
        {loading ? <h1 id="title">Checking session…</h1>
          : user ? <Dashboard user={user} onLogout={() => { setUser(null); changeMode('login'); }} />
          : <AuthForm key={mode} mode={mode} notice={notice} onChangeMode={changeMode}
              onLogin={(account) => { setUser(account); setNotice(''); }}
              onRegister={(message) => { setMode('login'); setNotice(message); }} />}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
