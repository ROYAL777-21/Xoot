import { approvedLaunchRegions } from "@/lib/operations";

export const TrustedBy = () => {
  return (
    <section className="py-12 border-y border-border bg-background">
      <div className="container">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-6">
          Current launch geography
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-80">
          {approvedLaunchRegions.map((region) => (
            <span key={region} className="font-display text-xl md:text-2xl font-bold text-foreground/75 tracking-tight capitalize">
              {region}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
