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
  | "abandoned_booking_15m"
  | "abandoned_booking_24h"
  | "booking_change_requested"
  | "payment_pending"
  | "booking_assigned"
  | "booking_accepted"
  | "job_day"
  | "invoice_ready"
  | "service_feedback_due"
  | "repeat_customer"
  | "care_plus_viewed"
  | "care_plus_checkout_started"
  | "care_plus_candidate"
  | "zootcred_earned"
  | "support_waiting"
  | "security_reauth_required"
  | "zooter_job_offer"
  | "zooter_active_today"
  | "zooter_eta_required"
  | "zooter_check_in_due"
  | "zooter_sensitive_access_ready"
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
  recentlyOpenedRoutes?: string[];
  channelFatigue?: Partial<Record<ZootNotificationChannel, number>>;
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
  personalizationTags: string[];
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

const TIME_SENSITIVE_SIGNALS = new Set<ZootNotificationBehaviorSignal>([
  "payment_pending",
  "booking_assigned",
  "booking_accepted",
  "job_day",
  "invoice_ready",
  "support_waiting",
  "security_reauth_required",
  "zooter_job_offer",
  "zooter_active_today",
  "zooter_eta_required",
  "zooter_check_in_due",
  "zooter_sensitive_access_ready",
]);

const behaviorBoostsPush = (signals: ZootNotificationBehaviorSignal[] = []) => signals.some((signal) => TIME_SENSITIVE_SIGNALS.has(signal));

const getPersonalizationTags = (signals: ZootNotificationBehaviorSignal[] = []) => {
  const tags = new Set<string>();

  if (signals.some((signal) => ["booking_started", "service_selected", "abandoned_booking_15m", "abandoned_booking_24h"].includes(signal))) {
    tags.add("booking_recovery");
  }
  if (signals.some((signal) => ["booking_assigned", "booking_accepted", "job_day", "booking_change_requested"].includes(signal))) {
    tags.add("booking_operations");
  }
  if (signals.some((signal) => ["payment_pending", "invoice_ready"].includes(signal))) {
    tags.add("payment_attention");
  }
  if (signals.some((signal) => ["repeat_customer", "care_plus_viewed", "care_plus_checkout_started", "care_plus_candidate"].includes(signal))) {
    tags.add("care_plus_lifecycle");
  }
  if (signals.includes("zootcred_earned")) tags.add("zootcred_lifecycle");
  if (signals.includes("support_waiting")) tags.add("support_followup");
  if (signals.includes("security_reauth_required")) tags.add("security_attention");
  if (signals.some((signal) => signal.startsWith("zooter_"))) tags.add("zooter_operations");
  if (signals.includes("inactive_14d")) tags.add("inactive_reengagement");

  return [...tags];
};

const applyChannelFatigue = (
  channels: ZootNotificationChannel[],
  profile: NotificationPersonalizationProfile,
  urgency: ZootNotificationUrgency,
  reasonCodes: string[],
) => {
  if (urgency === "urgent") return channels;

  const filtered = channels.filter((channel) => channel === "in_app" || (profile.channelFatigue?.[channel] ?? 0) < 3);
  if (filtered.length < channels.length) reasonCodes.push("channel_fatigue");
  return filtered;
};

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
  const personalizationTags = getPersonalizationTags(input.profile.behaviorSignals);
  const safeTitle = sanitizeNotificationText(input.title, 80) || "Zoot update";
  const safeBody = sanitizeNotificationText(input.body, 180) || null;
  const route = resolveNotificationLink(input.route);

  if (!roleAllowsCategory(input.profile.role, input.category)) {
    return { status: "suppress", channels: [], title: safeTitle, body: safeBody, route, reasonCodes: ["role_category_denied"], personalizationTags };
  }

  if (input.profile.mutedCategories?.includes(input.category)) {
    return { status: "suppress", channels: [], title: safeTitle, body: safeBody, route, reasonCodes: ["category_muted"], personalizationTags };
  }

  if (input.category === "marketing" && input.profile.marketingConsent !== true) {
    return { status: "suppress", channels: [], title: safeTitle, body: safeBody, route, reasonCodes: ["marketing_consent_missing"], personalizationTags };
  }

  if ((input.profile.dailySentCount ?? 0) >= 6 && urgency !== "urgent") {
    return { status: "route_only", channels: ["in_app"], title: safeTitle, body: safeBody, route, reasonCodes: ["daily_frequency_cap"], personalizationTags };
  }

  if ((input.profile.weeklySentCount ?? 0) >= 24 && urgency === "low") {
    return { status: "route_only", channels: ["in_app"], title: safeTitle, body: safeBody, route, reasonCodes: ["weekly_frequency_cap"], personalizationTags };
  }

  if (urgency === "low" && route && input.profile.recentlyOpenedRoutes?.includes(route)) {
    return { status: "route_only", channels: ["in_app"], title: safeTitle, body: safeBody, route, reasonCodes: ["recent_route_opened"], personalizationTags };
  }

  let channels = getCandidateChannels(input);

  if (input.profile.behaviorSignals?.includes("inactive_14d") && urgency === "low") {
    channels = channels.filter((channel) => channel === "in_app" || channel === "brevo_email");
    reasonCodes.push("inactive_reengagement_conservative");
  }

  if (isWithinQuietHours(input.profile, input.now) && urgency !== "urgent" && !behaviorBoostsPush(input.profile.behaviorSignals)) {
    channels = channels.filter((channel) => channel === "in_app");
    reasonCodes.push("quiet_hours");
  }

  channels = applyChannelFatigue(channels, input.profile, urgency, reasonCodes);

  if (containsSensitiveNotificationText(input.title) || containsSensitiveNotificationText(input.body)) {
    channels = channels.filter((channel) => !EXTERNAL_CHANNELS.has(channel));
    reasonCodes.push("sensitive_text_sanitized");
  }

  if (input.category === "sensitive_access") {
    reasonCodes.push("sensitive_access_app_required");
  }

  if (channels.length === 0) {
    return {
      status: "route_only",
      channels: ["in_app"],
      title: safeTitle,
      body: safeBody,
      route,
      reasonCodes: [...reasonCodes, "no_allowed_channel"],
      personalizationTags,
    };
  }

  return { status: "send", channels, title: safeTitle, body: safeBody, route, reasonCodes, personalizationTags };
};
