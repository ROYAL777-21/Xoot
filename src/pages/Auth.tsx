import { useState, useEffect, useMemo, type SVGProps } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/kit/Logo";
import { HandoffFlowerField } from "@/components/xoot/HeroArtwork";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Fingerprint, KeyRound, Loader2, LockKeyhole, Mail, Phone, ShieldCheck } from "lucide-react";
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
import { AdminMfaVerification } from "@/components/auth/AdminMfaVerification";
import "@/styles/auth-booking.css";

type AuthView = "signin" | "signup" | "forgot" | "otp";

type AuthLocationState = {
  from?: {
    pathname?: string;
    search?: string;
  };
};

const getRedirectPath = (state: unknown, fallback = "/app") => {
  const from = (state as AuthLocationState | null)?.from;
  return getSafeRedirectPath(`${from?.pathname ?? fallback}${from?.search ?? ""}`);
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
  const requiresAdminMfa = new URLSearchParams(location.search).get("reauth") === "admin-mfa";
  const [mode, setMode] = useState<AuthView>(() => {
    const initial = new URLSearchParams(location.search).get("mode");
    if (requiresAdminMfa || initial === "signin" || initial === "otp") return "otp";
    if (initial === "password") return "signin";
    if (initial === "forgot") return "forgot";
    return "signup";
  });
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

  const redirectPath = useMemo(() => getRedirectPath(location.state, requiresAdminMfa ? "/admin/ops" : "/app"), [location.state, requiresAdminMfa]);
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
    if (user && mode !== "forgot" && !requiresAdminMfa) navigate(redirectPath, { replace: true });
  }, [user, mode, navigate, redirectPath, requiresAdminMfa]);

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
    if (!requiresAdminMfa) navigate(redirectPath, { replace: true });
  };

  const handleOtpResend = async () => {
    if (loading || isLocked || !isSupabaseConfigured) return;
    if (!checkRateLimit("auth", 5, 60_000)) {
      haptic("warning");
      toast.error("Too many auth attempts. Please wait a minute before trying again.");
      return;
    }
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
        if (!requiresAdminMfa) navigate(redirectPath, { replace: true });
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
    if (!requiresAdminMfa) navigate(redirectPath, { replace: true });
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
  const strengthColour = passwordStrength >= 3 ? "is-strong" : passwordStrength >= 2 ? "is-good" : "is-weak";
  const isNewAccount = mode === "signup";
  const heading = isNewAccount ? "Let's get your home sorted." : "Pick up where you left off.";
  const subheading = isNewAccount
    ? "Tell us about the place once. After that, booking is quick, clear and already knows the details you chose to save."
    : "Your places, your bookings and your usual details are all still here.";
  const submitLabel = isForgotPassword
    ? "Send reset link"
    : isOtpMode
      ? otpSent ? "Verify code" : "Send one-time code"
      : mode === "signin"
        ? "Continue"
        : "Get started";

  const resetToEmailCode = () => {
    setAuthMode("otp");
  };

  return (
    <main className="xoot-auth-page">
      <SEO
        title="Continue to Xoot"
        description="Continue to Xoot to manage bookings, Care+, XootCred, support and protected household details."
        canonical="/auth"
        noIndex
      />
      <section className="xoot-auth-shell" aria-labelledby="auth-heading">
        <Link to="/" className="xoot-auth-close" aria-label="Back to Xoot home">×</Link>

        <div className="xoot-auth-story">
          <HandoffFlowerField className="xoot-auth-flowers" items={[
            {size:96,palette:"lilac",left:"-8%",top:"6%",opacity:.32},
            {size:64,palette:"petal",left:"82%",top:"-2%",opacity:.3},
            {size:80,palette:"honey",left:"86%",top:"68%",opacity:.28},
            {size:58,palette:"sage",left:"4%",top:"82%",opacity:.3},
          ]} />
          <div className="xoot-auth-story-copy">
            <Logo size={30} tone="violet" />
            <h1 id="auth-heading">{heading}</h1>
            <p>{subheading}</p>
          </div>
          <div className="xoot-auth-proof" aria-label="What stays protected">
            <div><ShieldCheck /><span><strong>Secure by default</strong><small>Protected sign-in and private household details</small></span></div>
            <div><LockKeyhole /><span><strong>Your home stays private</strong><small>Access details are limited to the booking window</small></span></div>
            <div><Mail /><span><strong>Updates in one place</strong><small>Bookings, receipts and account notices stay with your account</small></span></div>
          </div>
        </div>

        <div className="xoot-auth-form-panel">
          {!isSupabaseConfigured && (
            <div className="xoot-auth-notice" role="status">
              <ShieldCheck />
              <span>{supabaseConfigErrorMessage} Auth actions are disabled in this local preview.</span>
            </div>
          )}

          {user && requiresAdminMfa ? <AdminMfaVerification key={user.id} redirectTo={redirectPath} /> : isOtpMode && otpSent ? (
            <form onSubmit={handleSubmit} className="xoot-auth-form" autoComplete="on" noValidate>
              <button type="button" className="xoot-auth-back" onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                <ArrowLeft /> Back
              </button>
              <h2>Check your email</h2>
              <p className="xoot-auth-lede">We sent a code to <strong>{email}</strong>. No password to remember.</p>
              <label className="xoot-auth-field">
                <span>Email code</span>
                <Input
                  id="otp-code"
                  name="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(normaliseOtpCode(e.target.value))}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="000000"
                  enterKeyHint="done"
                  required
                  autoFocus
                  className="xoot-auth-code"
                />
              </label>
              {isLocked && <div className="xoot-auth-error"><AlertCircle />Too many unsuccessful attempts. Please wait 30 seconds before trying again.</div>}
              <Button type="submit" disabled={!canSubmit} className="xoot-auth-primary">
                {loading ? <Loader2 className="animate-spin" /> : "Sign me in"}
              </Button>
              <button type="button" className="xoot-auth-link centered" onClick={() => void handleOtpResend()} disabled={loading || isLocked || !isSupabaseConfigured}>Send a new code</button>
              <p className="xoot-auth-security"><ShieldCheck /> Never share this code. Xoot will not ask for it by phone, message or email.</p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="xoot-auth-form" autoComplete="on" noValidate>
              <span className="xoot-auth-kicker">
                {isForgotPassword ? "Password recovery" : isNewAccount ? "A fresh start" : mode === "signin" ? "Welcome back" : "Welcome back"}
              </span>
              <h2>{isForgotPassword ? "Reset your password" : isNewAccount ? "Create your account" : mode === "signin" ? "Use your password" : "Continue with email"}</h2>
              {isForgotPassword && <p className="xoot-auth-lede">Enter your email and we will send a secure reset link if the account can access Xoot.</p>}

              {isNewAccount && (
                <label className="xoot-auth-field">
                  <span>Full name</span>
                  <Input id="name" name="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" enterKeyHint="next" required />
                </label>
              )}

              <label className="xoot-auth-field">
                <span>Your email</span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (otpSent) { setOtpSent(false); setOtpCode(""); } }}
                  placeholder="you@example.co.za"
                  autoCapitalize="none"
                  autoComplete={mode === "signin" ? "username" : "email"}
                  autoCorrect="off"
                  inputMode="email"
                  spellCheck={false}
                  enterKeyHint={isOtpMode || isForgotPassword ? "done" : "next"}
                  required
                />
              </label>

              {!isForgotPassword && !isOtpMode && (
                <label className="xoot-auth-field">
                  <span className="xoot-auth-field-row">
                    <span>Password</span>
                    <span>
                      {mode === "signin" && <button type="button" onClick={() => setAuthMode("forgot")}>Forgot password?</button>}
                      {mode === "signup" && <button type="button" onClick={handleGeneratePassword}><KeyRound /> Generate</button>}
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-controls="password" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff /> : <Eye />}{showPassword ? "Hide" : "Show"}
                      </button>
                    </span>
                  </span>
                  <Input
                    id="password"
                    aria-label="Password"
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
                  />
                </label>
              )}

              {mode === "signup" && password && (
                <div className="xoot-auth-strength">
                  <span>Password strength <strong>{passwordStrengthLabel}</strong></span>
                  <div>{[0, 1, 2, 3].map((segment) => <i key={segment} className={segment < passwordStrength ? strengthColour : ""} />)}</div>
                  {passwordIssues.length > 0 && <ul>{passwordIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
                </div>
              )}

              {isLocked && <div className="xoot-auth-error"><AlertCircle />Too many unsuccessful attempts. Please wait 30 seconds before trying again.</div>}

              <Button type="submit" disabled={!canSubmit} className="xoot-auth-primary">
                {loading ? <Loader2 className="animate-spin" /> : submitLabel}
              </Button>

              {!isForgotPassword && !isOtpMode && (
                <>
                  <div className="xoot-auth-divider"><span />or<span /></div>
                  <div className="xoot-auth-socials">
                    {(["apple", "google"] as SocialAuthProvider[]).map((provider) => {
                      const Icon = provider === "google" ? GoogleLogo : AppleLogo;
                      return <button key={provider} type="button" onClick={() => void handleOAuth(provider)} disabled={!isSupabaseConfigured || loading || !!providerLoading}>
                        {providerLoading === provider ? <Loader2 className="animate-spin" /> : <Icon />}{providerLabels[provider]}
                      </button>;
                    })}
                  </div>
                </>
              )}

              {mode === "signin" && isMobileRuntime && quickUnlockEnabled && (
                <button type="button" className="xoot-auth-quick" onClick={() => void handleQuickUnlock()} disabled={loading || providerLoading !== null || quickUnlockLoading}>
                  {quickUnlockLoading ? <Loader2 className="animate-spin" /> : <Fingerprint />} Continue with Face ID / Touch ID
                </button>
              )}

              {isOtpMode && <button type="button" disabled className="xoot-auth-phone"><Phone />Continue with phone <em>Soon</em></button>}

              <div className="xoot-auth-switches">
                {isOtpMode && <button type="button" onClick={() => setAuthMode("signin")}>Use your password instead</button>}
                {isOtpMode && <button type="button" onClick={() => setAuthMode("signup")}>First time here? Start fresh</button>}
                {mode === "signin" && <button type="button" onClick={resetToEmailCode}>Use a one-time email code</button>}
                {mode === "signin" && <button type="button" onClick={() => setAuthMode("signup")}>First time here? Start fresh</button>}
                {mode === "signup" && <button type="button" onClick={resetToEmailCode}>Been here before? Pick up where you left off</button>}
                {mode === "forgot" && <button type="button" onClick={() => setAuthMode("signin")}>Back to secure sign-in</button>}
              </div>
              <p className="xoot-auth-terms">By continuing you agree to our <Link to="/legal/terms">terms</Link> and <Link to="/legal/privacy">privacy notice</Link>. Household access details are protected inside your booking.</p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Auth;
