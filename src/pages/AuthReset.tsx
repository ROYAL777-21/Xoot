import { Logo } from "@/components/kit/Logo";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import {
  generateStrongPassword,
  getPasswordStrength,
  getPasswordUpdateIssue,
  getSafePasswordUpdateErrorMessage,
} from "@/lib/auth-security";
import { haptic } from "@/lib/haptics";
import { sanitiseSearchParam } from "@/lib/sanitise";

const AuthReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordIssue = useMemo(() => getPasswordUpdateIssue(password, confirmation), [password, confirmation]);
  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthLabel = ["Very weak", "Weak", "Good", "Strong", "Very strong"][passwordStrength];
  const strengthColour = passwordStrength >= 3 ? "bg-sage-deep" : passwordStrength >= 2 ? "bg-primary" : "bg-destructive";

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setPassword(generated);
    setConfirmation(generated);
    setShowPassword(true);
    haptic("success");
    toast.success("Strong password generated. Save it in your password manager.");
  };

  useEffect(() => {
    let cancelled = false;

    const prepareResetSession = async () => {
      try {
        const code = sanitiseSearchParam(searchParams.get("code"));
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) setLinkReady(!!session);
      } catch {
        if (!cancelled) setLinkReady(false);
      } finally {
        if (!cancelled) setCheckingLink(false);
      }
    };

    void prepareResetSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwordIssue) {
      haptic("warning");
      toast.error(passwordIssue);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      haptic("success");
      toast.success("Your Xoot password has been updated. Sign in again to continue.");
      navigate("/auth?mode=password", { replace: true });
    } catch {
      haptic("warning");
      toast.error(getSafePasswordUpdateErrorMessage());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero grid place-items-center p-6">
      <SEO
        title="Reset your Xoot password"
        description="Update your Xoot password from a secure reset link."
        canonical="/auth/reset"
        noIndex
      />
      <Card className="w-full max-w-md rounded-3xl border-border p-8 shadow-warm">
        <Link to="/" className="mb-6 flex items-center gap-2" aria-label="Back to Xoot home">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">X</span>
          </span>
          <Logo size={26} tone="violet" />
        </Link>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1">
          <LockKeyhole className="h-3 w-3 text-accent-ink" />
          <span className="text-xs font-medium text-accent-ink">Secure password reset</span>
        </div>

        <h1 className="mb-2 font-display text-3xl font-bold">Create a new password</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Use a strong password that you do not use anywhere else. Xoot will never ask for it in chat, WhatsApp, phone calls or email.
        </p>

        {checkingLink && (
          <div className="grid place-items-center rounded-3xl border border-border bg-muted/30 p-8 text-center">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking your reset link...</p>
          </div>
        )}

        {!checkingLink && !linkReady && (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
            <p className="font-semibold">This reset link has expired or cannot be used.</p>
            <p className="mt-2">Request a new password reset link from the secure sign-in page.</p>
            <Button asChild variant="outline" className="mt-5 rounded-full">
              <Link to="/auth?mode=password">Back to sign-in</Link>
            </Button>
          </div>
        )}

        {!checkingLink && linkReady && (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on" noValidate>
            <div className="space-y-1.5">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <Label htmlFor="password">New password</Label>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Generate
                  </button>
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
                name="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password-confirmation">Confirm password</Label>
              <Input
                id="password-confirmation"
                name="password-confirmation"
                type={showPassword ? "text" : "password"}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                className="rounded-xl"
                required
              />
            </div>

            {password && (
              <div className="rounded-2xl bg-muted/45 p-3 text-xs text-muted-foreground">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span>Password strength</span>
                  <span className="font-semibold text-foreground">{passwordStrengthLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((segment) => (
                    <span key={segment} className={`h-1.5 rounded-full ${segment < passwordStrength ? strengthColour : "bg-border"}`} />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-sage-deep" />
                Password updates sign out active sessions so the next access starts cleanly.
              </p>
            </div>

            <Button type="submit" disabled={loading || !!passwordIssue} className="h-12 w-full rounded-xl font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default AuthReset;
