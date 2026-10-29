/** Pure validator for foreground worker fixes; invalid and replayed fixes are never uploaded. */
export type WorkerGpsReport = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: string;
};
export const WORKER_REPORT_SPACING_MS = 15_000;
export function validateForegroundWorkerFix(value: unknown, now = Date.now()): WorkerGpsReport | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp) ||
      raw.timestamp > now + 30_000 || now - raw.timestamp > 30_000) return null;
  if (!raw.coords || typeof raw.coords !== 'object' || Array.isArray(raw.coords)) return null;
  const coords = raw.coords as Record<string, unknown>;
  const { latitude, longitude, accuracy } = coords;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 100) return null;
  return { latitude, longitude, accuracyM: accuracy, capturedAt: new Date(raw.timestamp).toISOString() };
}
