import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderPlus,
  Heart,
} from 'lucide-react';
import { Pattern, UserProject } from '../types';
import { storageAdapter } from '../lib/storageAdapter';
import {
  formatPartLabel,
  parsePatternInstructionsToParts,
  toYouTubeWatchUrl,
} from '../lib/amigurumiMath';
import { useAuth } from '../context/AuthContext';
import { PatternThumbnail } from '../components/PatternThumbnail';
import { FloatingRowCounter } from '../components/FloatingRowCounter';
import { DemoAuthPromptModal } from '../components/DemoAuthPromptModal';

const STITCH_DECODER = [
  { abbr: 'MR', meaning: 'Magic Ring' },
  { abbr: 'sc', meaning: 'Single Crochet' },
  { abbr: 'inc', meaning: 'Increase (2 sc in 1 st)' },
  { abbr: 'dec', meaning: 'Invisible Decrease' },
  { abbr: 'FLO', meaning: 'Front Loop Only' },
  { abbr: 'BLO', meaning: 'Back Loop Only' },
  { abbr: 'dc', meaning: 'Double Crochet' },
  { abbr: 'tr', meaning: 'Treble Crochet' },
  { abbr: 'sl st', meaning: 'Slip Stitch' },
];

export function PatternReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [matchingProjects, setMatchingProjects] = useState<UserProject[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [checkedRounds, setCheckedRounds] = useState<Record<string, boolean>>({});
  const [creatingProject, setCreatingProject] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const found = await storageAdapter.getPatternById(id);
        if (!active) return;
        setPattern(found);
        if (found) {
          const initialOpen: Record<string, boolean> = {};
          Object.keys(found.instructions).forEach((key) => {
            initialOpen[key] = true;
          });
          setOpenSections(initialOpen);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !id) {
      setIsFavorite(false);
      setMatchingProjects([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [favIds, userProjects] = await Promise.all([
          storageAdapter.getFavorites(),
          storageAdapter.getProjects(),
        ]);
        if (!active) return;
        setIsFavorite(favIds.includes(id));
        setMatchingProjects(userProjects.filter((p) => p.pattern_id === id));
      } catch {
        // Ignore transient errors
      }
    })();
    return () => {
      active = false;
    };
  }, [user, id]);

  const handleToggleFavorite = async () => {
    if (!pattern) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const res = await storageAdapter.toggleFavorite(pattern.id);
    setIsFavorite(res.favorited);
  };

  const handleStartProject = async () => {
    if (!pattern) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCreatingProject(true);
    try {
      const created = await storageAdapter.createProject({
        pattern_id: pattern.id,
        project_name: pattern.title,
        target_yarn: pattern.yarn_weight,
        target_hook: pattern.recommended_hook,
        target_eye_size: pattern.recommended_eye_size,
        part_progress: parsePatternInstructionsToParts(pattern.instructions),
      });
      setMatchingProjects((prev) => [created, ...prev]);
      navigate('/projects');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleProjectUpdated = (updated: UserProject) => {
    setMatchingProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRoundCheck = (roundKey: string) => {
    setCheckedRounds((prev) => ({ ...prev, [roundKey]: !prev[roundKey] }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-[var(--text-muted)]">
        Loading pattern instructions...
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Pattern not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The requested pattern could not be found in the library.
        </p>
        <Link
          to="/patterns"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white dark:text-[#1A1D20]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Patterns</span>
        </Link>
      </div>
    );
  }

  const watchUrl = toYouTubeWatchUrl(pattern.video_url);

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 space-y-8">
        <div>
          <Link
            to="/patterns"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Pattern Library</span>
          </Link>
        </div>

        {/* Pattern Header */}
        <header className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {pattern.difficulty} · {pattern.category}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[var(--text-primary)]">
              {pattern.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)] tabular-nums">
              Yarn: {pattern.yarn_weight} · Hook: {pattern.recommended_hook} · Safety Eyes:{' '}
              {pattern.recommended_eye_size}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                isFavorite
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            <button
              type="button"
              onClick={handleStartProject}
              disabled={creatingProject}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60 cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>{creatingProject ? 'Starting...' : 'Start Project from Pattern'}</span>
            </button>
          </div>
        </header>

        {/* Media Showcase + Outbound YouTube Button (Zero Iframes) */}
        <section className="grid gap-6 md:grid-cols-2 items-stretch">
          <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] aspect-video">
            <PatternThumbnail src={pattern.image_urls[0]} alt={pattern.title} />
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Video Walkthrough & Materials
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                Open the step-by-step video tutorial directly on YouTube in a new tab while keeping your written rounds and row counter open here.
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border-color)] pt-4 text-xs">
                <div>
                  <dt className="text-[var(--text-muted)]">Yarn</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                    {pattern.yarn_weight}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Hook</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">
                    {pattern.recommended_hook}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Safety Eyes</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">
                    {pattern.recommended_eye_size}
                  </dd>
                </div>
              </dl>
            </div>

            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white dark:text-[#1A1D20] hover:opacity-90 transition-opacity"
            >
              <span>Watch Video Tutorial on YouTube</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Abbreviation Decoder Bar */}
        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Amigurumi Stitch Decoder
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5 text-xs">
            {STITCH_DECODER.map((item) => (
              <div key={item.abbr} className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-[var(--color-accent)]">{item.abbr}</span>
                <span className="text-[var(--text-muted)]">{item.meaning}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Round-by-Round Written Pattern Accordions */}
        <section className="space-y-4 pb-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Written Pattern Instructions
          </h2>

          <div className="space-y-3">
            {Object.entries(pattern.instructions).map(([partKey, lines]) => {
              const isOpen = openSections[partKey] ?? true;
              return (
                <div
                  key={partKey}
                  className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(partKey)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-primary)]/60 transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="text-base font-semibold text-[var(--text-primary)]">
                        {formatPartLabel(partKey)}
                      </span>
                      <span className="ml-2.5 text-xs text-[var(--text-muted)] tabular-nums">
                        {lines.length} {lines.length === 1 ? 'step' : 'steps'}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                    )}
                  </button>

                  {isOpen && (
                    <ul className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                      {lines.map((line, index) => {
                        const rowId = `${partKey}:${index}`;
                        const checked = Boolean(checkedRounds[rowId]);
                        return (
                          <li key={rowId}>
                            <button
                              type="button"
                              onClick={() => toggleRoundCheck(rowId)}
                              className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[var(--bg-primary)]/50 transition-colors cursor-pointer"
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                  checked
                                    ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white dark:text-[#1A1D20]'
                                    : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                                }`}
                              >
                                {checked && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span
                                className={`text-sm leading-relaxed ${
                                  checked
                                    ? 'line-through text-[var(--text-muted)]'
                                    : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {line}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky Hands-Free Row Counter */}
      <FloatingRowCounter
        pattern={pattern}
        matchingProjects={matchingProjects}
        onProjectUpdated={handleProjectUpdated}
      />

      <DemoAuthPromptModal
        open={showAuthModal}
        title="Sign in to track & favorite patterns"
        message="Sign in or use 1-Click Demo Crafter mode to save this pattern and sync your row counter to a project."
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
