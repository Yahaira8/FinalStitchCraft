import { PartProgressItem } from '../types';

export const YARN_WEIGHT_MAP: Record<
  string,
  { weight: number; baseHook: number; baseEye: number; label: string }
> = {
  'Fingering Cotton (#1)': { weight: 1, baseHook: 2.0, baseEye: 6, label: 'Super Fine (#1)' },
  'Sport Cotton (#2)': { weight: 2, baseHook: 2.5, baseEye: 8, label: 'Fine (#2)' },
  'DK / Worsted (#3 / #4)': { weight: 3.5, baseHook: 3.25, baseEye: 6, label: 'Light / Medium (#3-#4)' },
  'Worsted (#4)': { weight: 4, baseHook: 3.5, baseEye: 8, label: 'Medium Worsted (#4)' },
  'Worsted Plush (#4)': { weight: 4, baseHook: 4.0, baseEye: 8, label: 'Plush Worsted (#4)' },
  'Chunky Plush (#5)': { weight: 5, baseHook: 5.0, baseEye: 12, label: 'Bulky (#5)' },
  'Super Bulky Plush (#6)': { weight: 6, baseHook: 5.0, baseEye: 10, label: 'Super Bulky (#6)' },
};

export function toYouTubeWatchUrl(videoUrl: string): string {
  return videoUrl.replace('/embed/', '/watch?v=');
}

export function parsePatternInstructionsToParts(
  instructions: Record<string, string[]>
): Record<string, PartProgressItem> {
  const result: Record<string, PartProgressItem> = {};

  for (const [partName, lines] of Object.entries(instructions)) {
    let totalRows = 0;
    for (const line of lines) {
      const rangeMatch = line.trim().match(/^R(\d+)(?:-(\d+))?/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;
        totalRows += Math.max(1, end - start + 1);
      } else {
        totalRows += 1;
      }
    }
    result[partName] = {
      current_row: 0,
      total_rows: Math.max(1, totalRows),
      completed: false,
    };
  }

  return result;
}

export function calculateAmigurumiScale(
  originalYarnKey: string,
  targetYarnKey: string,
  originalEyeSizeMm: number
) {
  const orig = YARN_WEIGHT_MAP[originalYarnKey] || YARN_WEIGHT_MAP['Worsted (#4)'];
  const target = YARN_WEIGHT_MAP[targetYarnKey] || YARN_WEIGHT_MAP['Super Bulky Plush (#6)'];

  const scaleRatio = target.weight / orig.weight;
  const estimatedSizeMultiplier = Math.round(Math.pow(scaleRatio, 0.75) * 100) / 100;
  const safeEye = Number.isFinite(originalEyeSizeMm) && originalEyeSizeMm > 0 ? originalEyeSizeMm : orig.baseEye;
  const recommendedEyeSize = Math.max(4, Math.round(safeEye * Math.sqrt(scaleRatio)));

  return {
    scaleRatio: estimatedSizeMultiplier,
    recommendedHook: `${target.baseHook}mm`,
    recommendedEyeSize: `${recommendedEyeSize}mm`,
    stuffingMultiplier: Math.round(Math.pow(scaleRatio, 1.5) * 100) / 100,
  };
}

export function calculateOverallProgress(
  partProgress: Record<string, PartProgressItem>
): number {
  const parts = Object.values(partProgress);
  if (parts.length === 0) return 0;

  const totalRowsSum = parts.reduce((sum, p) => sum + Math.max(1, p.total_rows), 0);
  const currentRowsSum = parts.reduce(
    (sum, p) => sum + Math.min(p.current_row, p.total_rows),
    0
  );

  return Math.min(100, Math.round((currentRowsSum / totalRowsSum) * 100));
}

export function formatPartLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
