import { useState } from "react";
import { X, Gift, Heart, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export interface GiftModalProps {
  open: boolean;
  onClose: () => void;
  defaultOccasion?: string;
  defaultBundle?: number;
}

const BUNDLE_PRICES: Record<number, { label: string; priceZAR: number; visits: number }> = {
  1: { label: "1 Clean", priceZAR: 280, visits: 1 },
  4: { label: "4 Cleans (Month of Fridays)", priceZAR: 1040, visits: 4 },
  12: { label: "12 Cleans (A Season)", priceZAR: 2980, visits: 12 },
};

export function GiftModal({ open, onClose, defaultOccasion = "Just because", defaultBundle = 4 }: GiftModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bundleCount, setBundleCount] = useState<number>(defaultBundle);
  const [occasion, setOccasion] = useState(defaultOccasion);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const currentBundle = BUNDLE_PRICES[bundleCount] || BUNDLE_PRICES[4];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate("/auth", { state: { from: { pathname: "/#gift" } } });
      return;
    }

    if (!recipientName.trim() || !recipientEmail.trim()) {
      toast.error("Please provide recipient's name and email");
      return;
    }

    setLoading(true);
    try {
      await invokeOpsWorkflow({
        action: "gift_clean_order_requested",
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
        occasion,
        message: personalMessage.trim() || null,
        serviceType: "regular",
      });
      setSuccess(true);
      toast.success("Gift clean ready for checkout!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record gift request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send a gift clean"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden my-auto animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-foreground text-sm">Send a Gift Clean</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-muted/60 text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-foreground">Gift Clean Prepared!</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              We've created the gift clean for {recipientName}. Credit will be sent directly once payment is completed.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                onClose();
              }}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Bundle Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Choose Gift Bundle</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(BUNDLE_PRICES).map(([count, b]) => {
                  const selected = bundleCount === Number(count);
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setBundleCount(Number(count))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground block">{b.label}</span>
                      <span className="text-sm font-display font-bold text-primary mt-1 block">R{b.priceZAR}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Recipient's Full Name</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Recipient's Email Address</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Personal Message (Optional)</label>
                <textarea
                  rows={2}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="e.g. Happy Mother's Day! Go and put your feet up, it's completely handled."
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Price Box */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-xs text-muted-foreground">Total upfront price</span>
              <span className="text-xl font-display font-bold text-foreground">R{currentBundle.priceZAR}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{loading ? "Preparing Gift..." : "Send Gift Clean"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
