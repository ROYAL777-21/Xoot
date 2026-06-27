import { useEffect, useMemo, useRef, useState, type FormEvent, type SVGProps } from "react";
import { Link, useLocation } from "react-router-dom";
import { Flag, Loader2, LockKeyhole, Send, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkRateLimit } from "@/lib/rate-limit";
import { haptic } from "@/lib/haptics";
import { getLocalZootConciergeReply } from "@/lib/zoot-concierge-fallback";

type BotMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  body: string;
};

type SupportBotReply = {
  response?: string;
  escalated?: boolean;
  source?: "knowledge_base" | "openai_responses" | "human_escalation";
};

const secretLikePattern =
  /\b(password|passcode|otp|one[-\s]?time code|card number|cvv|cvc|gate code|access code|alarm code|lockbox|private key|service role)\b/i;

const createMessageId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialMessages: BotMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    body: "Welcome to Zoot Concierge. I can answer general questions about Zoot, Care+, ZootCred, booking, launch areas and becoming a Zooter. Sign in only when you need protected help with a booking, payment, address or account.",
  },
];

const quickPrompts = [
  "What does Care+ include?",
  "Where is Zoot launching first?",
  "Can Zoot help my office or Airbnb?",
];

const RoboticStarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 2.75 14.3 8l5.45 1.15-4.1 3.78.6 5.57L12 15.72 7.75 18.5l.6-5.57-4.1-3.78L9.7 8 12 2.75Z"
      fill="currentColor"
      opacity="0.92"
    />
    <path d="M8.8 10.85h6.4v3.85a2 2 0 0 1-2 2h-2.4a2 2 0 0 1-2-2v-3.85Z" fill="hsl(var(--background))" opacity="0.86" />
    <path d="M9.2 8.7h5.6l1.2 2.15H8l1.2-2.15Z" fill="hsl(var(--background))" opacity="0.72" />
    <path d="M10.35 12.6h.1M13.55 12.6h.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    <path d="M10.65 14.45h2.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
    <path d="M12 3.1V1.75M16.95 6.7l.95-.95M7.05 6.7l-.95-.95" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
  </svg>
);

