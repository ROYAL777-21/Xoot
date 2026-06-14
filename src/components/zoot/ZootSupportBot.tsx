import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, Loader2, LockKeyhole, MessageCircle, Send, ShieldAlert, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkRateLimit } from "@/lib/rate-limit";
import { haptic } from "@/lib/haptics";

type BotMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  body: string;
};

type SupportBotReply = {
  response?: string;
  escalated?: boolean;
  source?: "openai_responses" | "zoot_support_rules" | "human_escalation";
};

const secretLikePattern =
  /\b(password|passcode|otp|one[-\s]?time code|card number|cvv|cvc|gate code|access code|alarm code|lockbox|private key|service role)\b/i;

const createMessageId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialMessages: BotMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    body: "Hi, I am Zoot. Ask about bookings, Care+, Zooter onboarding, office cleans, Airbnb turnovers, support routing or what to prepare before a clean.",
  },
];

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
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [open, messages]);

  const appendMessage = (message: Omit<BotMessage, "id">) => {
    setMessages((current) => [...current, { id: createMessageId(), ...message }]);
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

    if (!user) {
      appendMessage({
        role: "assistant",
        body: "Please sign in before Zoot can look at your account or route a support question. Public questions are best handled after sign-in so your bookings and tickets stay protected.",
      });
      return;
    }

    if (!checkRateLimit("zoot-global-bot", 8, 10 * 60_000)) {
      toast.error("Zoot bot is rate-limited for a few minutes. Try again shortly.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-respond", {
        body: {
          subject: "Website Zoot bot conversation",
          body: text,
          role,
        },
      });

      if (error) throw error;
      const reply = data as SupportBotReply | null;
      appendMessage({
        role: "assistant",
        body:
          reply?.response ??
          "Zoot could not prepare a full answer just now. Use the support page so a human can review the request in the app.",
      });
      if (reply?.escalated) {
        appendMessage({
          role: "system",
          body: "This looks like it needs human review. Open Support to create or update a protected ticket before any account, payment or booking action changes.",
        });
      }
      haptic("success");
    } catch {
      appendMessage({
        role: "assistant",
        body: "I could not reach Zoot Support right now. Please try again, or open Support from the app menu for ticket handling.",
      });
      haptic("warning");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-3 z-50 sm:bottom-5 sm:right-5">
      {open && (
        <section
          className="liquid-glass-shell mb-3 flex h-[min(34rem,calc(100vh-7rem))] w-[min(calc(100vw-1.5rem),24rem)] flex-col rounded-[1.65rem] shadow-warm"
          aria-label="Zoot AI support bot"
        >
          <div className="liquid-glass-readable flex items-center justify-between gap-3 border-b border-border/55 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-sage text-primary-foreground shadow-card">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-lg font-bold leading-tight">Zoot AI</p>
                <p className="text-xs text-muted-foreground">Support bot with human handoff</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setOpen(false)} aria-label="Close Zoot AI">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="liquid-glass-readable flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-card ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "system"
                        ? "border border-primary/20 bg-primary/10 text-foreground"
                        : "bg-background/88 text-foreground"
                  }`}
                >
                  {message.role === "system" && <ShieldAlert className="mb-1 h-3.5 w-3.5 text-primary" />}
                  {message.body}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-background/88 px-3 py-2 text-sm text-muted-foreground shadow-card">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Zoot is checking this safely
                </div>
              </div>
            )}
          </div>

          <div className="liquid-glass-readable border-t border-border/55 p-3">
            {!user && (
              <div className="mb-2 flex items-start gap-2 rounded-2xl border border-border/70 bg-background/70 p-2 text-xs text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-deep" />
                <span>Sign in before sharing booking, payment, address or account context.</span>
              </div>
            )}
            <form onSubmit={submit} className="flex gap-2">
              <Input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={600}
                placeholder={user ? "Ask Zoot..." : "Ask after signing in..."}
                className="native-input rounded-full bg-background/90"
              />
              <Button type="submit" size="icon" className="interactive-press rounded-full" disabled={sending || !body.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>No secrets, OTPs or access codes.</span>
              <Link to="/app/support" className="font-semibold text-primary underline-offset-4 hover:underline">
                Open Support
              </Link>
            </div>
          </div>
        </section>
      )}

      <Button
        type="button"
        className="interactive-press liquid-glass-shell h-14 rounded-full px-4 shadow-warm"
        onClick={() => {
          haptic("selection");
          setOpen((current) => !current);
        }}
        aria-label={open ? "Hide Zoot AI support bot" : "Open Zoot AI support bot"}
      >
        <span className="liquid-glass-readable flex items-center gap-2">
          {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          <span className="hidden font-semibold sm:inline">Zoot AI</span>
          <MessageCircle className="h-5 w-5 sm:hidden" />
        </span>
      </Button>
    </div>
  );
};

