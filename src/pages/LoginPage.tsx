import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function LoginPage() {
  const { login, register, loginWithDemo, loginWithGoogle, runtimeMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';

  const handleGoogleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithDemo();
      navigate(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in as Demo Crafter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      navigate(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {runtimeMode === 'replit-pg' ? 'Replit PostgreSQL Session' : 'AI Studio Local Session'}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">
          {mode === 'login' ? 'Sign in to StitchCraft' : 'Create a crafter account'}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Save favorite patterns, track multi-part plushie projects, and share finished makes.
        </p>

        <div className="mt-6 space-y-2.5">
          <GoogleSignInButton
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full"
          />
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
          >
            1-Click Demo Crafter Sign-In (CozyCrafter)
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <div className="h-px flex-1 bg-[var(--border-color)]" />
          <span>or use email</span>
          <div className="h-px flex-1 bg-[var(--border-color)]" />
        </div>

        <div className="mb-5 flex rounded-lg border border-[var(--border-color)] p-1 bg-[var(--bg-primary)]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)]'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="CozyHooker"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-[var(--text-primary)]"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="crafter@example.com"
              className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-[var(--text-primary)]"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>
      </div>
    </section>
  );
}