export const ZootSupportBot = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  const role = useMemo(() => (location.pathname.startsWith("/zooter") ? "zooter" : "user"), [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("zootBot") === "open" || params.get("assistant") === "open") {
      setOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [open, messages]);

  const appendMessage = (message: Omit<BotMessage, "id">) => {
    setMessages((current) => [...current, { id: createMessageId(), ...message }]);
  };

  const reportAnswer = () => {
    haptic("selection");
    appendMessage({
      role: "system",
      body: user
        ? "Thanks. Open Support and reference this Concierge answer so a human reviewer can check it. The bot will not change bookings, payments, refunds or account state."
        : "Thanks. Sign in and open Support to report this answer with account protection. Do not paste private booking, payment, address or access-code details into public chat.",
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;

    if (text.length < 3) {
      toast.error("Ask Zoot a little more clearly.");
      return;
    }

    if (text.length > 600) {
      toast.error("Keep Zoot bot messages under 600 characters.");
      return;
    }

    if (secretLikePattern.test(text)) {
      haptic("warning");
      appendMessage({
        role: "system",
        body: "For safety, do not send passwords, OTPs, card details, gate codes, alarm codes or lockbox details to chat. Keep private access details inside protected booking fields.",
      });
      setBody("");
      return;
    }

    appendMessage({ role: "user", body: text });
    setBody("");

    const rateLimitKey = user ? "zoot-global-bot" : "zoot-guest-bot";
    const rateLimit = user ? 8 : 4;
    if (!checkRateLimit(rateLimitKey, rateLimit, 10 * 60_000)) {
      toast.error("Zoot bot is rate-limited for a few minutes. Try again shortly.");
      return;
    }

    setSending(true);
    try {
      if (!isSupabaseConfigured) {
        const localReply = getLocalZootConciergeReply(text, Boolean(user));
        appendMessage({
          role: "assistant",
          body: localReply.response,
        });
        haptic("success");
        return;
      }

      const { data, error } = await supabase.functions.invoke("support-respond", {
        body: {
          subject: "Website Zoot Concierge conversation",
          body: text,
          role,
          guest: !user,
        },
      });

      if (error) throw error;
      const reply = data as SupportBotReply | null;
      appendMessage({
        role: "assistant",
        body:
          reply?.response ??
          "Zoot Support could not answer automatically. Open Support so a human can review the request in the app.",
      });
      if (reply?.escalated) {
        appendMessage({
          role: "system",
          body: "This looks like it needs human review. Open Support to create or update a protected ticket before any account, payment or booking action changes.",
        });
      }
      haptic("success");
    } catch {
      const localReply = getLocalZootConciergeReply(text, Boolean(user));
      if (localReply) {
        appendMessage({
          role: "assistant",
          body: `${localReply.response} Live support is not reachable in this session, so I cannot perform account, booking, payment or admin actions here.`,
        });
        haptic("warning");
        return;
      }
      appendMessage({
        role: "assistant",
        body: user
          ? "I could not reach Zoot Support right now. Open Support from the app menu for protected ticket handling."
          : "I could not reach Zoot Support right now. Please try again shortly, or sign in if this is about a booking, payment, address or account.",
      });
      haptic("warning");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      {open && (
        <section
          className="liquid-glass-shell zoot-concierge-panel mb-3 flex h-[min(36rem,calc(100vh-7rem))] w-[min(calc(100vw-1.5rem),25.5rem)] flex-col rounded-[1.85rem] shadow-warm"
          aria-label="Zoot Concierge support bot"
        >
          <div className="liquid-glass-readable flex items-center justify-between gap-3 border-b border-border/55 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-[1.2rem] gradient-warm text-primary-foreground shadow-warm">
                <span className="absolute inset-x-1 top-1 h-3 rounded-full bg-white/35 blur-sm" />
                <RoboticStarIcon className="relative h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-lg font-bold leading-tight">Zoot Concierge</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-sage-deep" />
                  Source-guided help with human handoff
                </p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setOpen(false)} aria-label="Close Zoot Concierge">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="liquid-glass-readable liquid-glass-conversation flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-card ${
                    message.role === "user"
                      ? "liquid-glass-message bg-primary text-primary-foreground"
                      : message.role === "system"
                        ? "liquid-glass-message border border-primary/20 bg-primary/10 text-foreground"
                        : "liquid-glass-message border border-white/25 bg-card/72 text-foreground"
                  }`}
                >
                  <span className="relative z-10 block">
                    {message.role === "system" && <ShieldAlert className="mb-1 h-3.5 w-3.5 text-primary" />}
                    {message.body}
                    {message.role === "assistant" && message.id !== "welcome" && (
                      <button
                        type="button"
                        onClick={reportAnswer}
                        className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/25 px-2 py-1 text-[11px] font-semibold opacity-80 transition-opacity hover:opacity-100"
                      >
                        <Flag className="h-3 w-3" />
                        Report answer
                      </button>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="liquid-glass-message flex items-center gap-2 rounded-2xl border border-white/25 bg-card/72 px-3 py-2 text-sm text-muted-foreground shadow-card">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Checking Zoot's playbook
                </div>
              </div>
            )}
            {messages.length === 1 && !sending && (
              <div className="grid gap-2 pt-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="liquid-glass-interactive rounded-2xl bg-background/35 px-3 py-2 text-left text-sm font-semibold text-foreground/82 transition-colors hover:text-foreground"
                    onClick={() => setBody(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="liquid-glass-readable border-t border-border/55 p-3">
            {!user && (
              <div className="mb-2 flex items-start gap-2 rounded-2xl border border-border/70 bg-background/70 p-2 text-xs text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-deep" />
                <span>General questions are fine here. Sign in before sharing booking, payment, address or account context.</span>
              </div>
            )}
            <form onSubmit={submit} className="flex gap-2">
              <Input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={600}
                placeholder={user ? "Ask the concierge..." : "Ask about Zoot, Care+, pricing..."}
                className="native-input rounded-full bg-background/90"
              />
              <Button type="submit" size="icon" className="interactive-press rounded-full" disabled={sending || !body.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>No secrets, OTPs or access codes.</span>
              <Link to={user ? "/app/support" : "/auth"} className="font-semibold text-primary underline-offset-4 hover:underline">
                {user ? "Open Support" : "Sign in for account help"}
              </Link>
            </div>
          </div>
        </section>
      )}

      <Button
        type="button"
        className="interactive-press liquid-glass-shell zoot-concierge-panel h-14 w-14 rounded-full px-0 shadow-warm sm:w-auto sm:px-4"
        onClick={() => {
          haptic("selection");
          setOpen((current) => !current);
        }}
        aria-label={open ? "Hide Zoot Concierge" : "Open Zoot Concierge"}
      >
        <span className="liquid-glass-readable flex items-center gap-2">
          {open ? <X className="h-5 w-5" /> : <RoboticStarIcon className="h-5 w-5" />}
          <span className="hidden font-semibold sm:inline">Concierge</span>
        </span>
      </Button>
    </div>
  );
};
