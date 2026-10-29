import { useState } from "react";
import { Gift, CreditCard, MessageCircle, CalendarCheck, RotateCcw, Heart, Sparkles } from "lucide-react";
import { GiftModal } from "./GiftModal";

const GIFT_OCCASIONS = [
  {
    label: "Mother's Day",
    title: "Happy Mother's Day",
    note: "You have cleaned up after all of us for long enough.",
    hint: "The most-gifted day of the year on Xoot. Book the bundle, not the single — nobody wants one afternoon off.",
  },
  {
    label: "A new baby",
    title: "Congratulations",
    note: "One less thing. Sleep instead.",
    hint: "Four visits is the useful gift here: the help is needed in week six, not week one.",
  },
  {
    label: "Moving in",
    title: "Welcome home",
    note: "Start in a place that is already clean.",
    hint: "Send a moving clean and they can use it on either end — the old place or the new one.",
  },
  {
    label: "Just because",
    title: "No occasion",
    note: "Go and sit down. It is handled.",
    hint: "No date attached, no reason given. It waits in their account until the week they need it.",
  },
];

const GIFT_STEPS = [
  {
    icon: CreditCard,
    title: "You pay once, now",
    desc: "The full amount including their booking fee. Nothing is charged to them later, and there is no gifting markup.",
  },
  {
    icon: MessageCircle,
    title: "They get a card, not a code",
    desc: "By email or a link you send yourself. No voucher number to memorize, no minimum spend attached.",
  },
  {
    icon: CalendarCheck,
    title: "They pick the day and Xooter",
    desc: "Credit lands in their account. They choose the date, the service and who comes.",
  },
  {
    icon: RotateCcw,
    title: "Unused credit stays refundable",
    desc: "It never expires. Until they book their first visit, you can request a full refund.",
  },
];

export function GiftClean() {
  const [occasionIdx, setOccasionIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const occ = GIFT_OCCASIONS[occasionIdx];

  return (
    <section id="gift" className="py-20 bg-muted/20 border-y border-border/60 relative overflow-hidden">
      <div className="container max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Gift className="h-3.5 w-3.5" />
            <span>Send thoughtful care</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Gift a clean. They pick when.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            No vouchers, no discount code gimmicks. You fund the visit; they book whenever life gets busy.
          </p>
        </div>

        {/* Occasion Switcher & Card Preview */}
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-5xl mx-auto mb-16">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Choose an occasion
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {GIFT_OCCASIONS.map((item, idx) => {
                const selected = occasionIdx === idx;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setOccasionIdx(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground block">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.title}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground italic pt-2">{occ.hint}</p>
          </div>

          {/* Interactive Gift Card Preview */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <span className="font-display font-bold text-xl tracking-tight text-foreground">Xoot</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10">
                <Sparkles className="h-3 w-3" />
                <span>Gift Card</span>
              </span>
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-2xl font-display font-bold text-foreground">{occ.title}</h3>
              <p className="text-sm text-muted-foreground">{occ.note}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-border/80 pt-4">
              <span className="text-xs text-muted-foreground">Valid for any service · Never expires</span>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:opacity-95 transition-all"
              >
                Send this gift clean
              </button>
            </div>
          </div>
        </div>

        {/* 4 Steps Checklist */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {GIFT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="p-5 rounded-xl border border-border bg-card space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <GiftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultOccasion={occ.label}
      />
    </section>
  );
}
