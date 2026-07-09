import { resolveNotificationLink } from "./notification-routing";

export type ZootNotificationCategory =
  | "booking"
  | "support"
  | "care_plus"
  | "zootcred"
  | "security"
  | "zooter_jobs"
  | "sensitive_access"
  | "marketing";

export type ZootNotificationChannel =
  | "in_app"
  | "expo_push"
  | "brevo_email"
  | "whatsapp_urgent"
  | "sms_fallback"
  | "twilio_voice";

export type ZootNotificationUrgency = "low" | "normal" | "high" | "urgent";

export type ZootNotificationBehaviorSignal =
  | "new_user"
  | "booking_started"
  | "service_selected"
  | "payment_pending"
  | "booking_assigned"
  | "booking_accepted"
  | "job_day"
  | "repeat_customer"
  | "care_plus_candidate"
  | "support_waiting"
  | "zooter_active_today"
  | "inactive_14d";

export type NotificationPersonalizationProfile = {
  role: "guest" | "customer" | "zooter" | "admin" | "support";
  timezone?: string;
  localHour?: number;
  behaviorSignals?: ZootNotificationBehaviorSignal[];
  preferredChannels?: ZootNotificationChannel[];
  mutedCategories?: ZootNotificationCategory[];
  marketingConsent?: boolean;
  dailySentCount?: number;
  weeklySentCount?: number;
  quietHours?: {
    startHour: number;
    endHour: number;
  };
};

export type NotificationDecisionInput = {
  category: ZootNotificationCategory;
  urgency?: ZootNotificationUrgency;
  title: string;
  body?: string | null;
  route?: string | null;
  profile: NotificationPersonalizationProfile;
  now?: Date;
};

export type NotificationDecision = {
  status: "send" | "suppress" | "route_only";
  channels: ZootNotificationChannel[];
  title: string;
  body: string | null;
  route: string | null;
  reasonCodes: string[];
};

const DEFAULT_CHANNELS: ZootNotificationChannel[] = ["in_app", "expo_push"];
const EXTERNAL_CHANNELS = new Set<ZootNotificationChannel>(["brevo_email", "whatsapp_urgent", "sms_fallback", "twilio_voice"]);
const SENSITIVE_PATTERNS = [
  /\b(gate|alarm|lockbox|door|entry)\s*(code|pin|password)\b/i,
  /\b(otp|one[-\s]?time\s?pin|cvv|cvc|card number|bank account)\b/i,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  /\b(?:\+?27|0)\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:unit|flat|apartment|apt|house|number|no\.?)\s+\d+[A-Za-z]?\b/i,
];

const clampHour = (value: number | undefined, fallback: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(23, Math.floor(value)));
};

const normalizeText = (value: string, maxLength: number) =>
  value
    .replace(/[<>`\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

export const containsSensitiveNotificationText = (value: string | null | undefined) => {
  if (!value) return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
};

export const sanitizeNotificationText = (value: string | null | undefined, maxLength = 180) => {
  const text = normalizeText(value ?? "", maxLength);
  if (!text) return "";
  if (!containsSensitiveNotificationText(text)) return text;
  return "Open Zoot to view this securely.";
};

export const isWithinQuietHours = (profile: NotificationPersonalizationProfile, now = new Date()) => {
  const quiet = profile.quietHours ?? { startHour: 21, endHour: 7 };
  const hour = clampHour(profile.localHour, now.getHours());
  const start = clampHour(quiet.startHour, 21);
  const end = clampHour(quiet.endHour, 7);

  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

const roleAllowsCategory = (role: NotificationPersonalizationProfile["role"], category: ZootNotificationCategory) => {
  if (role === "guest") return category === "marketing";
  if (role === "zooter") return category === "zooter_jobs" || category === "support" || category === "security" || category === "sensitive_access";
  if (role === "admin" || role === "support") return category === "support" || category === "security";
  return category !== "zooter_jobs";
};

const behaviorBoostsPush = (signals: ZootNotificationBehaviorSignal[] = []) =>
  signals.some((signal) => ["payment_pending", "booking_assigned", "booking_accepted", "job_day", "support_waiting", "zooter_active_today"].includes(signal));

const getCandidateChannels = (input: NotificationDecisionInput) => {
  const preferred = input.profile.preferredChannels?.length ? input.profile.preferredChannels : DEFAULT_CHANNELS;
  const channels = preferred.filter((channel, index, all) => all.indexOf(channel) === index);

  if (input.category === "security") return channels.filter((channel) => channel === "in_app" || channel === "expo_push" || channel === "brevo_email");
  if (input.category === "sensitive_access") return channels.filter((channel) => channel === "in_app" || channel === "expo_push");
  if (input.category === "marketing") return channels.filter((channel) => channel === "in_app" || channel === "brevo_email");
  if (input.category === "support" && input.urgency === "urgent") {
    return channels.filter((channel) => channel === "in_app" || channel === "expo_push" || channel === "brevo_email" || channel === "whatsapp_urgent");
  }

  return channels.filter((channel) => channel === "in_app" || channel === "expo_push" || channel === "brevo_email");
};

export const buildPersonalizedNotificationDecision = (input: NotificationDecisionInput): NotificationDecision => {
  const urgency = input.urgency ?? "normal";
  const reasonCodes: string[] = [];
  const safeTitle = sanitizeNotificationText(input.title, 80) || "Zoot update";
  const safeBody = sanitizeNotificationText(input.body, 180) || null;
  const route = resolveNotificationLink(input.route);

  if (!roleAllowsCategory(input.profile.role, input.category)) {
    return { status: "suppress", channels: [], title: safeTitle, body: safeBody, route, reasonCodes: ["role_category_denied"] };
  }

  if (input.profile.mutedCategories?.includes(input.category)) {
    return { status: "suppress", channels: [], title: safeTitle, body: safeBody, route, reasonCodes: ["category_muted"] };
  }

  if (input.category === "marketing" && input.profile.marketingConsent !== true) {
    return { status: "suppress", channels: [], title: safeTitle, body: safeBody, route, reasonCodes: ["marketing_consent_missing"] };
  }

  if ((input.profile.dailySentCount ?? 0) >= 6 && urgency !== "urgent") {
    return { status: "route_only", channels: ["in_app"], title: safeTitle, body: safeBody, route, reasonCodes: ["daily_frequency_cap"] };
  }

  if ((input.profile.weeklySentCount ?? 0) >= 24 && urgency === "low") {
    return { status: "route_only", channels: ["in_app"], title: safeTitle, body: safeBody, route, reasonCodes: ["weekly_frequency_cap"] };
  }

  let channels = getCandidateChannels(input);

  if (isWithinQuietHours(input.profile, input.now) && urgency !== "urgent" && !behaviorBoostsPush(input.profile.behaviorSignals)) {
    channels = channels.filter((channel) => channel === "in_app");
    reasonCodes.push("quiet_hours");
  }

  if (containsSensitiveNotificationText(input.title) || containsSensitiveNotificationText(input.body)) {
    channels = channels.filter((channel) => !EXTERNAL_CHANNELS.has(channel));
    reasonCodes.push("sensitive_text_sanitized");
  }

  if (input.category === "sensitive_access") {
    reasonCodes.push("sensitive_access_app_required");
  }

  if (channels.length === 0) {
    return { status: "route_only", channels: ["in_app"], title: safeTitle, body: safeBody, route, reasonCodes: [...reasonCodes, "no_allowed_channel"] };
  }

  return { status: "send", channels, title: safeTitle, body: safeBody, route, reasonCodes };
};
