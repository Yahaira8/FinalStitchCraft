import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DemoAuthPromptModalProps {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onAuthenticated?: () => void;
}

export function DemoAuthPromptModal({
  open,
  title = 'Sign in to save your craft activity',
  message = 'Sign in with Google, try 1-click Demo Crafter mode, or use your email account.',
  onClose,
  onAuthenticated,
}: DemoAuthPromptModalProps) {
  const { loginWithDemo, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithDemo();
      onClose();
      onAuthenticated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-auth-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="demo-auth-title" className="font-display text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in prompt"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>

        {error && (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <GoogleSignInButton onClick={handleGoogle} disabled={loading} className="w-full" />
          <button
            type="button"
            onClick={handleDemo}
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Signing in...' : '1-Click Demo Crafter Sign-In'}
          </button>
          <Link
            to="/login"
            onClick={onClose}
            className="w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
          >
            Sign In / Register with Email
          </Link>
        </div>
      </div>
    </div>
  );
}
