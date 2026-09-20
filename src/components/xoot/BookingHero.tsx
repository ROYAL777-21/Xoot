import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Clock,
  House,
  Key,
  MapPin,
  Rabbit,
  Shirt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { loadXooterDirectory } from "@/lib/xooter-directory";
import { captureAnalyticsEvent, getAnalyticsDeviceType } from "@/lib/analytics";
import { VerifiedAddressInput } from "@/components/xoot/VerifiedAddressInput";
import { HeroWordFlip } from "@/components/xoot/HeroWordFlip";
import { AppAvailability } from "./AppAvailability";
import { CleaningBrushIcon, HandoffNote, HandoffTape, HeroArrow, HeroFlowers } from "./HeroArtwork";
import heroImage from "@/assets/xooter-female-polo.webp";
import heroImageLarge from "@/assets/xooter-female-polo-large.webp";

const services = [
  { id: "residential", label: "Regular cleaning", icon: CleaningBrushIcon, available: true },
  { id: "airbnb", label: "Airbnb cleaning", icon: BedDouble, available: true },
  { id: "express", label: "Express cleaning", icon: Rabbit, available: true },
  { id: "office", label: "Office cleaning", icon: Building2, available: true },
  { id: "moving", label: "Moving cleaning", icon: Key, available: true },
  { id: "laundry", label: "Laundry & ironing", icon: Shirt, available: false },
] as const;

type ServiceId = (typeof services)[number]["id"];

