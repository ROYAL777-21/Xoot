import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/xoot/Navbar";
import { Footer } from "@/components/xoot/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatZARDecimal } from "@/lib/format";
import { formatInviteDate } from "@/lib/fare-split-invite";
import { haptic } from "@/lib/haptics";

/**
 * "Someone asked you to cover part of their clean."
 *
 * ── Who reaches this page ───────────────────────────────────────────────────────
 * A person who was sent a WhatsApp message by a friend or housemate. They very likely have no Xoot
 * account and no intention of making one until they know what this is. So the page answers that
 * first — what, when, how much, from whom — and only then asks anyone to sign in.
 *
 * ── ⚠️ What is deliberately not on this page ────────────────────────────────────
 * The address. The notes. The household profile. The access codes. A co-payer is in a payment
 * relationship, not an access relationship, and the difference between "my housemate" and "someone
 * who offered to chip in" is invisible to the code. The preview comes from the `fare-split-invite`
 * Edge Function, which returns five scalars and cannot return a booking row;
 * `fare-split-privacy.test.ts` asserts both ends.
 *
 * ── Why signing in is required to accept but not to look ────────────────────────
 * Accepting attaches a real person to a real obligation and creates a `payment_records` row, so it
 * needs an identity — and specifically the identity the invitation was addressed to. The token
 * proves you were sent the link; it does not prove you are the person it was meant for. A WhatsApp
 * link lands in group chats.
 */

type InvitePreview = {
  invitedEmail: string;
  amountCents: number;
  status: "invited" | "accepted" | "declined" | "settled";
  serviceLabel: string;
  scheduledAt: string;
  organiserName: string;
  collectionConfigured: boolean;
};

const SplitInvite = () => {
  const { token = "" } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [answered, setAnswered] = useState<"accepted" | "declined" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fare-split-invite", {
        body: { token },
      });
      if (error) throw error;
      setPreview(data as InvitePreview);
    } catch {
      // One message for "no such invitation" and for a network failure. The distinction is not
      // useful to the reader and the first version is a probing oracle.
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const answer = async (action: "accept" | "decline") => {
    setAnswering(true);
    try {
      const { error } = await supabase.functions.invoke("split-booking-fare", {
        body: { action, inviteToken: token },
      });
      if (error) throw error;
      haptic("success");
      setAnswered(action === "accept" ? "accepted" : "declined");
    } catch {
      toast.error(
        action === "accept"
          ? "Could not confirm your share. Check you are signed in with the invited email address."
          : "Could not record that. Please try again.",
      );
    } finally {
      setAnswering(false);
    }
  };

  /** The email the invitation was addressed to must match the signed-in one. */
  const emailMatches =
    Boolean(user?.email) &&
    Boolean(preview) &&
    user!.email!.trim().toLowerCase() === preview!.invitedEmail.trim().toLowerCase();

  const body = () => {
    if (loading || authLoading) {
      return (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Looking up this invitation…
        </div>
      );
    }

    if (!preview) {
      return (
        <div className="py-6 text-center">
          <p className="font-display text-xl font-bold">This invitation is not valid</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may have been mistyped, or the person who sent it may have changed the split.
            Ask them to send it again.
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-full">
            <Link to="/">Go to Xoot</Link>
          </Button>
        </div>
      );
    }

    const amount = formatZARDecimal(preview.amountCents / 100);

    if (answered === "accepted" || preview.status === "accepted" || preview.status === "settled") {
      return (
        <div className="py-4 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Check className="h-6 w-6" />
          </span>
          <p className="mt-3 font-display text-xl font-bold">You are in for {amount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.organiserName} can see that you have confirmed. Nothing has been charged —
            settle up with them directly.
          </p>
        </div>
      );
    }

    if (answered === "declined" || preview.status === "declined") {
      return (
        <div className="py-4 text-center">
          <p className="font-display text-xl font-bold">You have declined this share</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.organiserName} has been told, so they can re-split the booking.
          </p>
        </div>
      );
    }

    return (
      <>
        <p className="text-sm text-muted-foreground">
          {preview.organiserName} booked a {preview.serviceLabel} with Xoot and asked you to cover
        </p>
        <p className="mt-1 font-display text-4xl font-bold tracking-tight">{amount}</p>

        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-3 text-sm">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{formatInviteDate(preview.scheduledAt)}</span>
        </div>

        {/*
          The single most important sentence on the page. Someone is being asked for money by an
          app they have never used, sent to them by a friend. Leaving "nothing will be taken"
          implied is how this reads as a phishing attempt — and how a real recipient assumes their
          card has been charged when it has not.
        */}
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-border/60 px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Nothing is charged here and Xoot never asks for card details on this page. Confirming
            just tells {preview.organiserName} you are in; you settle up with them directly.
          </span>
        </div>

        {!user && (
          <div className="mt-5">
            <p className="mb-3 text-xs text-muted-foreground">
              Sign in as <strong>{preview.invitedEmail}</strong> to confirm your share.
            </p>
            <Button
              className="w-full rounded-full"
              onClick={() => navigate(`/auth?next=${encodeURIComponent(`/split/${token}`)}`)}
            >
              Sign in to confirm
            </Button>
          </div>
        )}

        {user && !emailMatches && (
          <p className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
            This invitation was sent to {preview.invitedEmail}, and you are signed in as{" "}
            {user.email}. Sign in with the invited address to confirm — a share is attached to the
            person it was meant for, not to whoever opens the link.
          </p>
        )}

        {user && emailMatches && (
          <div className="mt-5 flex gap-2">
            <Button
              className="flex-1 rounded-full"
              disabled={answering}
              onClick={() => answer("accept")}
            >
              {answering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              I'm in for {amount}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={answering}
              onClick={() => answer("decline")}
            >
              <X className="mr-1 h-4 w-4" />
              Decline
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/*
        `noindex`. The page is addressed by a bearer token and its content is a named person's
        payment obligation. A crawler that finds one of these links in a shared inbox or a pasted
        chat log must not put it in an index.
      */}
      <SEO
        title="Your share of a Xoot clean"
        description="Confirm the share of a Xoot home clean that someone has asked you to cover."
        canonical="/split"
        noIndex
      />
      <Navbar />
      <main className="container flex justify-center py-16 md:py-24">
        <Card className="w-full max-w-md rounded-3xl p-6">{body()}</Card>
      </main>
      <Footer />
    </div>
  );
};

export default SplitInvite;
