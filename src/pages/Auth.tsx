import { useState, useEffect, useMemo, type SVGProps } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff, Fingerprint, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { clearNativeQuickUnlock, enableNativeQuickUnlock, getNativeQuickUnlockEnabled, isNativeAuthPlatform } from "@/lib/native-auth";
import {
  generateStrongPassword,
  getAuthFormIssue,
  getAuthRedirectTo,
  getEmailIssue,
  getOtpCodeIssue,
  getPasswordIssues,
  getPasswordResetRedirectTo,
  getPasswordStrength,
  getSafeAuthErrorMessage,
  getSafeOAuthErrorMessage,
  getSafeOtpErrorMessage,
  getSafeOtpSentMessage,
  getSafePasswordResetMessage,
  getSafeRedirectPath,
  normaliseEmail,
  normaliseOtpCode,
  type SocialAuthProvider,
} from "@/lib/auth-security";
import { checkRateLimit } from "@/lib/rate-limit";

type AuthView = "signin" | "signup" | "forgot" | "otp";

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

const GoogleLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.24c1.9-1.75 2.97-4.32 2.97-7.44Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.59 0-4.79-1.75-5.57-4.11H3.08v2.6A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.43 13.92a6.01 6.01 0 0 1 0-3.84v-2.6H3.08a10 10 0 0 0 0 9.04l3.35-2.6Z" />
    <path fill="#EA4335" d="M12 5.97c1.47 0 2.78.51 3.82 1.5l2.87-2.87C16.95 2.98 14.69 2 12 2a10 10 0 0 0-8.92 5.48l3.35 2.6C7.21 7.72 9.41 5.97 12 5.97Z" />
  </svg>
);

const AppleLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M17.06 12.4c-.03-2.37 1.94-3.51 2.03-3.57-1.1-1.61-2.81-1.83-3.41-1.85-1.45-.15-2.83.85-3.56.85-.74 0-1.88-.83-3.09-.81-1.59.02-3.06.92-3.88 2.35-1.65 2.86-.42 7.09 1.19 9.41.79 1.14 1.73 2.42 2.96 2.37 1.19-.05 1.64-.77 3.07-.77 1.44 0 1.84.77 3.1.75 1.28-.02 2.09-1.16 2.87-2.3.9-1.32 1.28-2.6 1.3-2.66-.03-.01-2.55-.98-2.58-3.77ZM14.73 5.45c.65-.79 1.09-1.89.97-2.98-.94.04-2.07.62-2.75 1.41-.6.7-1.13 1.82-.99 2.89 1.04.08 2.11-.53 2.77-1.32Z"
    />
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<SocialAuthProvider | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isMobileRuntime, setIsMobileRuntime] = useState(false);
  const [quickUnlockEnabled, setQuickUnlockEnabled] = useState(false);
  const [quickUnlockLoading, setQuickUnlockLoading] = useState(false);

  const redirectPath = useMemo(() => getRedirectPath(location.state), [location.state]);
  const authMode = mode === "signup" ? "signup" : "signin";
  const isForgotPassword = mode === "forgot";
  const isOtpMode = mode === "otp";
  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
  const passwordIssues = useMemo(() => getPasswordIssues(password, authMode), [authMode, password]);
  const passwordStrength = getPasswordStrength(password);
  const formIssue = isForgotPassword
    ? getEmailIssue(email)
    : isOtpMode
      ? otpSent ? getOtpCodeIssue(otpCode) : getEmailIssue(email)
      : getAuthFormIssue({ mode: authMode, email, password, fullName });
  const canSubmit = isSupabaseConfigured && !loading && !providerLoading && !isLocked && !formIssue;

  useEffect(() => {
    if (user && mode !== "forgot") navigate(redirectPath, { replace: true });
  }, [user, mode, navigate, redirectPath]);

  useEffect(() => {
    let cancelled = false;
    const syncQuickUnlock = async () => {
      const nativeRuntime = isNativeAuthPlatform();
      if (!cancelled) setIsMobileRuntime(nativeRuntime);
      const enabled = await getNativeQuickUnlockEnabled();
      if (!cancelled) setQuickUnlockEnabled(enabled);
    };

    void syncQuickUnlock();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleOtpRequest = async () => {
    const emailIssue = getEmailIssue(email);
    if (emailIssue) {
      haptic("warning");
      toast.error(emailIssue);
      return;
    }

    const safeEmail = normaliseEmail(email);
    const { error } = await supabase.auth.signInWithOtp({
      email: safeEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getAuthRedirectTo(redirectPath),
      },
    });

    if (error) throw error;

    haptic("success");
    toast.success(getSafeOtpSentMessage());
    setOtpSent(true);
    setOtpCode("");
  };

  const handleOtpVerify = async () => {
    const emailIssue = getEmailIssue(email);
    const codeIssue = getOtpCodeIssue(otpCode);
    if (emailIssue || codeIssue) {
      haptic("warning");
      toast.error(emailIssue ?? codeIssue ?? getSafeOtpErrorMessage());
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: normaliseEmail(email),
      token: normaliseOtpCode(otpCode),
      type: "email",
    });

    if (error) throw error;

    setFailedAttempts(0);
    setLockoutUntil(null);
    await enableNativeQuickUnlock();
    haptic("success");
    toast.success("One-time code verified. Welcome to Xoot.");
    navigate(redirectPath, { replace: true });
  };

  const handleOtpResend = async () => {
    setLoading(true);
    try {
      await handleOtpRequest();
    } catch {
      haptic("warning");
      toast.error(getSafeOtpErrorMessage());
    } finally {
      setLoading(false);
    }
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
        await enableNativeQuickUnlock();
        toast.success("Welcome to Xoot. Your account is ready.");
        navigate(redirectPath, { replace: true });
      } else {
        toast.success("Check your email to finish setting up Xoot.");
        setMode("signin");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
    if (error) throw error;

    setFailedAttempts(0);
    setLockoutUntil(null);
    await enableNativeQuickUnlock();
    haptic("success");
    toast.success("Welcome back.");
    navigate(redirectPath, { replace: true });
  };

  const handleQuickUnlock = async () => {
    if (!isMobileRuntime || quickUnlockLoading) return;

    setQuickUnlockLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await clearNativeQuickUnlock();
        setQuickUnlockEnabled(false);
        haptic("warning");
        toast.error("Your Xoot session timed out. Pick up where you left off to continue.");
        return;
      }

      haptic("success");
      navigate(redirectPath, { replace: true });
    } finally {
      setQuickUnlockLoading(false);
    }
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

    if (!checkRateLimit("auth", 5, 60_000)) {
      haptic("warning");
      toast.error("Too many auth attempts. Please wait a minute before trying again.");
      return;
    }

    setLoading(true);

    try {
      if (isOtpMode) {
        if (otpSent) await handleOtpVerify();
        else await handleOtpRequest();
      } else if (isForgotPassword) await handlePasswordResetRequest();
      else await handlePasswordAuth();
    } catch {
      haptic("warning");
      if (mode === "signin" || (isOtpMode && otpSent)) {
        const nextFailedAttempts = failedAttempts + 1;
        setFailedAttempts(nextFailedAttempts);
        if (nextFailedAttempts >= 4) setLockoutUntil(Date.now() + 30_000);
      }
      toast.error(isOtpMode ? getSafeOtpErrorMessage() : isForgotPassword ? getSafePasswordResetMessage() : getSafeAuthErrorMessage(authMode));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: SocialAuthProvider) => {
    haptic("selection");
    if (!checkRateLimit("auth", 5, 60_000)) {
      haptic("warning");
      toast.error("Too many auth attempts. Please wait a minute before trying again.");
      return;
    }
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

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setPassword(generated);
    setShowPassword(true);
    haptic("success");
    toast.success("Strong password generated. Save it in your password manager.");
  };

  const setAuthMode = (nextMode: AuthView) => {
    haptic("selection");
    setMode(nextMode);
    setPassword("");
    setOtpCode("");
    setOtpSent(false);
    setShowPassword(false);
    setFailedAttempts(0);
    setLockoutUntil(null);
  };

  const passwordStrengthLabel = ["Very weak", "Weak", "Good", "Strong", "Very strong"][passwordStrength];
  const strengthColour = passwordStrength >= 3 ? "bg-sage-deep" : passwordStrength >= 2 ? "bg-primary" : "bg-destructive";
  const heading = mode === "signin"
    ? "Pick up where you left off"
    : mode === "signup"
      ? "Let's get your home sorted"
      : mode === "otp"
        ? "Use an email code"
        : "Reset your password";
  const subheading = mode === "signin"
    ? "Your bookings, XootCred, Care+ status and saved home profile are all here."
    : mode === "signup"
      ? "Set up once and booking a trusted Xooter takes a single tap after that."
      : mode === "otp"
        ? "Get a one-time email code or secure sign-in link for passwordless access."
        : "Enter your email and we will send a secure reset link if the account can access Xoot.";
  const submitLabel = isForgotPassword
    ? "Send reset link"
    : isOtpMode
      ? otpSent ? "Verify code" : "Send one-time code"
      : mode === "signin"
        ? "Continue"
        : "Get started";

  return (
    <div className="grid min-h-screen place-items-center overflow-hidden gradient-hero px-4 py-6 sm:p-6">
      <SEO
        title="Continue to Xoot"
        description="Continue to Xoot to manage bookings, Care+, XootCred, support and protected household details."
        canonical="/auth"
        noIndex
      />
      <Card className="w-full max-w-92 rounded-3xl border-border p-5 shadow-warm sm:max-w-md sm:p-8">
        <Link to="/" className="mb-5 flex items-center gap-2 sm:mb-6" aria-label="Back to Xoot home">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">X</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">Xoot</span>
        </Link>

        <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1">
          {mode === "signin" ? <LockKeyhole className="h-3 w-3 shrink-0 text-sage-deep" /> : mode === "forgot" ? <Mail className="h-3 w-3 shrink-0 text-sage-deep" /> : mode === "otp" ? <KeyRound className="h-3 w-3 shrink-0 text-sage-deep" /> : <Sparkles className="h-3 w-3 shrink-0 text-sage-deep" />}
          <span className="text-xs font-medium text-sage-deep">{mode === "signin" ? "Secure sign-in" : mode === "forgot" ? "Password recovery" : mode === "otp" ? "Email one-time code" : "Join Xoot"}</span>
        </div>

        <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">{heading}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{subheading}</p>

        {!isSupabaseConfigured && (
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-sm leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{supabaseConfigErrorMessage} Auth actions are disabled in this local public-page preview.</span>
          </div>
        )}

        {!isForgotPassword && !isOtpMode && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {(["google", "apple"] as SocialAuthProvider[]).map((provider) => {
              const Icon = provider === "google" ? GoogleLogo : AppleLogo;
              const isProviderLoading = providerLoading === provider;
              return (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  disabled={!isSupabaseConfigured || loading || !!providerLoading}
                  onClick={() => void handleOAuth(provider)}
                >
                  {isProviderLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                  {providerLabels[provider]}
                </Button>
              );
            })}
          </div>
        )}

        {mode === "signin" && isMobileRuntime && quickUnlockEnabled && (
          <Button
            type="button"
            variant="secondary"
            className="mb-5 h-11 w-full rounded-xl"
            onClick={() => void handleQuickUnlock()}
            disabled={loading || providerLoading !== null || quickUnlockLoading}
          >
            {quickUnlockLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
            Continue with Face ID / Touch ID
          </Button>
        )}

        {!isForgotPassword && !isOtpMode && (
          <div className="mb-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>Email and password</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        {isOtpMode && (
          <div className="mb-5 rounded-2xl border border-accent/25 bg-accent-soft p-3 text-sm leading-relaxed text-sage-deep">
            <p className="font-semibold">Passwordless sign-in</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The code is one-time use and should only ever be entered inside this app. Xoot will never ask you for it by phone, email or message.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on" noValidate>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                enterKeyHint="next"
                required
                className="rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (otpSent) {
                  setOtpSent(false);
                  setOtpCode("");
                }
              }}
              autoCapitalize="none"
              autoComplete={mode === "signin" ? "username" : "email"}
              autoCorrect="off"
              inputMode="email"
              spellCheck={false}
              enterKeyHint="next"
              required
              className="rounded-xl"
            />
          </div>

          {isOtpMode && otpSent && (
            <div className="space-y-1.5">
              <Label htmlFor="otp-code">Email code</Label>
              <Input
                id="otp-code"
                name="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(normaliseOtpCode(e.target.value))}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                enterKeyHint="done"
                required
                className="rounded-xl text-center font-display text-2xl tracking-[0.3em]"
              />
              <button
                type="button"
                onClick={() => void handleOtpResend()}
                className="text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
                disabled={loading}
              >
                Send a new code
              </button>
            </div>
          )}

          {!isForgotPassword && !isOtpMode && (
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
                  {mode === "signup" && (
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Generate
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
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
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
              Xoot will never ask for your password, OTP, card PIN or bank login details in chat, WhatsApp, phone calls or email.
            </p>
          </div>

          <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-xl gradient-warm font-semibold shadow-warm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
          </Button>
        </form>

        <div className="mt-5 grid gap-2 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => setAuthMode("otp")} className="transition-smooth hover:text-foreground">
                Use a one-time email code
              </button>
              <button type="button" onClick={() => setAuthMode("signup")} className="transition-smooth hover:text-foreground">
                New to Xoot? Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <button type="button" onClick={() => setAuthMode("signin")} className="transition-smooth hover:text-foreground">
              Been here before? Pick up where you left off
            </button>
          )}
          {(mode === "forgot" || mode === "otp") && (
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
