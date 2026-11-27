import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  Download,
  Minus,
  Plus,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { PartProgressItem, Pattern, ProjectStatus, UserProject } from '../types';
import { storageAdapter } from '../lib/storageAdapter';
import {
  calculateOverallProgress,
  formatPartLabel,
  parsePatternInstructionsToParts,
  YARN_WEIGHT_MAP,
} from '../lib/amigurumiMath';
import { PatternThumbnail } from '../components/PatternThumbnail';

const STATUS_FILTERS: ('All' | ProjectStatus)[] = [
  'All',
  'In Progress',
  'Planning',
  'Completed',
  'Frogged',
];

const YARN_OPTIONS = Object.keys(YARN_WEIGHT_MAP);

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ProjectTrackerPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');

  // New Project Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'template' | 'custom'>('template');
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [targetYarn, setTargetYarn] = useState('Worsted (#4)');
  const [targetHook, setTargetHook] = useState('3.5mm');
  const [targetEyeSize, setTargetEyeSize] = useState('8mm');
  const [customParts, setCustomParts] = useState<{ name: string; totalRows: number }[]>([
    { name: 'head', totalRows: 12 },
    { name: 'body', totalRows: 14 },
  ]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Per-card local notes & delete confirmation
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savedNotesId, setSavedNotesId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [projList, patternList] = await Promise.all([
          storageAdapter.getProjects(),
          storageAdapter.getPatterns(),
        ]);
        if (!active) return;
        setProjects(projList);
        setPatterns(patternList);
        if (patternList.length > 0) {
          setSelectedPatternId(patternList[0].id);
          setProjectName(patternList[0].title);
          setTargetYarn(patternList[0].yarn_weight);
          setTargetHook(patternList[0].recommended_hook);
          setTargetEyeSize(patternList[0].recommended_eye_size);
        }
        const initialNotes: Record<string, string> = {};
        projList.forEach((p) => {
          initialNotes[p.id] = p.personal_notes || '';
        });
        setNotesDraft(initialNotes);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const patternById = useMemo(() => {
    const map = new Map<string, Pattern>();
    patterns.forEach((p) => map.set(p.id, p));
    return map;
  }, [patterns]);

  const handleSelectTemplatePattern = (pid: string) => {
    setSelectedPatternId(pid);
    const p = patternById.get(pid);
    if (p) {
      setProjectName(p.title);
      setTargetYarn(p.yarn_weight);
      setTargetHook(p.recommended_hook);
      setTargetEyeSize(p.recommended_eye_size);
    }
  };

  const openModal = () => {
    setFormError(null);
    if (patterns.length > 0 && creationMode === 'template') {
      handleSelectTemplatePattern(selectedPatternId || patterns[0].id);
    }
    setModalOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = projectName.trim();
    if (!cleanName) {
      setFormError('Please enter a project name.');
      return;
    }

    let partProgress: Record<string, PartProgressItem> = {};
    let linkedPatternId: string | null = null;

    if (creationMode === 'template') {
      const pat = patternById.get(selectedPatternId);
      if (!pat) {
        setFormError('Please choose a pattern.');
        return;
      }
      linkedPatternId = pat.id;
      partProgress = parsePatternInstructionsToParts(pat.instructions);
    } else {
      const validParts = customParts.filter((p) => p.name.trim().length > 0);
      if (validParts.length === 0) {
        setFormError('Add at least one body part with row count.');
        return;
      }
      for (const item of validParts) {
        const key = item.name.trim().toLowerCase().replace(/\s+/g, '_');
        partProgress[key] = {
          current_row: 0,
          total_rows: Math.max(1, item.totalRows || 1),
          completed: false,
        };
      }
    }

    setCreating(true);
    try {
      const created = await storageAdapter.createProject({
        pattern_id: linkedPatternId,
        project_name: cleanName,
        target_yarn: targetYarn,
        target_hook: targetHook.trim() || '3.5mm',
        target_eye_size: targetEyeSize.trim() || '8mm',
        part_progress: partProgress,
      });
      setProjects((prev) => [created, ...prev]);
      setNotesDraft((prev) => ({ ...prev, [created.id]: created.personal_notes || '' }));
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create project.');
    } finally {
      setCreating(false);
    }
  };

  const handleStepPartRow = async (project: UserProject, partKey: string, delta: number) => {
    const part = project.part_progress[partKey];
    if (!part) return;

    const nextRow = Math.max(0, part.current_row + delta);
    const nextParts: Record<string, PartProgressItem> = {
      ...project.part_progress,
      [partKey]: {
        ...part,
        current_row: nextRow,
        completed: nextRow >= part.total_rows,
      },
    };

    const nextOverall = calculateOverallProgress(nextParts);
    const nextStatus: ProjectStatus =
      project.status === 'Frogged'
        ? 'Frogged'
        : nextOverall === 100
        ? 'Completed'
        : nextRow > 0 && project.status === 'Planning'
        ? 'In Progress'
        : project.status === 'Completed' && nextOverall < 100
        ? 'In Progress'
        : project.status;

    const optimistic: UserProject = {
      ...project,
      part_progress: nextParts,
      overall_completion: nextOverall,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    setProjects((prev) => prev.map((p) => (p.id === project.id ? optimistic : p)));

    const saved = await storageAdapter.updateProject(project.id, {
      part_progress: nextParts,
      overall_completion: nextOverall,
      status: nextStatus,
    });
    setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
  };

  const handleStatusChange = async (project: UserProject, status: ProjectStatus) => {
    const optimistic = { ...project, status, updated_at: new Date().toISOString() };
    setProjects((prev) => prev.map((p) => (p.id === project.id ? optimistic : p)));
    const saved = await storageAdapter.updateProject(project.id, { status });
    setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
  };

  const handleSaveNotes = async (project: UserProject) => {
    const personal_notes = notesDraft[project.id] ?? '';
    const saved = await storageAdapter.updateProject(project.id, { personal_notes });
    setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    setSavedNotesId(project.id);
    window.setTimeout(() => setSavedNotesId(null), 1500);
  };

  const handleDeleteProject = async (projectId: string) => {
    await storageAdapter.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setConfirmDeleteId(null);
  };

  const handleExportCsv = () => {
    const headers = [
      'project_name',
      'status',
      'target_yarn',
      'target_hook',
      'target_eye_size',
      'overall_completion',
      'parts_summary',
      'personal_notes',
      'updated_at',
    ];

    const rows = projects.map((proj) => {
      const partsSummary = Object.entries(proj.part_progress)
        .map(([name, info]) => `${formatPartLabel(name)}: ${info.current_row}/${info.total_rows}`)
        .join(' | ');
      return [
        escapeCsvCell(proj.project_name),
        escapeCsvCell(proj.status),
        escapeCsvCell(proj.target_yarn),
        escapeCsvCell(proj.target_hook),
        escapeCsvCell(proj.target_eye_size),
        escapeCsvCell(`${proj.overall_completion}%`),
        escapeCsvCell(partsSummary),
        escapeCsvCell(proj.personal_notes || ''),
        escapeCsvCell(proj.updated_at),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stitchcraft_projects.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'All') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      {/* Action Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Amigurumi Project Tracker
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Track individual body parts, materials, notes, and automatic completion across every plushie WIP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {projects.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Projects to CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Plushie Project</span>
          </button>
        </div>
      </header>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1 w-fit">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === status
                ? 'bg-[var(--color-accent)] text-white dark:text-[#1A1D20]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-muted)]">
          Loading your projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {projects.length === 0 ? 'No projects started yet' : `No ${statusFilter} projects`}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {projects.length === 0
              ? 'Create a project from one of the 8 curated patterns or log a custom plushie from scratch.'
              : 'Switch status tabs or start a new plushie project.'}
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Plushie Project</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredProjects.map((project) => {
            const linkedPattern = project.pattern_id
              ? patternById.get(project.pattern_id)
              : undefined;
            const isComplete =
              project.overall_completion === 100 || project.status === 'Completed';

            return (
              <article
                key={project.id}
                className="flex flex-col rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row border-b border-[var(--border-color)]">
                  <div className="h-40 sm:h-auto sm:w-44 shrink-0 overflow-hidden bg-[var(--bg-primary)]">
                    <PatternThumbnail
                      src={linkedPattern?.image_urls[0]}
                      alt={project.project_name}
                    />
                  </div>
                  <div className="flex-1 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                          {project.project_name}
                        </h2>
                        {linkedPattern && (
                          <Link
                            to={`/patterns/${linkedPattern.id}`}
                            className="mt-0.5 inline-block text-xs font-medium text-[var(--color-accent)] hover:underline"
                          >
                            Open Pattern Reader
                          </Link>
                        )}
                      </div>

                      <select
                        aria-label={`Status for ${project.project_name}`}
                        value={project.status}
                        onChange={(e) =>
                          handleStatusChange(project, e.target.value as ProjectStatus)
                        }
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]"
                      >
                        <option value="Planning">Planning</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Frogged">Frogged</option>
                      </select>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] tabular-nums">
                      Yarn: {project.target_yarn} · Hook: {project.target_hook} · Eyes:{' '}
                      {project.target_eye_size}
                    </p>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[var(--text-muted)]">Overall Progress</span>
                        <span className="tabular-nums text-[var(--color-accent)]">
                          {project.overall_completion}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                          style={{ width: `${project.overall_completion}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Part Progress List */}
                <div className="p-5 space-y-4">
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)]">
                      Body Parts & Rows
                    </h3>
                    {Object.entries(project.part_progress).map(([partKey, item]) => (
                      <div
                        key={partKey}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.completed && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-white dark:text-[#1A1D20]">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {formatPartLabel(partKey)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStepPartRow(project, partKey, -1)}
                            aria-label={`Decrease row for ${formatPartLabel(partKey)}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--color-accent)] cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[56px] text-center text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                            {item.current_row} / {item.total_rows}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepPartRow(project, partKey, 1)}
                            aria-label={`Increase row for ${formatPartLabel(partKey)}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Personal Notes */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`notes-${project.id}`}
                        className="text-xs font-semibold text-[var(--text-muted)]"
                      >
                        Personal Yarn & Hook Notes
                      </label>
                      {savedNotesId === project.id && (
                        <span className="text-xs font-medium text-[var(--color-secondary)]">
                          Notes saved
                        </span>
                      )}
                    </div>
                    <textarea
                      id={`notes-${project.id}`}
                      rows={2}
                      value={notesDraft[project.id] ?? ''}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({ ...prev, [project.id]: e.target.value }))
                      }
                      placeholder="Dye lot, eye placement round, stitch tension notes..."
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(project)}
                        className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                      >
                        Save Notes
                      </button>

                      <div className="flex items-center gap-2">
                        {isComplete && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate('/gallery', { state: { shareFromProject: project } })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-secondary)] px-3 py-1.5 text-xs font-semibold text-white dark:text-[#1A1D20] hover:opacity-90 cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span>Share to Gallery</span>
                          </button>
                        )}

                        {confirmDeleteId === project.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(project.id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(project.id)}
                            aria-label={`Delete ${project.project_name}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="new-project-title" className="font-display text-xl font-bold text-[var(--text-primary)]">
                Start a New Plushie Project
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-1">
              <button
                type="button"
                onClick={() => {
                  setCreationMode('template');
                  if (patterns.length > 0) {
                    handleSelectTemplatePattern(selectedPatternId || patterns[0].id);
                  }
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold cursor-pointer ${
                  creationMode === 'template'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                From Pattern Template
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationMode('custom');
                  setProjectName('');
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold cursor-pointer ${
                  creationMode === 'custom'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Custom From Scratch
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
              {creationMode === 'template' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Select StitchCraft Pattern
                  </label>
                  <select
                    value={selectedPatternId}
                    onChange={(e) => handleSelectTemplatePattern(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {patterns.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Pastel Chunky Frog Gift"
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Target Yarn
                  </label>
                  <select
                    value={targetYarn}
                    onChange={(e) => setTargetYarn(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
                  >
                    {YARN_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Hook Size
                  </label>
                  <input
                    type="text"
                    value={targetHook}
                    onChange={(e) => setTargetHook(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Safety Eyes
                  </label>
                  <input
                    type="text"
                    value={targetEyeSize}
                    onChange={(e) => setTargetEyeSize(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {creationMode === 'custom' && (
                <div className="space-y-2.5 border-t border-[var(--border-color)] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Custom Body Parts & Row Counts
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomParts((prev) => [...prev, { name: '', totalRows: 10 }])
                      }
                      className="text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      + Add Part
                    </button>
                  </div>
                  {customParts.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Part name (e.g., Head)"
                        value={part.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomParts((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, name: val } : p))
                          );
                        }}
                        className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={part.totalRows}
                        onChange={(e) => {
                          const rows = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setCustomParts((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, totalRows: rows } : p))
                          );
                        }}
                        className="w-20 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs tabular-nums text-[var(--text-primary)]"
                      />
                      {customParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCustomParts((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove custom part"
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-600 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
