import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type SavedAddress = {
  id: string;
  label: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  is_default: boolean;
};

type Props = {
  value: string;
  onChange: (address: string) => void;
};

export const AddressPicker = ({ value, onChange }: Props) => {
  const { user } = useAuth();
  const [list, setList] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "Home", address: "", city: "", postal_code: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    const items = (data ?? []) as SavedAddress[];
    setList(items);
    if (!value && items[0]) onChange(items[0].address);
    setLoading(false);
  }, [onChange, user, value]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user || !draft.address.trim()) return toast.error("Please enter an address");
    const isFirst = list.length === 0;
    const { error, data } = await supabase
      .from("saved_addresses")
      .insert({ user_id: user.id, ...draft, is_default: isFirst })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Address saved");
    setAdding(false);
    setDraft({ label: "Home", address: "", city: "", postal_code: "" });
    onChange((data as SavedAddress).address);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("saved_addresses").delete().eq("id", id);
    load();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : list.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-2">
          {list.map((a) => {
            const active = value === a.address;
            return (
              <button
                type="button"
                key={a.id}
                onClick={() => onChange(a.address)}
                className={`text-left rounded-2xl border p-3 transition-all ${
                  active
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">{a.label}</span>
                    {a.is_default && <Star className="h-3 w-3 fill-primary text-primary" />}
                  </div>
                  <div className="flex gap-1 opacity-60 hover:opacity-100">
                    {!a.is_default && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setDefault(a.id); }}
                        className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
                      >
                        Set default
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); remove(a.id); }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.address}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {adding ? (
        <div className="rounded-2xl border border-border p-3 space-y-2 bg-card">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Label (Home, Office)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <Input placeholder="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
          </div>
          <Input placeholder="Street address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          <Input placeholder="Postal code" value={draft.postal_code} onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={save} className="flex-1">Save address</Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)} className="rounded-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add new address
        </Button>
      )}
    </div>
  );
};
