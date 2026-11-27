import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Minus, Plus, RotateCcw, Smartphone } from 'lucide-react';
import { Pattern, UserProject } from '../types';
import {
  calculateOverallProgress,
  formatPartLabel,
  parsePatternInstructionsToParts,
} from '../lib/amigurumiMath';
import { storageAdapter } from '../lib/storageAdapter';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface FloatingRowCounterProps {
  pattern: Pattern;
  matchingProjects: UserProject[];
  onProjectUpdated: (project: UserProject) => void;
}

export function FloatingRowCounter({
  pattern,
  matchingProjects,
  onProjectUpdated,
}: FloatingRowCounterProps) {
  const partKeys = useMemo(() => Object.keys(pattern.instructions), [pattern.instructions]);
  const parsedDefaultParts = useMemo(
    () => parsePatternInstructionsToParts(pattern.instructions),
    [pattern.instructions]
  );

  const [selectedPart, setSelectedPart] = useState<string>(partKeys[0] || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('standalone');
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (partKeys.length > 0 && !partKeys.includes(selectedPart)) {
      setSelectedPart(partKeys[0]);
    }
  }, [partKeys, selectedPart]);

  useEffect(() => {
    if (
      selectedProjectId !== 'standalone' &&
      !matchingProjects.some((p) => p.id === selectedProjectId)
    ) {
      setSelectedProjectId(matchingProjects[0]?.id || 'standalone');
    }
  }, [matchingProjects, selectedProjectId]);

  const activeProject = useMemo(
    () => matchingProjects.find((p) => p.id === selectedProjectId) || null,
    [matchingProjects, selectedProjectId]
  );

  useEffect(() => {
    if (activeProject || !selectedPart) return;
    const key = `stitchcraft_row_${pattern.id}_${selectedPart}`;
    const stored = sessionStorage.getItem(key);
    setSessionCount(stored ? Math.max(0, parseInt(stored, 10) || 0) : 0);
  }, [activeProject, pattern.id, selectedPart]);

  const activePartProgress = activeProject?.part_progress[selectedPart];
  const totalRows =
    activePartProgress?.total_rows ?? parsedDefaultParts[selectedPart]?.total_rows ?? 1;
  const currentRow = activeProject ? activePartProgress?.current_row ?? 0 : sessionCount;

  const scheduleProjectSave = useCallback(
    (projectToSave: UserProject) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      setSaveState('saving');
      debounceRef.current = window.setTimeout(async () => {
        try {
          const updated = await storageAdapter.updateProject(projectToSave.id, {
            part_progress: projectToSave.part_progress,
            overall_completion: projectToSave.overall_completion,
            status: projectToSave.status,
          });
          onProjectUpdated(updated);
          setSaveState('saved');
          window.setTimeout(() => setSaveState('idle'), 1200);
        } catch {
          setSaveState('idle');
        }
      }, 500);
    },
    [onProjectUpdated]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const updateRow = useCallback(
    (delta: number | 'reset') => {
      if (!selectedPart) return;

      if (!activeProject) {
        setSessionCount((prev) => {
          const nextVal = delta === 'reset' ? 0 : Math.max(0, prev + delta);
          sessionStorage.setItem(`stitchcraft_row_${pattern.id}_${selectedPart}`, String(nextVal));
          return nextVal;
        });
        return;
      }

      const existingPart = activeProject.part_progress[selectedPart] || {
        current_row: 0,
        total_rows: totalRows,
        completed: false,
      };
      const nextRow =
        delta === 'reset' ? 0 : Math.max(0, existingPart.current_row + delta);
      const nextPartProgress = {
        ...activeProject.part_progress,
        [selectedPart]: {
          ...existingPart,
          current_row: nextRow,
          completed: nextRow >= existingPart.total_rows,
        },
      };
      const nextOverall = calculateOverallProgress(nextPartProgress);
      const nextStatus =
        activeProject.status === 'Frogged'
          ? 'Frogged'
          : nextOverall === 100
          ? 'Completed'
          : nextRow > 0 && activeProject.status === 'Planning'
          ? 'In Progress'
          : activeProject.status === 'Completed' && nextOverall < 100
          ? 'In Progress'
          : activeProject.status;

      const optimistic: UserProject = {
        ...activeProject,
        part_progress: nextPartProgress,
        overall_completion: nextOverall,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      onProjectUpdated(optimistic);
      scheduleProjectSave(optimistic);
    },
    [activeProject, onProjectUpdated, pattern.id, scheduleProjectSave, selectedPart, totalRows]
  );

  const wakeLock = useWakeLock();
  const speech = useSpeechRecognition({
    onNext: () => updateRow(1),
    onBack: () => updateRow(-1),
  });

  return (
    <aside
      aria-label="Hands-free row counter"
      className="sticky bottom-0 z-30 border-t border-[var(--border-color)] bg-[var(--bg-surface)]/95 backdrop-blur-md shadow-lg"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label htmlFor="counter-part-select" className="sr-only">
              Body part
            </label>
            <select
              id="counter-part-select"
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {partKeys.map((key) => (
                <option key={key} value={key}>
                  {formatPartLabel(key)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="counter-project-select" className="sr-only">
              Linked project
            </label>
            <select
              id="counter-project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-10 max-w-[200px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="standalone">Standalone (Session Only)</option>
              {matchingProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.project_name}
                </option>
              ))}
            </select>
          </div>

          {saveState !== 'idle' && (
            <span className="text-xs text-[var(--text-muted)]">
              {saveState === 'saving' ? 'Syncing...' : 'Synced'}
            </span>
          )}
        </div>

        {/* 64x64 Touch Counter Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateRow(-1)}
            aria-label="Decrement row"
            className="flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--color-accent)] active:scale-95 transition-all cursor-pointer"
          >
            <Minus className="h-6 w-6" />
          </button>

          <div className="min-w-[84px] text-center">
            <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
              {currentRow}
              <span className="text-sm font-medium text-[var(--text-muted)]"> / {totalRows}</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {currentRow >= totalRows ? 'Part complete' : 'Current row'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateRow(1)}
            aria-label="Increment row"
            className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => updateRow('reset')}
            aria-label="Reset row counter"
            title="Reset part counter"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Hands-free Voice & Wake Lock Toggles */}
        <div className="hidden sm:flex items-center gap-2">
          {speech.supported ? (
            <button
              type="button"
              onClick={speech.toggle}
              title='Say "Next" or "Count" to add a row, "Back" or "Previous" to subtract'
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                speech.listening
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              {speech.listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span>{speech.listening ? 'Listening' : 'Voice'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">Voice unavailable</span>
          )}

          <button
            type="button"
            onClick={wakeLock.toggle}
            title={
              wakeLock.unavailableReason ||
              'Keep screen awake while crocheting'
            }
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              wakeLock.active
                ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]'
                : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>{wakeLock.active ? 'Screen Awake' : 'Keep Awake'}</span>
          </button>
        </div>
      </div>

      {(wakeLock.unavailableReason || speech.lastCommand || speech.error) && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-1 text-center text-[11px] text-[var(--text-muted)]">
          {speech.lastCommand && <span className="mr-3">Voice command: {speech.lastCommand}</span>}
          {speech.error && <span className="mr-3">{speech.error}</span>}
          {wakeLock.unavailableReason && <span>{wakeLock.unavailableReason}</span>}
        </div>
      )}
    </aside>
  );
}
