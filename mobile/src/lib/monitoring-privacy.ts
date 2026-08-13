const FILTERED = '[Filtered]';

const sensitiveKeyPattern =
  /(access|address|alarm|authorization|body|card|chat|cookie|cvv|cvc|description|email|gate|identity|id_document|instruction|lockbox|message|note|otp|password|payment|phone|pin|private[_-]?key|raw|secret|selfie|support|token)/i;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)\b/g;
const accessPhrasePattern =
  /\b(gate|access|alarm|lockbox|door|garage|parking)\s*(code|pin|password|instruction)?\s*[:#-]?\s*[A-Z0-9-]{3,}\b/gi;
const streetAddressPattern =
  /\b\d{1,6}\s+[A-Z][A-Z0-9.' -]{1,60}\s+(street|st|road|rd|avenue|ave|drive|dr|lane|ln|close|crescent|way|boulevard|blvd|place|pl)\b/gi;
const longCredentialPattern =
  /\b(?:eyJ[A-Za-z0-9_-]{20,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]+|sk\.[A-Za-z0-9._-]+|phx_[A-Za-z0-9_-]+|cfat_[A-Za-z0-9_-]+)\b/g;
const paymentNumberPattern = /\b(?:\d[ -]?){13,19}\b/g;

type SentryLikeBreadcrumb = {
  message?: string;
  data?: unknown;
};

type SentryLikeExceptionValue = {
  value?: string;
};

type SentryLikeEvent = {
  breadcrumbs?: SentryLikeBreadcrumb[];
  contexts?: unknown;
  exception?: {
    values?: SentryLikeExceptionValue[];
    [key: string]: unknown;
  };
  extra?: unknown;
  fingerprint?: unknown[];
  message?: string;
  request?: unknown;
  tags?: Record<string, unknown>;
  user?: {
    id?: string | number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export const scrubMobileMonitoringString = (value: string) =>
  value
    .replace(emailPattern, '[email redacted]')
    .replace(paymentNumberPattern, '[number redacted]')
    .replace(phonePattern, '[phone redacted]')
    .replace(accessPhrasePattern, '$1 code [redacted]')
    .replace(streetAddressPattern, '[address redacted]')
    .replace(longCredentialPattern, '[credential redacted]')
    .slice(0, 1200);

export const scrubMobileMonitoringValue = (value: unknown, depth = 0): unknown => {
  if (depth > 5) return FILTERED;
  if (typeof value === 'string') return scrubMobileMonitoringString(value);
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => scrubMobileMonitoringValue(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? FILTERED : scrubMobileMonitoringValue(item, depth + 1),
    ]),
  );
};

export const scrubMobileSentryEvent = <TEvent>(event: TEvent): TEvent => {
  const mutableEvent = event as SentryLikeEvent;

  mutableEvent.tags = {
    ...mutableEvent.tags,
    app: 'xoot-mobile',
  };
  mutableEvent.user = mutableEvent.user?.id ? { id: String(mutableEvent.user.id).slice(0, 80) } : undefined;
  mutableEvent.message = mutableEvent.message ? scrubMobileMonitoringString(mutableEvent.message) : mutableEvent.message;
  mutableEvent.contexts = scrubMobileMonitoringValue(mutableEvent.contexts);
  mutableEvent.extra = scrubMobileMonitoringValue(mutableEvent.extra);
  mutableEvent.request = scrubMobileMonitoringValue(mutableEvent.request);
  mutableEvent.fingerprint = undefined;
  mutableEvent.breadcrumbs = mutableEvent.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message ? scrubMobileMonitoringString(breadcrumb.message) : breadcrumb.message,
    data: scrubMobileMonitoringValue(breadcrumb.data),
  }));
  mutableEvent.exception = mutableEvent.exception
    ? {
        ...mutableEvent.exception,
        values: mutableEvent.exception.values?.map((value) => ({
          ...value,
          value: value.value ? scrubMobileMonitoringString(value.value) : value.value,
        })),
      }
    : mutableEvent.exception;

  return event;
};
