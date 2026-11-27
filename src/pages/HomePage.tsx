import { Link } from 'react-router-dom';
import { Database, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SEED_GALLERY_POSTS, SEED_PATTERNS } from '../lib/seedData';

export function HomePage() {
  const { user, loading, runtimeMode, loginWithDemo, logout } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-12">
      <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 sm:p-10">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Phase 1 Foundation · {runtimeMode === 'replit-pg' ? 'Replit PostgreSQL Mode' : 'AI Studio LocalStorage Mode'}
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
            StitchCraft Amigurumi Companion
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">
            Dual-environment foundation initialized with Vite, React, TypeScript, Express, PostgreSQL DDL schema, seed catalog data, and self-contained authentication.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {loading ? (
              <span className="text-sm text-[var(--text-muted)]">Checking session...</span>
            ) : user ? (
              <>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Signed in as <strong>{user.username}</strong> ({user.email})
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => loginWithDemo()}
                  className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
                >
                  1-Click Demo Crafter Sign-In
                </button>
                <Link
                  to="/login"
                  className="rounded-lg border border-[var(--border-color)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  Sign In or Register
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <Database className="h-5 w-5 text-[var(--color-accent)]" />
          <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
            Dual-Environment Storage
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Active mode: <strong>{runtimeMode === 'replit-pg' ? 'Replit PostgreSQL' : 'AI Studio LocalStorage'}</strong>. Automatically probes <code>/api/health</code> with a 1500ms timeout.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <UserCheck className="h-5 w-5 text-[var(--color-secondary)]" />
          <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
            Self-Contained Auth
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Local account registration, bcryptjs + HTTP-only JWT cookies on Replit, and 1-click Demo Crafter mode (CozyCrafter).
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <ShieldCheck className="h-5 w-5 text-[var(--color-accent)]" />
          <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
            Seed Data Ready
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] tabular-nums">
            {SEED_PATTERNS.length} amigurumi patterns, 7 PostgreSQL tables, and {SEED_GALLERY_POSTS.length} sample community showcase posts loaded.
          </p>
        </div>
      </section>
    </div>
  );
}
