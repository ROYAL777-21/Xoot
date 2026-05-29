import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import {
  getAuthFormIssue,
  getPasswordIssues,
  getPasswordStrength,
  getSafeAuthErrorMessage,
  normaliseEmail,
} from "@/lib/auth-security";

type AuthLocationState = {
  from?: {
    pathname?: string;
    search?: string;
  };
};

const getRedirectPath = (state: unknown) => {
  const from = (state as AuthLocationState | null)?.from;
  const path = `${from?.pathname ?? "/app"}${from?.search ?? ""}`;
  return path.startsWith("/auth") ? "/app" : path;
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const redirectPath = useMemo(() => getRedirectPath(location.state), [location.state]);
  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
  const passwordIssues = useMemo(() => getPasswordIssues(password, mode), [mode, password]);
  const passwordStrength = getPasswordStrength(password);
  const formIssue = getAuthFormIssue({ mode, email, password, fullName });
  const canSubmit = !loading && !isLocked && !formIssue;

  useEffect(() => {
    if (user) navigate(redirectPath, { replace: true });
  }, [user, navigate, redirectPath]);

  useEffect(() => {
    if (!lockoutUntil) return;

    const timeout = window.setTimeout(() => {
      setFailedAttempts(0);
      setLockoutUntil(null);
    }, Math.max(lockoutUntil - Date.now(), 0));

    return () => window.clearTimeout(timeout);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      haptic("warning");
      toast.error("Please wait a few seconds before trying again.");
      return;
    }

    if (formIssue) {
      haptic("warning");
      toast.error(formIssue);
      return;
    }

    setLoading(true);
    const safeEmail = normaliseEmail(email);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: fullName.trim() } },
        });
        if (error) throw error;

        haptic("success");
        if (data.session) {
          toast.success("Welcome to Zoot. Your account is ready.");
          navigate(redirectPath, { replace: true });
        } else {
          toast.success("Check your email to finish setting up Zoot.");
          setMode("signin");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
      if (error) throw error;

      setFailedAttempts(0);
      setLockoutUntil(null);
      haptic("success");
      toast.success("Welcome back.");
      navigate(redirectPath, { replace: true });
    } catch {
      haptic("warning");
      if (mode === "signin") {
        const nextFailedAttempts = failedAttempts + 1;
        setFailedAttempts(nextFailedAttempts);
        if (nextFailedAttempts >= 4) setLockoutUntil(Date.now() + 30_000);
      }
      toast.error(getSafeAuthErrorMessage(mode));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    haptic("selection");
    setMode(mode === "signin" ? "signup" : "signin");
    setPassword("");
    setShowPassword(false);
    setFailedAttempts(0);
    setLockoutUntil(null);
  };

  const passwordStrengthLabel = ["Very weak", "Weak", "Good", "Strong", "Very strong"][passwordStrength];
  const strengthColour = passwordStrength >= 3 ? "bg-sage-deep" : passwordStrength >= 2 ? "bg-primary" : "bg-destructive";

  return (
    <div className="min-h-screen gradient-hero grid place-items-center p-6">
      <Card className="w-full max-w-md rounded-3xl border-border p-8 shadow-warm">
        <Link to="/" className="mb-6 flex items-center gap-2" aria-label="Back to Zoot home">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">zoot</span>
        </Link>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1">
          {mode === "signin" ? <LockKeyhole className="h-3 w-3 text-sage-deep" /> : <Sparkles className="h-3 w-3 text-sage-deep" />}
          <span className="text-xs font-medium text-sage-deep">{mode === "signin" ? "Secure sign-in" : "Join Zoot"}</span>
        </div>

        <h1 className="mb-1 font-display text-3xl font-bold">
          {mode === "signin" ? "Sign in to Zoot" : "Create your account"}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {mode === "signin"
            ? "Access your bookings, ZootCred, Care+ status and saved home profile."
            : "Start booking trusted Zooters with a protected home profile."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                className="rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => {
                  haptic("selection");
                  setShowPassword((value) => !value);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
                aria-controls="password"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              className="rounded-xl pr-12"
            />
            {mode === "signup" && password && (
              <div className="rounded-2xl bg-muted/45 p-3 text-xs text-muted-foreground">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span>Password strength</span>
                  <span className="font-semibold text-foreground">{passwordStrengthLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((segment) => (
                    <span
                      key={segment}
                      className={`h-1.5 rounded-full ${segment < passwordStrength ? strengthColour : "bg-border"}`}
                    />
                  ))}
                </div>
                {passwordIssues.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {passwordIssues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          {isLocked && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>Too many unsuccessful attempts. Please wait 30 seconds before trying again.</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-sage-deep" />
              Zoot will never ask for your password, OTP, card PIN or bank login details in chat, WhatsApp, phone calls or email.
            </p>
          </div>

          <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-xl gradient-warm font-semibold shadow-warm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in securely" : "Create secure account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-5 w-full text-center text-sm text-muted-foreground transition-smooth hover:text-foreground"
        >
          {mode === "signin" ? "New to Zoot? Create an account" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
};

export default Auth;
