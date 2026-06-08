import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { NativePushPrompt } from "@/components/notifications/NativePushPrompt";

type N = { id: string; kind: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export const NotificationBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as N[]);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  const unread = items.filter((i) => !i.read).length;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid place-items-center h-9 w-9 rounded-full hover:bg-muted transition-colors" aria-label="Notifications">
        <Bell className="h-4 w-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid place-items-center min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-display font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <NativePushPrompt />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">No notifications yet.</p>
          ) : (
            items.map((n) => {
              const Body = (
                <div className={`px-4 py-3 border-b border-border last:border-0 ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                        {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              );
              return n.link ? <Link key={n.id} to={n.link}>{Body}</Link> : <div key={n.id}>{Body}</div>;
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
