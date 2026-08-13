export type NativeLaunchIntent = 'book' | 'concierge' | 'care_plus' | 'bookings' | 'xooter_jobs' | 'default';

export type NativeLaunchModeInput = {
  forceStatic?: boolean;
  isLowPowerMode?: boolean;
  prefersReducedMotion?: boolean;
};

export type NativeLaunchQueryParams = Record<string, string | string[] | undefined>;

const safeServiceValues = new Set(['residential', 'express', 'office', 'airbnb', 'moving', 'deep', 'premium']);

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const safeTextParam = (value: string | string[] | undefined) => {
  const next = firstParam(value)?.trim() ?? '';
  if (!next || next.length > 120) return null;
  if (/[<>"'`\\]/.test(next)) return null;
  return next;
};

const safeDateParam = (value: string | string[] | undefined) => {
  const next = safeTextParam(value);
  return next && /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null;
};

export const nativeLaunchAssets = Object.freeze({
  source: 'bundled-native',
  remoteAssets: false,
  webView: false,
  material: 'clear-liquid-glass',
});

export const getNativeLaunchMode = ({
  forceStatic = false,
  isLowPowerMode = false,
  prefersReducedMotion = false,
}: NativeLaunchModeInput) => (forceStatic || isLowPowerMode || prefersReducedMotion ? 'static' : 'motion');

export const resolveNativeLaunchIntent = (params: NativeLaunchQueryParams): NativeLaunchIntent => {
  const intent = safeTextParam(params.intent)?.toLowerCase();
  const xootBot = safeTextParam(params.xootBot)?.toLowerCase();

  if (intent === 'book_clean' || intent === 'book_cleaner') return 'book';
  if (intent === 'concierge' || xootBot === 'open') return 'concierge';
  if (intent === 'care_plus' || intent === 'care+') return 'care_plus';
  if (intent === 'bookings' || intent === 'booking_status') return 'bookings';
  if (intent === 'xooter_jobs') return 'xooter_jobs';

  return 'default';
};

export const shouldBypassNativeLaunchExperience = (intent: NativeLaunchIntent) => intent !== 'default';

export const buildNativeLaunchTarget = (intent: NativeLaunchIntent, params: NativeLaunchQueryParams) => {
  if (intent === 'concierge') return '/concierge';
  if (intent === 'care_plus') return '/care-plus';
  if (intent === 'bookings') return '/bookings?intent=bookings';
  if (intent === 'xooter_jobs') return '/xooter/jobs?intent=xooter_jobs';
  if (intent !== 'book') return '/';

  const query = new URLSearchParams();
  query.set('intent', 'book_clean');

  const service = safeTextParam(params.service)?.toLowerCase();
  if (service && safeServiceValues.has(service)) query.set('service', service);

  const date = safeDateParam(params.date);
  if (date) query.set('date', date);

  const area = safeTextParam(params.area);
  if (area) query.set('area', area);

  return `/book?${query.toString()}`;
};

/**
 * Whether the Zoey launch animation plays on this start.
 *
 * Two reasons not to, and both already have an owner in this module rather than a
 * second opinion in the layout:
 *
 * - A deep link is somewhere to *arrive*. Someone opening a booking, Concierge or a
 *   voice intent is mid-task, and `shouldBypassNativeLaunchExperience` already says
 *   so — a brand flourish in front of that is an obstacle, not a welcome.
 * - `getNativeLaunchMode` already collapses Reduce Motion, Low Power Mode and the
 *   force-static override into one answer. Low Power in particular is a real reason
 *   to skip a 60fps animation at app start, and it would have been missed by checking
 *   Reduce Motion alone.
 */
export const shouldPlayLaunchAnimation = ({
  intent,
  launchMode,
}: {
  intent: NativeLaunchIntent;
  launchMode: ReturnType<typeof getNativeLaunchMode>;
}) => !shouldBypassNativeLaunchExperience(intent) && launchMode === 'motion';
