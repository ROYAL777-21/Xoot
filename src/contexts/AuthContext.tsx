import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const identity = useRef<string | null>(null);
  const mounted = useRef(true);

  const commitSession = useCallback((next: Session | null) => {
    const nextIdentity = next?.user.id ?? null;
    if (identity.current !== nextIdentity) queryClient.clear();
    identity.current = nextIdentity;
    setSession(next);
    setUser(next?.user ?? null);
    setLoading(false);
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    mounted.current = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      authRevision++;
      commitSession(s);
    });
    const initialRevision = authRevision;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && authRevision === initialRevision) commitSession(error ? null : data.session);
    }).catch(() => {
      if (active && authRevision === initialRevision) commitSession(null);
    });
    return () => { active = false; mounted.current = false; subscription.unsubscribe(); };
  }, [commitSession]);

  const signOut = async () => {
    const owner = identity.current;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    if (mounted.current && identity.current === owner) commitSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
