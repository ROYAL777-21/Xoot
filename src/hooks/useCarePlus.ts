import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { carePlusPlan as fallbackCarePlusPlan } from "@/data/care-plus";
import type { CarePlusMembership, CarePlusPlan, FavouriteZooter, PropertyProfile, SmartReminder } from "@/types/care-plus";

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "paused" | "cancelled" | "pending_payment" | "past_due" | string;
  started_at: string;
  next_billing_at: string;
  checkout_url?: string | null;
  cancelled_at?: string | null;
  favourite_zooter_id?: string | null;
};

type SubscriptionPlanRow = {
  id: string;
  name: string;
  cadence: string;
  monthly_price: number | string;
  perks?: string[] | null;
};

type PaymentRecordRow = {
  id: string;
  meta?: Record<string, unknown> | null;
};

type FavouriteRow = {
  zooter_id: string;
  favorite_kind?: string | null;
  favorite_type?: string | null;
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

type PropertyAccountRow = {
  id: string;
  account_type: string;
  name: string;
  default_service_type?: string | null;
  preferred_days?: string[] | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type BookingRow = {
  id: string;
  scheduled_at: string;
  status: string;
};

export type CarePlusState =
  | { status: "unauthenticated" }
  | { status: "not_member"; plan: CarePlusPlan }
  | { status: "pending_payment"; checkout_url: string }
  | { status: "active"; membership: CarePlusMembership; favourite: FavouriteZooter | null }
  | { status: "past_due"; membership: CarePlusMembership }
  | { status: "cancelled"; cancelled_at: string };

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
};

const mapPlan = (row: SubscriptionPlanRow | null): CarePlusPlan => ({
  ...fallbackCarePlusPlan,
  id: row?.id ?? fallbackCarePlusPlan.id,
  name: row?.name ?? fallbackCarePlusPlan.name,
  priceZar: toNumber(row?.monthly_price, fallbackCarePlusPlan.priceZar),
  benefits: row?.perks?.length ? row.perks : fallbackCarePlusPlan.benefits,
});

const mapMembership = (subscription: SubscriptionRow, plan: CarePlusPlan): CarePlusMembership => ({
  id: subscription.id,
  userId: subscription.user_id,
  planId: subscription.plan_id,
  status: subscription.status === "pending_payment" || subscription.status === "past_due" ? "paused" : (subscription.status as CarePlusMembership["status"]),
  priceZar: plan.priceZar,
  billingCadence: "monthly",
  startedAt: subscription.started_at,
  renewsAt: subscription.next_billing_at,
  addOnCreditZar: 30,
  addOnCreditExpiresAt: subscription.next_billing_at,
  zootCredMultiplier: 1.5,
  homeReadinessScore: 0,
  favouriteZooterId: subscription.favourite_zooter_id ?? undefined,
});

const mapFavourite = (zooter: PublicZooterRow, favourite?: FavouriteRow | null): FavouriteZooter => ({
  id: zooter.id,
  name: zooter.name,
  rating: toNumber(zooter.rating, 0),
  specialties: zooter.tags?.length ? zooter.tags : [zooter.role ?? "Cleaning"],
  lastBookedAt: favourite?.last_booked_at ?? favourite?.created_at ?? "",
  nextAvailableAt: "",
  preferredFor: zooter.jobs_completed ? `${zooter.jobs_completed} completed jobs` : "Saved in My Zooters",
});

const accountTypeMap: Record<string, PropertyProfile["type"]> = {
  airbnb_host: "airbnb",
  landlord: "landlord",
  property_manager: "landlord",
  office_estate: "small_office",
};

const getReadinessScore = (row: PropertyAccountRow) => {
  const checks = [row.name, row.default_service_type, row.preferred_days?.length, row.notes, row.status === "active"];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const mapProperty = (row: PropertyAccountRow): PropertyProfile => ({
  id: row.id,
  name: row.name,
  type: accountTypeMap[row.account_type] ?? "primary_home",
  suburb: "Saved property",
  defaultService: row.default_service_type ?? "Cleaning",
  readinessScore: getReadinessScore(row),
  turnoverInstructions: row.notes ?? (row.preferred_days?.length ? `Preferred days: ${row.preferred_days.join(", ")}` : "No property notes saved yet."),
  cleaningHistoryCount: 0,
});

export const buildCarePlusSmartReminders = (lastBookingAt: string | null): SmartReminder[] => {
  if (!lastBookingAt) {
    return [
      {
        id: "first-care-plus-booking",
        message: "Care+ is ready when your first completed booking lands. Save the home details once, then keep the rhythm.",
        intent: "rebook",
        cta: "Book a clean",
        priority: "normal",
      },
    ];
  }

  const daysSince = Math.max(0, Math.floor((Date.now() - new Date(lastBookingAt).getTime()) / 86_400_000));
  if (daysSince >= 21) {
    return [
      {
        id: "rebook-after-gap",
        message: `Your last clean was ${daysSince} days ago. A quick reset now can stop the home from feeling like a weekend project.`,
        intent: "rebook",
        cta: "Rebook",
        priority: "high",
      },
    ];
  }

  if (daysSince >= 10) {
    return [
      {
        id: "usual-rhythm",
        message: `Your last clean was ${daysSince} days ago. Care+ can help keep the same rhythm before the week gets full.`,
        intent: "slot",
        cta: "Check slots",
        priority: "normal",
      },
    ];
  }

  return [
    {
      id: "after-clean-calm",
      message: `Your last clean was ${daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`}. Save any new home notes while they are still fresh.`,
      intent: "default_addon",
      cta: "Update notes",
      priority: "low",
    },
  ];
};

const getCheckoutUrl = (subscription: SubscriptionRow, payment: PaymentRecordRow | null) => {
  const meta = payment?.meta ?? {};
  const checkoutUrl = subscription.checkout_url ?? meta.checkout_url ?? meta.payment_url ?? meta.checkoutUrl;
  return typeof checkoutUrl === "string" && checkoutUrl ? checkoutUrl : `/app/plans?payment_record_id=${payment?.id ?? subscription.id}`;
};

export const useCarePlus = () => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<CarePlusState>({ status: "unauthenticated" });
  const [plan, setPlan] = useState<CarePlusPlan>(fallbackCarePlusPlan);
  const [properties, setProperties] = useState<PropertyProfile[]>([]);
  const [lastBookingAt, setLastBookingAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reminders = useMemo(() => buildCarePlusSmartReminders(lastBookingAt), [lastBookingAt]);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);

    const { data: planRow } = await supabase
      .from("subscription_plans")
      .select("id,name,cadence,monthly_price,perks")
      .ilike("name", "%Care%")
      .order("monthly_price", { ascending: true })
      .limit(1)
      .maybeSingle();

    const activePlan = mapPlan((planRow as SubscriptionPlanRow | null) ?? null);
    setPlan(activePlan);

    if (!user) {
      setState({ status: "unauthenticated" });
      setProperties([]);
      setLastBookingAt(null);
      setLoading(false);
      return;
    }

    const [
      subscriptionResult,
      propertiesResult,
      bookingResult,
    ] = await Promise.all([
      (supabase as any)
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_id", activePlan.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from("property_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("id,scheduled_at,status")
        .eq("user_id", user.id)
        .in("status", ["completed", "rated"])
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (subscriptionResult.error) {
      setError(subscriptionResult.error.message);
      setState({ status: "not_member", plan: activePlan });
    } else {
      const subscription = subscriptionResult.data as SubscriptionRow | null;
      if (!subscription) {
        setState({ status: "not_member", plan: activePlan });
      } else if (subscription.status === "pending_payment") {
        const { data: payment } = await (supabase as any)
          .from("payment_records")
          .select("id,meta")
          .eq("user_id", user.id)
          .eq("payment_kind", "homecare_membership")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setState({ status: "pending_payment", checkout_url: getCheckoutUrl(subscription, (payment as PaymentRecordRow | null) ?? null) });
      } else if (subscription.status === "cancelled") {
        setState({ status: "cancelled", cancelled_at: subscription.cancelled_at ?? subscription.next_billing_at ?? subscription.started_at });
      } else {
        const membership = mapMembership(subscription, activePlan);
        const renewsAt = new Date(subscription.next_billing_at).getTime();
        const isPastDue = subscription.status === "past_due" || subscription.status === "paused" || (Number.isFinite(renewsAt) && renewsAt <= Date.now());
        if (isPastDue) {
          setState({ status: "past_due", membership });
        } else {
          const favourite = await resolveFavouriteZooter(user.id, subscription.favourite_zooter_id ?? null);
          setState({ status: "active", membership, favourite });
        }
      }
    }

    setProperties(Array.isArray(propertiesResult.data) ? (propertiesResult.data as PropertyAccountRow[]).map(mapProperty) : []);
    setLastBookingAt((bookingResult.data as BookingRow | null)?.scheduled_at ?? null);
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestMembership = useCallback(async () => {
    if (!user) throw new Error("Sign in before joining Care+.");
    setActionLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("care-plus-membership", {
        body: { action: "request_membership", planId: plan.id },
      });
      if (invokeError) throw invokeError;
      await refresh();
      return data;
    } finally {
      setActionLoading(false);
    }
  }, [plan.id, refresh, user]);

  return {
    state,
    plan,
    properties,
    lastBookingAt,
    reminders,
    loading: authLoading || loading,
    actionLoading,
    error,
    refresh,
    requestMembership,
  };
};

const resolveFavouriteZooter = async (userId: string, favouriteZooterId: string | null): Promise<FavouriteZooter | null> => {
  let favourite: FavouriteRow | null = null;
  let zooterId = favouriteZooterId;

  if (!zooterId) {
    const { data } = await (supabase as any)
      .from("favorites")
      .select("zooter_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    favourite = (data as FavouriteRow | null) ?? null;
    zooterId = favourite?.zooter_id ?? null;
  }

  if (!zooterId) return null;

  const { data: zooter } = await (supabase as any)
    .from("zooters_public")
    .select("id,name,rating,tags,role,jobs_completed")
    .eq("id", zooterId)
    .maybeSingle();

  return zooter ? mapFavourite(zooter as PublicZooterRow, favourite) : null;
};
