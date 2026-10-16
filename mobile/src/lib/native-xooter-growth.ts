import type { XooterTrainingModule, XooterTrainingProgress } from './native-xooter-trust';

export type XooterGrowthSummary = {
  requiredTotal: number;
  requiredCompleted: number;
  optionalTotal: number;
  optionalCompleted: number;
  earnedPoints: number;
  availablePoints: number;
  badges: { moduleId: string; label: string; title: string }[];
  completeModuleIds: Set<string>;
};

/**
 * Points are recognition only. A complete module's real owner-bound progress is
 * required before any points/badges may be counted. The caller must reject
 * truncated catalogues/progress records instead of calling this with partial data.
 */
export function summariseXooterGrowth(
  modules: readonly XooterTrainingModule[],
  progress: readonly XooterTrainingProgress[],
): XooterGrowthSummary | null {
  const ids = new Set<string>();
  for (const module of modules) {
    if (!module.id || ids.has(module.id) || module.rank_points !== null &&
      (!Number.isSafeInteger(module.rank_points) || module.rank_points < 0)) return null;
    ids.add(module.id);
  }
  const uniqueProgress = new Map<string, XooterTrainingProgress>();
  for (const row of progress) {
    if (!row.module_id || uniqueProgress.has(row.module_id)) return null;
    uniqueProgress.set(row.module_id, row);
  }
  const completed = new Set<string>();
  let requiredCompleted = 0, optionalCompleted = 0, requiredTotal = 0;
  let optionalTotal = 0, earnedPoints = 0, availablePoints = 0;
  const badges: XooterGrowthSummary['badges'] = [];
  for (const module of modules) {
    if (module.required) requiredTotal++; else optionalTotal++;
    const points = module.rank_points ?? 0;
    availablePoints += points;
    if (!Number.isSafeInteger(availablePoints)) return null;
    if (!uniqueProgress.get(module.id)?.completed) continue;
    completed.add(module.id);
    if (module.required) requiredCompleted++; else optionalCompleted++;
    earnedPoints += points;
    if (!Number.isSafeInteger(earnedPoints)) return null;
    if (module.badge_label) {
      badges.push({ moduleId: module.id, label: module.badge_label, title: module.title });
    }
  }
  return {
    requiredTotal, requiredCompleted, optionalTotal, optionalCompleted,
    earnedPoints, availablePoints, badges, completeModuleIds: completed,
  };
}

export function xooterGrowthPercentage(done: number, total: number): number {
  if (!Number.isInteger(done) || !Number.isInteger(total) || total <= 0 ||
    done < 0 || done > total) return 0;
  return Math.round((done / total) * 100);
}