export const BookingHero = () => {
  const [active, setActive] = useState<ServiceId>("residential");
  const [address, setAddress] = useState("");
  const [activeXooters, setActiveXooters] = useState<number | null>(null);
  const [rosterError, setRosterError] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const selected = services.find((service) => service.id === active) ?? services[0];

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    loadXooterDirectory()
      .then(({ total }) => {
        if (cancelled) return;
        setActiveXooters(total);
      }, () => {
        if (!cancelled) setRosterError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startBooking = () => {
    if (!selected.available) return;
    captureAnalyticsEvent("booking_flow_started", {
      service_category: active,
      launch_area: "public_hero",
      source: user ? "signed_in_homepage" : "guest_homepage",
      device_type: getAnalyticsDeviceType(),
    });
    const target = `/app?service=${active}${address.trim() ? `&address=${encodeURIComponent(address.trim())}` : ""}`;
    if (!user) {
      navigate("/auth", { state: { from: { pathname: target } } });
      return;
    }
    navigate(target);
  };

  return (
    <section className="xoot-hero relative overflow-hidden">
      <HeroFlowers />

      <div className="xoot-hero-inner relative z-10 mx-auto grid w-full max-w-[1240px]">
        <div className="xoot-hero-copy">
          <div className="xoot-hero-badge">
            <Sparkles className="h-4 w-4" />
            <span>Launching in selected Johannesburg suburbs</span>
          </div>

          <h1 className="xoot-hero-heading">
            Premium home care,<br />
            <HeroWordFlip />
          </h1>
          <p className="xoot-hero-description">
            On-demand home services. Book vetted independent Xooters for homes, Airbnb turnovers, office workspaces, moving cleans and premium resets — Xoot confirms availability before final dispatch, with timing shown before you pay.
          </p>

          <div className="xoot-hero-card">
            <div className="xoot-service-grid grid gap-2">
              {services.map((service) => {
                const Icon = service.icon;
                const isActive = active === service.id;
                return (
                  <button
                    type="button"
                    key={service.id}
                    onClick={() => setActive(service.id)}
                    aria-pressed={isActive}
                    aria-label={service.available ? service.label : `${service.label}, currently unavailable`}
                    className="xoot-hero-service"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{service.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="xoot-hero-address">
              <div className="mb-[9px] flex items-center gap-2">
                <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[var(--xoot-violet-100)] text-[var(--xoot-violet-700)]"><MapPin className="h-4 w-4" /></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Where</span>
              </div>
              <VerifiedAddressInput value={address} onChange={setAddress} inputClassName="xoot-hero-address-input" showIcon={false} label="Service address" placeholder={active === "office" ? "Office address..." : "Search address..."} />
            </div>

            <div className="xoot-hero-schedule">
              <div className="flex items-center gap-3 rounded-xl bg-black/[0.06] p-[14px] ring-1 ring-black/[0.03]">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CalendarDays className="h-4 w-4" /></span>
                <div className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Date</span><span className="block truncate text-sm font-semibold">Choose in booking</span></div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-black/[0.06] p-[14px] ring-1 ring-black/[0.03]">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Clock className="h-4 w-4" /></span>
                <div className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Status</span><span className="block truncate text-sm font-semibold">Tracked in app</span></div>
              </div>
            </div>

            {!selected.available && (
              <p role="status" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
                Laundry &amp; ironing is not available yet. Choose another service to continue.
              </p>
            )}
            <Button type="button" size="lg" onClick={startBooking} disabled={!selected.available} className="xoot-hero-book">
              {selected.available ? "Book now" : "Service unavailable"}
              {selected.available && <ArrowRight className="h-5 w-5" />}
            </Button>

            <HandoffNote>arrival timing &amp; access instructions — all in your booking</HandoffNote>

            <div className="xoot-hero-secondary-actions">
              <Link to="/?xootBot=open&intent=concierge" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-foreground/25 px-3 text-center text-sm font-bold text-foreground transition-colors hover:bg-foreground/[0.05]">Ask Concierge first</Link>
              <Link to="/app/properties/office" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-foreground/25 px-3 text-center text-sm font-bold text-foreground transition-colors hover:bg-foreground/[0.05]">Plan office or Airbnb cleaning</Link>
            </div>

            <div className="xoot-app-divider">
              <span>Apps coming after store review</span><span />
            </div>
            <AppAvailability />
            <p className="mt-3 text-center text-xs leading-[1.5] text-muted-foreground">
              Active coverage includes Sandton, Bryanston, Rosebank, Midrand, Fourways and Waterfall. Other South African requests go to coverage review.
            </p>
          </div>

          <div className="xoot-hero-trust">
            <span aria-live="polite">
              <strong className="text-foreground">Live roster</strong>{" "}
              {!isSupabaseConfigured || rosterError ? "temporarily unavailable" : activeXooters === null ? "checking availability" : `${activeXooters} approved Xooters`}
            </span>
            <span><span className="font-semibold text-foreground">Admin-reviewed</span> trust workflow</span>
          </div>
        </div>

        <div className="xoot-hero-portrait">
          <HeroArrow />
          <HandoffTape style={{ width: 104, height: 32, top: -12, left: -18, rotate: "-22deg" }} />
          <HandoffTape style={{ backgroundColor: "var(--xoot-honey-mid)", width: 98, height: 30, bottom: -10, right: -16, rotate: "-16deg", clipPath: "polygon(3% 2%, 100% 0%, 96% 100%, 0% 97%, 1% 48%)" }} />
          <div className="xoot-hero-photo">
            <img src={heroImage} srcSet={`${heroImage} 1120w, ${heroImageLarge} 1792w`} sizes="(min-width: 1240px) 586px, (min-width: 962px) 50vw, 100vw" alt="Illustration of a Xooter in uniform outside a Johannesburg home" width={1120} height={1500} className="h-full w-full object-cover object-[50%_12%]" />
            <div className="xoot-hero-roster">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">X</span>
              <span><span className="block text-xs text-muted-foreground">Live Xooters</span><span className="block text-sm font-bold">After verification</span></span>
            </div>
            <div className="xoot-hero-timeline">
              <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--xoot-violet-500)] text-white"><House className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-bold">Arrival timeline</span><span className="block truncate text-xs text-muted-foreground">On the way, arrived, started, completed</span></span></span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-primary">TRUST</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
