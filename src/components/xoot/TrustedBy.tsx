import { Building2, Home, Hotel, KeyRound, MapPinned, ShieldCheck } from "lucide-react";
import { approvedLaunchRegions } from "@/lib/operations";

const operatorProfiles = [
  { label: "Property managers", icon: Building2 },
  { label: "Estate agents", icon: KeyRound },
  { label: "Airbnb hosts", icon: Hotel },
  { label: "Office admins", icon: ShieldCheck },
  { label: "Landlords", icon: Home },
];

export const TrustedBy = () => {
  return (
    <section className="border-y border-border bg-background py-12">
      <div className="container">
        <div className="mx-auto mb-7 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Built for real Johannesburg operating workflows
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Built around the real operating needs of teams and households that need cleaner handovers, protected access notes, repeatable quality, and accountable support.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {operatorProfiles.map((profile) => {
            const Icon = profile.icon;
            return (
              <div key={profile.label} className="liquid-glass-shell rounded-3xl p-4 text-center shadow-card">
                <div className="liquid-glass-readable">
                  <Icon className="mx-auto mb-3 h-5 w-5 text-primary" />
                  <p className="font-display text-lg font-bold tracking-tight">{profile.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <MapPinned className="h-4 w-4 text-primary" />
          {approvedLaunchRegions.slice(0, 8).map((region) => (
            <span key={region} className="font-semibold capitalize text-foreground/75">
              {region}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
