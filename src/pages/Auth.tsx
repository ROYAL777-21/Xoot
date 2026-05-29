import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, Apple, Chrome, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import {
  getAuthFormIssue,
  getAuthRedirectTo,
  getEmailIssue,
  getPasswordIssues,
  getPasswordResetRedirectTo,
  getPasswordStrength,
  getSafeAuthErrorMessage,
  getSafeOAuthErrorMessage,
  getSafePasswordResetMessage,
  getSafeRedirectPath,
  normaliseEmail,
  type SocialAuthProvider,
} from "@/lib/auth-security";

type AuthView = "signin" | "signup" | "forgot";

type AuthLocationState = {
  from?: {
    pathname?: string;
    search?: string;
  };
};

const getRedirectPath = (state: unknown) => {
  const from = (state as AuthLocationState | null)?.from;
  return getSafeRedirectPath(`${from?.pathname ?? "/app"}${from?.search ?? ""}`);
};

const providerLabels: Record<SocialAuthProvider, string> = {
  google: "Google",
  apple: "Apple",
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<SocialAuthProvider | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const redirectPath = useMemo(() => getRedirectPath(location.state), [location.state]);
  const authMode = mode === "signup" ? "signup" : "signin";
  const isForgotPassword = mode === "forgot";
  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
  const passwordIssues = useMemo(() => getPasswordIssues(password, authMode), [authMode, password]);
  const passwordStrength = getPasswordStrength(password);
  const formIssue = isForgotPassword ? getEmailIssue(email) : getAuthFormIssue({ mode: authMode, email, password, fullName });
  const canSubmit = !loading && !providerLoading && !isLocked && !formIssue;

  useEffect(() => {
    if (user && mode !== "forgot") navigate(redirectPath, { replace: true });
  }, [user, mode, navigate, redirectPath]);

  useEffect(() => {
    if (!lockoutUntil) return;

    const timeout = window.setTimeout(() => {
      setFailedAttempts(0);
      setLockoutUntil(null);
    }, Math.max(lockoutUntil - Date.now(), 0));

    return () => window.clearTimeout(timeout);
  }, [lockoutUntil]);

  const handlePasswordResetRequest = async () => {
    const emailIssue = getEmailIssue(email);
    if (emailIssue) {
      haptic("warning");
      toast.error(emailIssue);
      return;
    }

    const safeEmail = normaliseEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, {
      redirectTo: getPasswordResetRedirectTo(),
    });

    if (error) throw error;

    haptic("success");
    toast.success(getSafePasswordResetMessage());
    setPassword("");
    setMode("signin");
  };

  const handlePasswordAuth = async () => {
    const safeEmail = normaliseEmail(email);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: safeEmail,
        password,
        options: { emailRedirectTo: getAuthRedirectTo(redirectPath), data: { full_name: fullName.trim() } },
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
  };

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

    try {
      if (isForgotPassword) await handlePasswordResetRequest();
      else await handlePasswordAuth();
    } catch {
      haptic("warning");
      if (mode === "signin") {
        const nextFailedAttempts = failedAttempts + 1;
        setFailedAttempts(nextFailedAttempts);
        if (nextFailedAttempts >= 4) setLockoutUntil(Date.now() + 30_000);
      }
      toast.error(isForgotPassword ? getSafePasswordResetMessage() : getSafeAuthErrorMessage(authMode));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: SocialAuthProvider) => {
    haptic("selection");
    setProviderLoading(provider);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectTo(redirectPath),
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });

      if (error) throw error;
    } catch {
      haptic("warning");
      setProviderLoading(null);
      toast.error(getSafeOAuthErrorMessage(provider));
    }
  };

  const setAuthMode = (nextMode: AuthView) => {
    haptic("selection");
    setMode(nextMode);
    setPassword("");
    setShowPassword(false);
    setFailedAttempts(0);
    setLockoutUntil(null);
  };

  const passwordStrengthLabel = ["Very weak", "Weak", "Good", "Strong", "Very strong"][passwordStrength];
  const strengthColour = passwordStrength >= 3 ? "bg-sage-deep" : passwordStrength >= 2 ? "bg-primary" : "bg-destructive";
  const heading = mode === "signin" ? "Sign in to Zoot" : mode === "signup" ? "Create your account" : "Reset your password";
  const subheading = mode === "signin"
    ? "Access your bookings, ZootCred, Care+ status and saved home profile."
    : mode === "signup"
      ? "Start booking trusted Zooters with a protected home profile."
      : "Enter your email and we will send a secure reset link if the account can access Zoot.";

  return (
    <div className="grid min-h-screen place-items-center overflow-hidden gradient-hero px-4 py-6 sm:p-6">
      <Card className="w-full max-w-[23rem] rounded-3xl border-border p-5 shadow-warm sm:max-w-md sm:p-8">
        <Link to="/" className="mb-5 flex items-center gap-2 sm:mb-6" aria-label="Back to Zoot home">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">zoot</span>
        </Link>

        <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1">
          {mode === "signin" ? <LockKeyhole className="h-3 w-3 shrink-0 text-sage-deep" /> : mode === "forgot" ? <Mail className="h-3 w-3 shrink-0 text-sage-deep" /> : <Sparkles className="h-3 w-3 shrink-0 text-sage-deep" />}
          <span className="text-xs font-medium text-sage-deep">{mode === "signin" ? "Secure sign-in" : mode === "forgot" ? "Password recovery" : "Join Zoot"}</span>
        </div>

        <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">{heading}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{subheading}</p>

        {!isForgotPassword && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {(["google", "apple"] as SocialAuthProvider[]).map((provider) => {
              const Icon = provider === "google" ? Chrome : Apple;
              const isProviderLoading = providerLoading === provider;
              return (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  disabled={loading || !!providerLoading}
                  onClick={() => void handleOAuth(provider)}
                >
                  {isProviderLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                  {providerLabels[provider]}
                </Button>
              );
            })}
          </div>
        )}

        {!isForgotPassword && (
          <div className="mb-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>Email and password</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

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

          {!isForgotPassword && (
            <div className="space-y-1.5">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <Label htmlFor="password">Password</Label>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setAuthMode("forgot")}
                      className="text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
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
          )}

          {isLocked && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Too many unsuccessful attempts. Please wait 30 seconds before trying again.</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage-deep" />
              Zoot will never ask for your password, OTP, card PIN or bank login details in chat, WhatsApp, phone calls or email.
            </p>
          </div>

          <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-xl gradient-warm font-semibold shadow-warm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isForgotPassword ? "Send reset link" : mode === "signin" ? "Sign in securely" : "Create secure account"}
          </Button>
        </form>

        <div className="mt-5 grid gap-2 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <button type="button" onClick={() => setAuthMode("signup")} className="transition-smooth hover:text-foreground">
              New to Zoot? Create an account
            </button>
          )}
          {mode === "signup" && (
            <button type="button" onClick={() => setAuthMode("signin")} className="transition-smooth hover:text-foreground">
              Already have an account? Sign in
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => setAuthMode("signin")} className="transition-smooth hover:text-foreground">
              Back to secure sign-in
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Auth;
