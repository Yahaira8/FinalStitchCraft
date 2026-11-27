import { useEffect, useMemo, useState } from 'react';
import { Pattern } from '../types';
import { storageAdapter } from '../lib/storageAdapter';
import { calculateAmigurumiScale, YARN_WEIGHT_MAP } from '../lib/amigurumiMath';

const YARN_KEYS = Object.keys(YARN_WEIGHT_MAP);

export function CalculatorPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [presetPatternId, setPresetPatternId] = useState<string>('');
  const [originalYarn, setOriginalYarn] = useState<string>('Worsted (#4)');
  const [targetYarn, setTargetYarn] = useState<string>('Super Bulky Plush (#6)');
  const [originalEyeMm, setOriginalEyeMm] = useState<number>(8);

  useEffect(() => {
    storageAdapter
      .getPatterns()
      .then((list) => setPatterns(list))
      .catch(() => {});
  }, []);

  const handlePresetChange = (pid: string) => {
    setPresetPatternId(pid);
    const chosen = patterns.find((p) => p.id === pid);
    if (!chosen) return;
    if (YARN_WEIGHT_MAP[chosen.yarn_weight]) {
      setOriginalYarn(chosen.yarn_weight);
    }
    const parsedEye = parseInt(chosen.recommended_eye_size, 10);
    if (Number.isFinite(parsedEye) && parsedEye > 0) {
      setOriginalEyeMm(parsedEye);
    }
  };

  const results = useMemo(
    () => calculateAmigurumiScale(originalYarn, targetYarn, originalEyeMm),
    [originalYarn, targetYarn, originalEyeMm]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Pattern Resizer & Safety Eye Sizer
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Predict finished plushie scale, tight-stitch hook size, safety eye diameter, and poly-fil volume when swapping yarn weights.
        </p>
      </header>

      {/* Calculator Form */}
      <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="calc-preset"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              Pattern Preset (Optional)
            </label>
            <select
              id="calc-preset"
              value={presetPatternId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            >
              <option value="">Custom measurements</option>
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="calc-orig-yarn"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              Original Pattern Yarn
            </label>
            <select
              id="calc-orig-yarn"
              value={originalYarn}
              onChange={(e) => setOriginalYarn(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            >
              {YARN_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="calc-orig-eye"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              Original Safety Eye (mm)
            </label>
            <input
              id="calc-orig-eye"
              type="number"
              min={3}
              max={40}
              value={originalEyeMm}
              onChange={(e) => setOriginalEyeMm(Math.max(3, parseInt(e.target.value, 10) || 6))}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm tabular-nums text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="calc-target-yarn"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              Target Yarn Weight
            </label>
            <select
              id="calc-target-yarn"
              value={targetYarn}
              onChange={(e) => setTargetYarn(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            >
              {YARN_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 4 Result Metric Cards */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <p className="text-xs font-semibold text-[var(--text-muted)]">Scaled Dimensions</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-accent)]">
            {results.scaleRatio}x
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {results.scaleRatio > 1
              ? 'Larger finished plushie height & width'
              : results.scaleRatio < 1
              ? 'Smaller finished plushie height & width'
              : 'Matches original pattern scale'}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Safety Eye Recommendation
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {results.recommendedEyeSize}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Scaled proportionally from {originalEyeMm}mm eyes
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Zero-Gap Hook Size
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {results.recommendedHook}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Sized to keep poly-fil concealed inside stitches
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Poly-Fil Stuffing Multiplier
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-secondary)]">
            {results.stuffingMultiplier}x
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Estimated stuffing volume relative to original
          </p>
        </div>
      </section>

      {/* Quick Reference Guide */}
      <section className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Yarn Weight Quick Reference
          </h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/60 text-xs font-semibold text-[var(--text-muted)]">
              <th className="px-5 py-3">Yarn Weight</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Base Amigurumi Hook</th>
              <th className="px-5 py-3">Baseline Safety Eye</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {YARN_KEYS.map((key) => {
              const info = YARN_WEIGHT_MAP[key];
              return (
                <tr key={key}>
                  <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{key}</td>
                  <td className="px-5 py-3 text-[var(--text-muted)]">{info.label}</td>
                  <td className="px-5 py-3 tabular-nums text-[var(--text-primary)]">
                    {info.baseHook}mm
                  </td>
                  <td className="px-5 py-3 tabular-nums text-[var(--text-primary)]">
                    {info.baseEye}mm
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
