import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/app"); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Welcome to Zoot! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      navigate("/app");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero grid place-items-center p-6">
      <Card className="w-full max-w-md p-8 rounded-3xl shadow-warm border-border">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">zoot</span>
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-4 border border-accent/20">
          <Sparkles className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">{mode === "signin" ? "Welcome back" : "Join Zoot"}</span>
        </div>

        <h1 className="font-display text-3xl font-bold mb-1">
          {mode === "signin" ? "Sign in to Zoot" : "Create your account"}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {mode === "signin" ? "Book trusted help in seconds." : "Start booking vetted Zooters today."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-xl" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 gradient-warm shadow-warm font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 text-sm text-muted-foreground hover:text-foreground w-full text-center"
        >
          {mode === "signin" ? "New to Zoot? Create an account" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
};

export default Auth;