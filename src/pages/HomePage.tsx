import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Camera, Heart, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Pattern, UserProject } from '../types';
import { storageAdapter } from '../lib/storageAdapter';
import { PatternThumbnail } from '../components/PatternThumbnail';
import { DemoAuthPromptModal } from '../components/DemoAuthPromptModal';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const FEATURED_TITLES = [
  'Classic Amigurumi Bumblebee',
  'Fergus the No-Sew Frog',
  'Baby Axolotl',
];

export function HomePage() {
  const { user, loading: authLoading, loginWithDemo, loginWithGoogle } = useAuth();
  const [featured, setFeatured] = useState<Pattern[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const allPatterns = await storageAdapter.getPatterns();
      if (!active) return;
      const picks = FEATURED_TITLES.map((t) => allPatterns.find((p) => p.title === t)).filter(
        Boolean
      ) as Pattern[];
      setFeatured(picks.length > 0 ? picks : allPatterns.slice(0, 3));
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setProjects([]);
      setFavorites([]);
      return;
    }
    (async () => {
      try {
        const [projList, favList] = await Promise.all([
          storageAdapter.getProjects(),
          storageAdapter.getFavorites(),
        ]);
        if (!active) return;
        setProjects(projList);
        setFavorites(favList);
      } catch {
        // Ignore transient load errors
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handleToggleFavorite = async (patternId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const res = await storageAdapter.toggleFavorite(patternId);
    setFavorites((prev) =>
      res.favorited ? [...prev, patternId] : prev.filter((id) => id !== patternId)
    );
  };

  const activeWips = projects.filter((p) => p.status !== 'Frogged').slice(0, 2);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-12">
      {/* Hero Banner */}
      <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 sm:p-12">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Amigurumi Crochet Companion
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
            Keep your hands on the hook and your stitches on track
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">
            Browse curated no-sew and beginner amigurumi patterns, count rows hands-free with voice controls, resize yarn weights with confidence, and share finished plushies with fellow makers.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/patterns"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap"
            >
              <span>Browse Patterns</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center rounded-lg border border-[var(--border-color)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors whitespace-nowrap"
            >
              Open Project Tracker
            </Link>
          </div>
        </div>
      </section>

      {/* Active Projects Snapshot */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Active Works in Progress
          </h2>
          {user && (
            <Link
              to="/projects"
              className="text-sm font-semibold text-[var(--color-accent)] hover:underline whitespace-nowrap"
            >
              View All
            </Link>
          )}
        </div>

        {authLoading ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
            Loading your craft workspace...
          </div>
        ) : !user ? (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Resume your plushie projects anywhere
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Sign in with Google or try Demo Crafter mode to track body-part rows, save favorites, and share finished makes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <GoogleSignInButton onClick={() => loginWithGoogle().catch(() => {})} />
              <button
                type="button"
                onClick={() => loginWithDemo()}
                className="rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
              >
                Try Demo Crafter Mode
              </button>
            </div>
          </div>
        ) : activeWips.length === 0 ? (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                No active projects yet, {user.username}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Start a project from any pattern in the library or log a custom plushie in your Project Tracker.
              </p>
            </div>
            <Link
              to="/projects"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              Start First Project
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {activeWips.map((proj) => (
              <Link
                key={proj.id}
                to="/projects"
                className="block rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 hover:border-[var(--color-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {proj.project_name}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {proj.status} · {proj.target_yarn} · {proj.target_hook} · {proj.target_eye_size} eyes
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-accent)]">
                    {proj.overall_completion}%
                  </span>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${proj.overall_completion}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Patterns Row */}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Featured Patterns
          </h2>
          <Link
            to="/patterns"
            className="text-sm font-semibold text-[var(--color-accent)] hover:underline whitespace-nowrap"
          >
            All 8 Patterns
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((pattern) => {
            const isFav = favorites.includes(pattern.id);
            return (
              <article
                key={pattern.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]"
              >
                <Link to={`/patterns/${pattern.id}`} className="block aspect-video w-full overflow-hidden">
                  <PatternThumbnail src={pattern.image_urls[0]} alt={pattern.title} />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/patterns/${pattern.id}`}
                      className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      {pattern.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(pattern.id)}
                      aria-label={isFav ? `Remove ${pattern.title} from favorites` : `Favorite ${pattern.title}`}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--color-accent)] cursor-pointer shrink-0"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isFav ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    {pattern.difficulty} · {pattern.category}
                  </p>
                  <p className="mt-3 text-xs text-[var(--text-muted)] tabular-nums">
                    {pattern.yarn_weight} · {pattern.recommended_hook} hook · {pattern.recommended_eye_size} eyes
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Domain Tools Grid */}
      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Amigurumi Studio Tools
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            to="/calculator"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 hover:border-[var(--color-accent)] transition-colors"
          >
            <Calculator className="h-5 w-5 text-[var(--color-accent)]" />
            <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
              Pattern Resizer & Eye Sizer
            </h3>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Scale plushie dimensions, hook size, safety eye diameter, and poly-fil volume across yarn weights.
            </p>
          </Link>

          <Link
            to="/compare"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 hover:border-[var(--color-accent)] transition-colors"
          >
            <Scale className="h-5 w-5 text-[var(--color-secondary)]" />
            <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
              Safety Eye & Washer Guide
            </h3>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Compare flat vs. sinker washers, stitch density by yarn weight, and stuffing loft side by side.
            </p>
          </Link>

          <Link
            to="/gallery"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 hover:border-[var(--color-accent)] transition-colors"
          >
            <Camera className="h-5 w-5 text-[var(--color-accent)]" />
            <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
              Community Plushie Gallery
            </h3>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Share photos of finished creatures, tag the yarn and hook used, and swap tips with makers.
            </p>
          </Link>
        </div>
      </section>

      <DemoAuthPromptModal
        open={showAuthModal}
        title="Sign in to favorite patterns"
        message="Use 1-Click Demo Crafter mode or your own account to save favorite amigurumi patterns."
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
