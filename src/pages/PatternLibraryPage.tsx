import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import { Pattern } from '../types';
import { storageAdapter } from '../lib/storageAdapter';
import { useAuth } from '../context/AuthContext';
import { PatternThumbnail } from '../components/PatternThumbnail';
import { DemoAuthPromptModal } from '../components/DemoAuthPromptModal';

const CATEGORIES = ['All', 'Animals & Bugs', 'Sea Life', 'Seasonal & Fantasy'] as const;

export function PatternLibraryPage() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const list = await storageAdapter.getPatterns(query, selectedCategory);
        if (active) setPatterns(list);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query, selectedCategory]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setFavorites([]);
      setFavoritesOnly(false);
      return;
    }
    storageAdapter
      .getFavorites()
      .then((ids) => {
        if (active) setFavorites(ids);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const handleToggleFavorite = async (patternId: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    const res = await storageAdapter.toggleFavorite(patternId);
    setFavorites((prev) =>
      res.favorited ? [...prev, patternId] : prev.filter((id) => id !== patternId)
    );
  };

  const visiblePatterns = useMemo(() => {
    if (!favoritesOnly) return patterns;
    return patterns.filter((p) => favorites.includes(p.id));
  }, [patterns, favoritesOnly, favorites]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Pattern Library
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Curated beginner and no-sew amigurumi patterns with written round instructions and tutorial links.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patterns (e.g., Frog, Axolotl, Whale)..."
              aria-label="Search patterns"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-accent)] text-white dark:text-[#1A1D20]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  setShowAuthPrompt(true);
                  return;
                }
                setFavoritesOnly((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                favoritesOnly
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
              <span>Favorites Only</span>
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-72 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : visiblePatterns.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            No matching patterns found
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Try clearing your search query or switching category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory('All');
              setFavoritesOnly(false);
            }}
            className="mt-4 rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visiblePatterns.map((pattern) => {
            const isFav = favorites.includes(pattern.id);
            return (
              <article
                key={pattern.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--color-accent)]"
              >
                <Link to={`/patterns/${pattern.id}`} className="block aspect-video w-full overflow-hidden">
                  <PatternThumbnail src={pattern.image_urls[0]} alt={pattern.title} />
                </Link>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/patterns/${pattern.id}`}
                      className="text-base font-semibold leading-snug text-[var(--text-primary)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      {pattern.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(pattern.id)}
                      aria-label={isFav ? `Unfavorite ${pattern.title}` : `Favorite ${pattern.title}`}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--color-accent)] cursor-pointer shrink-0"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isFav ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {pattern.difficulty} · {pattern.category}
                  </p>

                  <div className="mt-auto pt-3 border-t border-[var(--border-color)] flex flex-col gap-1 text-xs text-[var(--text-muted)] tabular-nums">
                    <span>Yarn: {pattern.yarn_weight}</span>
                    <span>
                      Hook: {pattern.recommended_hook} · Eyes: {pattern.recommended_eye_size}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DemoAuthPromptModal
        open={showAuthPrompt}
        title="Sign in to save favorites"
        message="Use 1-Click Demo Crafter mode or sign in to keep track of your favorite patterns."
        onClose={() => setShowAuthPrompt(false)}
      />
    </div>
  );
}
