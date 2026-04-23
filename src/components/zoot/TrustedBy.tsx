const partners = ["Airbnb", "Booking.com", "Discovery", "Vodacom", "FNB"];

export const TrustedBy = () => {
  return (
    <section className="py-12 border-y border-border bg-background">
      <div className="container">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-6">
          Trusted by leading South African brands
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-70">
          {partners.map((p) => (
            <span key={p} className="font-display text-2xl md:text-3xl font-bold text-foreground/70 tracking-tight">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
