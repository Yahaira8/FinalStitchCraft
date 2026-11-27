import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Footer() {
  const { runtimeMode } = useAuth();

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-8 mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">StitchCraft</span>
          <span aria-hidden="true">·</span>
          <span>Amigurumi Companion</span>
          <span aria-hidden="true">·</span>
          <span>{runtimeMode === 'replit-pg' ? 'Replit DB' : 'AI Studio Sandbox'}</span>
          <span aria-hidden="true">·</span>
          <span>Self-contained dual-environment storage</span>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-xs text-[var(--text-muted)]">
          <Link to="/patterns" className="hover:text-[var(--text-primary)] transition-colors">
            Patterns
          </Link>
          <Link to="/projects" className="hover:text-[var(--text-primary)] transition-colors">
            Projects
          </Link>
          <Link to="/gallery" className="hover:text-[var(--text-primary)] transition-colors">
            Gallery
          </Link>
          <Link to="/compare" className="hover:text-[var(--text-primary)] transition-colors">
            Compare
          </Link>
          <Link to="/calculator" className="hover:text-[var(--text-primary)] transition-colors">
            Calculator
          </Link>
        </nav>
      </div>
    </footer>
  );
}
