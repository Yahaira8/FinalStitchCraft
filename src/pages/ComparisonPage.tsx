import { useEffect, useMemo, useState } from 'react';
import { SUPPLIES_DATA, SUPPLY_CATEGORIES, SupplyCategory } from '../lib/suppliesData';

export function ComparisonPage() {
  const [category, setCategory] = useState<SupplyCategory>('washers');

  const categoryItems = useMemo(
    () => SUPPLIES_DATA.filter((item) => item.category === category),
    [category]
  );

  const [itemAId, setItemAId] = useState(categoryItems[0]?.id || '');
  const [itemBId, setItemBId] = useState(categoryItems[1]?.id || '');

  useEffect(() => {
    setItemAId(categoryItems[0]?.id || '');
    setItemBId(categoryItems[1]?.id || categoryItems[0]?.id || '');
  }, [categoryItems]);

  const itemA = categoryItems.find((i) => i.id === itemAId) || categoryItems[0];
  const itemB = categoryItems.find((i) => i.id === itemBId) || categoryItems[1] || categoryItems[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Amigurumi Supplies & Safety Eye Comparison
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Compare washer locking mechanics, yarn stitch density, and stuffing loft side by side before starting your plushie.
        </p>
      </header>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1 w-fit">
        {SUPPLY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              category === cat.id
                ? 'bg-[var(--color-accent)] text-white dark:text-[#1A1D20]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item Selectors */}
      <section className="grid gap-4 sm:grid-cols-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
        <div>
          <label htmlFor="compare-item-a" className="block text-xs font-semibold text-[var(--text-muted)]">
            Option A
          </label>
          <select
            id="compare-item-a"
            value={itemA?.id || ''}
            onChange={(e) => setItemAId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)]"
          >
            {categoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="compare-item-b" className="block text-xs font-semibold text-[var(--text-muted)]">
            Option B
          </label>
          <select
            id="compare-item-b"
            value={itemB?.id || ''}
            onChange={(e) => setItemBId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)]"
          >
            {categoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Side-by-Side Comparison Matrix */}
      {itemA && itemB && (
        <section className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/60">
                <th className="px-5 py-3.5 text-xs font-semibold text-[var(--text-muted)] w-1/4">
                  Specification
                </th>
                <th className="px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] w-[37.5%]">
                  {itemA.name}
                </th>
                <th className="px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] w-[37.5%]">
                  {itemB.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {itemA.metrics.map((metric, idx) => (
                <tr key={metric.label}>
                  <td className="px-5 py-3.5 text-xs font-semibold text-[var(--text-muted)]">
                    {metric.label}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--text-primary)]">
                    {metric.value}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--text-primary)]">
                    {itemB.metrics[idx]?.value}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-5 py-3.5 text-xs font-semibold text-[var(--text-muted)]">
                  Best Use Case
                </td>
                <td className="px-5 py-3.5 text-sm text-[var(--text-primary)]">{itemA.bestFor}</td>
                <td className="px-5 py-3.5 text-sm text-[var(--text-primary)]">{itemB.bestFor}</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 text-xs font-semibold text-[var(--text-muted)]">
                  Pro Tip & Risk Note
                </td>
                <td className="px-5 py-3.5 text-sm text-[var(--text-muted)]">{itemA.proTip}</td>
                <td className="px-5 py-3.5 text-sm text-[var(--text-muted)]">{itemB.proTip}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Inline SVG Washer Cross-Section Diagram */}
      <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
        <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
          Flat Washer vs. Sinker Washer Orientation
        </h2>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Proper washer orientation prevents safety eyes from popping out of plush chenille or tight cotton stitches.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Standard Flat Washer (Cotton & Worsted #1–#4)
            </h3>
            <svg viewBox="0 0 320 130" className="mt-3 w-full h-32 text-[var(--text-primary)]" role="img" aria-label="Flat washer orientation diagram">
              {/* Crochet fabric layer */}
              <rect x="20" y="56" width="280" height="16" rx="4" fill="currentColor" opacity="0.18" />
              <text x="26" y="48" fontSize="11" fill="currentColor" opacity="0.75">Crochet Stitches</text>
              {/* Eye dome & post */}
              <path d="M136 56 C136 30, 184 30, 184 56 Z" fill="#C86D51" />
              <rect x="155" y="56" width="10" height="44" rx="2" fill="currentColor" opacity="0.85" />
              {/* Flat washer */}
              <rect x="128" y="74" width="64" height="9" rx="2" fill="#7A8B7B" />
              <text x="160" y="116" textAnchor="middle" fontSize="11" fill="currentColor">
                Flat rim sits flush against stitches
              </text>
            </svg>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Sinker / Cupped Washer (Plush Chenille #5–#6)
            </h3>
            <svg viewBox="0 0 320 130" className="mt-3 w-full h-32 text-[var(--text-primary)]" role="img" aria-label="Sinker washer orientation diagram">
              {/* Thick plush layer */}
              <rect x="20" y="50" width="280" height="24" rx="6" fill="currentColor" opacity="0.18" />
              <text x="26" y="42" fontSize="11" fill="currentColor" opacity="0.75">Thick Chenille Yarn</text>
              {/* Eye dome slightly recessed */}
              <path d="M136 60 C136 34, 184 34, 184 60 Z" fill="#C86D51" />
              <rect x="155" y="60" width="10" height="42" rx="2" fill="currentColor" opacity="0.85" />
              {/* Cupped washer facing away */}
              <path d="M126 75 L138 88 L182 88 L194 75" fill="none" stroke="#7A8B7B" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <text x="160" y="116" textAnchor="middle" fontSize="11" fill="currentColor">
                Cupped rim faces away to pull eye inward
              </text>
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
