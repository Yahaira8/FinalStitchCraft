import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/patterns', label: 'Patterns' },
  { to: '/projects', label: 'My Projects' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/compare', label: 'Compare' },
  { to: '/calculator', label: 'Calculator' },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <Link
          to="/"
          className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
        >
          StitchCraft
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  isActive
                    ? 'text-[var(--color-accent)] underline underline-offset-8 decoration-2'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap max-w-[140px] truncate">
                {user.username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-[var(--border-color)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `py-1.5 ${
                    isActive
                      ? 'text-[var(--color-accent)] font-semibold'
                      : 'text-[var(--text-muted)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            {user ? (
              <>
                <span className="text-sm font-medium text-[var(--text-primary)]">{user.username}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-[var(--border-color)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
