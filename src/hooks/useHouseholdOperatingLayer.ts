import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FavouriteZooter, PropertyProfile, SmartReminder } from "@/types/care-plus";

type HouseholdProfileRow = {
  id: string;
  label?: string | null;
  pet_notes?: string | null;
  parking_instructions?: string | null;
  cleaning_preferences?: string | null;
  fragile_areas?: string | null;
  favourite_products?: string | null;
  access_notes?: string | null;
  is_default?: boolean | null;
  updated_at?: string | null;
};

type PropertyAccountRow = {
  id: string;
  account_type?: string | null;
  name?: string | null;
  default_service_type?: string | null;
  preferred_days?: string[] | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BookingRow = {
  id: string;
  scheduled_at: string;
  status: string;
  service?: string | null;
  duration_hours?: number | null;
  zooter_id?: string | null;
};

type FavouriteRow = {
  zooter_id: string;
  favorite_kind?: string | null;
  repeat_bookings_count?: number | null;
  last_booked_at?: string | null;
  created_at?: string | null;
};

type PublicZooterRow = {
  id: string;
  name: string;
  rating?: number | null;
  tags?: string[] | null;
  role?: string | null;
  jobs_completed?: number | null;
};

type SupportTicketRow = {
  id: string;
  subject: string;
  status: string;
  created_at: string;
};

export type HomeMemorySnapshot = {
  id: string;
  label: string;
  petNotes: string;
  parkingInstructions: string;
  cleaningPreferences: string;
  fragileAreas: string;
  favouriteProducts: string;
  hasAccessNotes: boolean;
  readinessScore: number;
  updatedAt: string | null;
};

export type ReadyMode = {
  id: string;
  title: string;
  summary: string;
  status: "ready" | "needs_setup" | "watch";
  readinessScore: number;
  actionLabel: string;
  path: string;
};

export type BookingSnapshot = {
  id: string;
  scheduledAt: string;
  status: string;
  service: string;
  durationHours: number;
};

export type ServiceRecoverySignal = {
  id: string;
  title: string;
  summary: string;
  priority: "low" | "normal" | "high";
  path: string;
};

export type HouseholdOperatingLayer = {
  homeMemory: HomeMemorySnapshot | null;
  propertyProfiles: PropertyProfile[];
  householdCircle: {
    favourite: FavouriteZooter | null;
    backupZooters: FavouriteZooter[];
    savedCount: number;
    recurringCount: number;
  };
  readyModes: ReadyMode[];
  recentBookings: BookingSnapshot[];
  serviceRecovery: ServiceRecoverySignal[];
  lifecycleTriggers: SmartReminder[];
};

const emptyLayer: HouseholdOperatingLayer = {
  homeMemory: null,
  propertyProfiles: [],
  householdCircle: {
    favourite: null,
    backupZooters: [],
    savedCount: 0,
    recurringCount: 0,
  },
  readyModes: [],
  recentBookings: [],
  serviceRecovery: [],
  lifecycleTriggers: [],
};

const accountTypeMap: Record<string, PropertyProfile["type"]> = {
  airbnb_host: "airbnb",
  landlord: "landlord",
  property_manager: "landlord",
  office_estate: "small_office",
};

const titleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export const getHomeMemoryReadinessScore = (row: HouseholdProfileRow | null) => {
  if (!row) return 0;
  const checks = [
    hasText(row.label),
    hasText(row.pet_notes),
    hasText(row.parking_instructions),
    hasText(row.cleaning_preferences),
    hasText(row.fragile_areas),
    hasText(row.favourite_products),
    hasText(row.access_notes),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

export const getPropertyReadinessScore = (row: PropertyAccountRow) => {
  const checks = [
    hasText(row.name),
    hasText(row.default_service_type),
    Boolean(row.preferred_days?.length),
    hasText(row.notes),
    row.status === "active",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const mapHomeMemory = (row: HouseholdProfileRow | null): HomeMemorySnapshot | null => {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label?.trim() || "Home",
    petNotes: row.pet_notes?.trim() || "No pet notes saved yet.",
    parkingInstructions: row.parking_instructions?.trim() || "No parking instructions saved yet.",
    cleaningPreferences: row.cleaning_preferences?.trim() || "No cleaning preferences saved yet.",
    fragileAreas: row.fragile_areas?.trim() || "No fragile areas saved yet.",
    favouriteProducts: row.favourite_products?.trim() || "No product preferences saved yet.",
    hasAccessNotes: hasText(row.access_notes),
    readinessScore: getHomeMemoryReadinessScore(row),
    updatedAt: row.updated_at ?? null,
  };
};

export const mapPropertyAccountToProfile = (row: PropertyAccountRow): PropertyProfile => {
  const type = accountTypeMap[row.account_type ?? ""] ?? "primary_home";
  const preferredDays = row.preferred_days?.length ? `Preferred days: ${row.preferred_days.join(", ")}` : "";
  return {
    id: row.id,
    name: row.name?.trim() || "Saved property",
    type,
    suburb: type === "small_office" ? "Office profile" : type === "airbnb" ? "Host property" : "Saved property",
    defaultService: row.default_service_type ? titleCase(row.default_service_type) : "Cleaning",
    readinessScore: getPropertyReadinessScore(row),
    turnoverInstructions: row.notes?.trim() || preferredDays || "No property notes saved yet.",
    cleaningHistoryCount: 0,
  };
};

const mapBooking = (row: BookingRow): BookingSnapshot => ({
  id: row.id,
  scheduledAt: row.scheduled_at,
  status: row.status,
  service: row.service ? titleCase(row.service) : "Cleaning",
  durationHours: toNumber(row.duration_hours, 0),
});

const mapFavourite = (zooter: PublicZooterRow, favourite?: FavouriteRow | null): FavouriteZooter => ({
  id: zooter.id,
  name: zooter.name,
  rating: toNumber(zooter.rating, 0),
  specialties: zooter.tags?.length ? zooter.tags : [zooter.role ?? "Cleaning"],
  lastBookedAt: favourite?.last_booked_at ?? favourite?.created_at ?? "",
  nextAvailableAt: "",
  preferredFor: favourite?.favorite_kind === "recurring_favorite"
    ? "Recurring favourite"
    : zooter.jobs_completed
      ? `${zooter.jobs_completed} completed jobs`
      : "Saved in My Zooters",
});

export const buildReadyModes = (
  homeMemory: HomeMemorySnapshot | null,
  properties: PropertyProfile[],
  bookings: BookingSnapshot[],
): ReadyMode[] => {
  const modes: ReadyMode[] = [];

  modes.push({
    id: "home-memory",
    title: "Home Memory",
    summary: homeMemory
      ? "Pets, preferences, fragile areas and access context are saved inside your authenticated app."
      : "Save your household profile once so every future booking starts with the right context.",
    status: homeMemory && homeMemory.readinessScore >= 70 ? "ready" : "needs_setup",
    readinessScore: homeMemory?.readinessScore ?? 0,
    actionLabel: "Update home profile",
    path: "/app/profile",
  });

  const hostProperties = properties.filter((property) => property.type === "airbnb" || property.type === "landlord");
  if (hostProperties.length > 0) {
    const readiness = Math.round(hostProperties.reduce((sum, property) => sum + property.readinessScore, 0) / hostProperties.length);
    modes.push({
      id: "guest-ready",
      title: "Guest-Ready Mode",
      summary: `${hostProperties.length} host ${hostProperties.length === 1 ? "property" : "properties"} prepared for turnover planning.`,
      status: readiness >= 70 ? "ready" : "watch",
      readinessScore: readiness,
      actionLabel: "Open host dashboard",
      path: "/app/airbnb-host",
    });
  }

  const officeProperties = properties.filter((property) => property.type === "small_office");
  if (officeProperties.length > 0) {
    const readiness = Math.round(officeProperties.reduce((sum, property) => sum + property.readinessScore, 0) / officeProperties.length);
    modes.push({
      id: "workplace-ready",
      title: "Workplace Ready",
      summary: `${officeProperties.length} office ${officeProperties.length === 1 ? "profile" : "profiles"} available for recurring workplace cleans.`,
      status: readiness >= 70 ? "ready" : "watch",
      readinessScore: readiness,
      actionLabel: "Open office dashboard",
      path: "/app/office",
    });
  }

  const lastBooking = bookings[0];
  if (lastBooking) {
    modes.push({
      id: "one-tap-rebook",
      title: "One-Tap Rebook",
      summary: `Last ${lastBooking.service.toLowerCase()} is ready to repeat from your booking history.`,
      status: lastBooking.status === "completed" || lastBooking.status === "rated" ? "ready" : "watch",
      readinessScore: lastBooking.status === "completed" || lastBooking.status === "rated" ? 100 : 60,
      actionLabel: "Book again",
      path: "/app",
    });
  }

  return modes;
};

export const buildLifecycleTriggers = (
  lastBookingAt: string | null,
  propertiesCount: number,
  homeMemoryScore: number,
  now = new Date(),
): SmartReminder[] => {
  const triggers: SmartReminder[] = [];

  if (!lastBookingAt) {
    triggers.push({
      id: "first-booking",
      message: "Start with one clean, then let Care+ remember the details that usually take time to repeat.",
      intent: "rebook",
      cta: "Book a clean",
      priority: "normal",
    });
  } else {
    const daysSince = Math.max(0, Math.floor((now.getTime() - new Date(lastBookingAt).getTime()) / 86_400_000));
    if (daysSince >= 21) {
      triggers.push({
        id: "rebook-gap",
        message: `Your last clean was ${daysSince} days ago. A reset now can keep the home from becoming a weekend project.`,
        intent: "rebook",
        cta: "Rebook",
        priority: "high",
      });
    } else if (daysSince >= 10) {
      triggers.push({
        id: "usual-rhythm",
        message: `Your last clean was ${daysSince} days ago. Check the next good slot before the week fills up.`,
        intent: "slot",
        cta: "Check slots",
        priority: "normal",
      });
    }
  }

  if (homeMemoryScore > 0 && homeMemoryScore < 70) {
    triggers.push({
      id: "complete-home-memory",
      message: "Your Home Memory is partly set up. Add the missing preferences once and future cleans start smoother.",
      intent: "default_addon",
      cta: "Update notes",
      priority: "normal",
    });
  }

  if (propertiesCount > 0) {
    triggers.push({
      id: "property-ops",
      message: "Your saved property profiles can now support host, landlord, and office planning from one place.",
      intent: "turnover",
      cta: "View properties",
      priority: "low",
    });
  }

  return triggers.slice(0, 3);
};

export const buildServiceRecoverySignals = (
  bookings: BookingSnapshot[],
  tickets: SupportTicketRow[],
): ServiceRecoverySignal[] => {
  const openTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  const disruptedBooking = bookings.find((booking) =>
    ["cancelled", "replacement_required", "replacement_offered"].includes(booking.status)
  );

  const signals: ServiceRecoverySignal[] = openTickets.slice(0, 2).map((ticket) => ({
    id: `ticket-${ticket.id}`,
    title: "Support follow-up open",
    summary: ticket.subject,
    priority: ticket.status === "urgent" ? "high" : "normal",
    path: "/app/support",
  }));

  if (disruptedBooking) {
    signals.push({
      id: `booking-${disruptedBooking.id}`,
      title: "Booking needs attention",
      summary: `Your ${disruptedBooking.service.toLowerCase()} is marked ${titleCase(disruptedBooking.status)}.`,
      priority: "high",
      path: "/app/support",
    });
  }

  return signals.slice(0, 3);
};

const resolveZooters = async (favorites: FavouriteRow[]) => {
  const zooterIds = [...new Set(favorites.map((favorite) => favorite.zooter_id).filter(Boolean))];
  if (zooterIds.length === 0) return [];

  const { data } = await (supabase as any)
    .from("zooters_public")
    .select("id,name,rating,tags,role,jobs_completed")
    .in("id", zooterIds);

  const zooters = (Array.isArray(data) ? data : []) as PublicZooterRow[];
  const favoriteByZooter = new Map(favorites.map((favorite) => [favorite.zooter_id, favorite]));
  return zooterIds
    .map((id) => zooters.find((zooter) => zooter.id === id))
    .filter((zooter): zooter is PublicZooterRow => Boolean(zooter))
    .map((zooter) => mapFavourite(zooter, favoriteByZooter.get(zooter.id)));
};

export const useHouseholdOperatingLayer = () => {
  const { user, loading: authLoading } = useAuth();
  const [layer, setLayer] = useState<HouseholdOperatingLayer>(emptyLayer);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setLayer(emptyLayer);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [householdResult, propertyResult, bookingResult, favoriteResult, supportResult] = await Promise.all([
        (supabase as any)
          .from("household_profiles")
          .select("id,label,pet_notes,parking_instructions,cleaning_preferences,fragile_areas,favourite_products,access_notes,is_default,updated_at")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from("property_accounts")
          .select("id,account_type,name,default_service_type,preferred_days,notes,status,created_at,updated_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("bookings")
          .select("id,scheduled_at,status,service,duration_hours,zooter_id")
          .eq("user_id", user.id)
          .order("scheduled_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("favorites")
          .select("zooter_id,favorite_kind,repeat_bookings_count,last_booked_at,created_at")
          .eq("user_id", user.id)
          .order("last_booked_at", { ascending: false, nullsFirst: false })
          .limit(6),
        (supabase as any)
          .from("support_tickets")
          .select("id,subject,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const firstError = [householdResult, propertyResult, bookingResult, favoriteResult, supportResult]
        .map((result) => result.error?.message)
        .find(Boolean);
      if (firstError) setError(firstError);

      const homeMemory = mapHomeMemory((householdResult.data as HouseholdProfileRow | null) ?? null);
      const properties = Array.isArray(propertyResult.data)
        ? (propertyResult.data as PropertyAccountRow[]).map(mapPropertyAccountToProfile)
        : [];
      const bookings = Array.isArray(bookingResult.data)
        ? (bookingResult.data as BookingRow[]).map(mapBooking)
        : [];
      const favorites = Array.isArray(favoriteResult.data) ? (favoriteResult.data as FavouriteRow[]) : [];
      const zooters = await resolveZooters(favorites);
      const tickets = Array.isArray(supportResult.data) ? (supportResult.data as SupportTicketRow[]) : [];

      setLayer({
        homeMemory,
        propertyProfiles: properties,
        householdCircle: {
          favourite: zooters[0] ?? null,
          backupZooters: zooters.slice(1, 4),
          savedCount: favorites.length,
          recurringCount: favorites.filter((favorite) => favorite.favorite_kind === "recurring_favorite").length,
        },
        readyModes: buildReadyModes(homeMemory, properties, bookings),
        recentBookings: bookings,
        serviceRecovery: buildServiceRecoverySignals(bookings, tickets),
        lifecycleTriggers: buildLifecycleTriggers(bookings[0]?.scheduledAt ?? null, properties.length, homeMemory?.readinessScore ?? 0),
      });
    } catch (refreshError) {
      setLayer(emptyLayer);
      setError(refreshError instanceof Error ? refreshError.message : "Household operating data could not load.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      ...layer,
      loading: authLoading || loading,
      error,
      refresh,
    }),
    [authLoading, error, layer, loading, refresh],
  );
};
