import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readPlaces, removeHome, selectDefaultHome } from "@/lib/saved-places-client";
import { defaultPlace, type PlaceSummary } from "@/lib/saved-places";
import { useConfirmedSave, useProfileResource } from "@/pages/app/useProfileResource";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { value: string; onChange: (address: string) => void };
export const AddressPicker = (props: Props) => {
  const resource = useProfileResource(readPlaces);
  if (!resource.owner) return null;
  // Keep the owner-scoped draft mounted while refreshing its list. An unconfirmed
  // creation must retry the same UUID, including after the suggested reload.
  return <PickerBody key={resource.owner} {...props} owner={resource.owner} list={resource.data} loadError={resource.error} refresh={resource.refresh} isCurrent={resource.isCurrent} />;
};
function PickerBody({ value, onChange, owner, list, loadError, refresh, isCurrent }: Props & { owner: string; list: PlaceSummary[] | null; loadError: string | null; refresh: () => Promise<void>; isCurrent: () => boolean }) {
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState({ label: "Home", address: "", city: "", postal_code: "" });
  const [creationSelection, setCreationSelection] = useState<boolean | null | undefined>(undefined);
  const { saving, error, submit } = useConfirmedSave(isCurrent);
  const disabled = saving || !list;
  const resetDraft = () => {
    setAdding(false);
    setNewId(crypto.randomUUID());
    setDraft({ label: "Home", address: "", city: "", postal_code: "" });
    setCreationSelection(undefined);
  };
  useEffect(() => {
    if (!list) return;
    const place = defaultPlace(list);
    if (isCurrent() && !value && place?.address) onChange(place.address);
  }, [list, value, onChange, isCurrent]);
  const save = () => submit(async () => {
    if (!list) throw new Error("Reload your places before trying again.");
    const selected = creationSelection === undefined ? list.length === 0 ? true : null : creationSelection;
    setCreationSelection(selected);
    const { data, error } = await supabase.rpc("save_home", { p_expected_owner: owner, p_home_id: newId, p_details: draft, p_selected: selected });
    if (error || !data || typeof data !== "object" || Array.isArray(data) || data.id !== newId || typeof data.is_default !== "boolean" || selected === true && !data.is_default)
      throw new Error("Saving this address could not be confirmed. Reload your places before trying again.");
  }, () => { toast.success("Address saved"); onChange(draft.address); resetDraft(); void refresh(); });
  const changeDefault = (id: string) => submit(() => selectDefaultHome(owner, id), () => { toast.success("Default place saved"); void refresh(); });
  const remove = (id: string) => submit(() => removeHome(owner, id), () => { toast.success("Place removed"); void refresh(); });
  return <div className="space-y-3" aria-busy={disabled}>
    {!list && !loadError && <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading places" />}
    {loadError && <p role="alert">{loadError} <button type="button" disabled={saving} onClick={() => void refresh()}>Try again</button></p>}
    <div className="grid sm:grid-cols-2 gap-2">{list?.map(a => <div key={a.id} className={`text-left rounded-2xl border p-3 transition-all ${value === a.address ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/40"}`}>
      <div className="flex items-center justify-between gap-2 mb-1"><button type="button" disabled={saving || !a.address} onClick={() => onChange(a.address ?? "")} className="flex items-center gap-2 text-left">
        <MapPin className="h-3.5 w-3.5 text-primary" /><span className="text-sm font-semibold">{a.label}</span>{a.is_default && <Star aria-label="Default place" className="h-3 w-3 fill-primary text-primary" />}
      </button><div className="flex gap-1 opacity-60 hover:opacity-100">
        {!a.is_default && <button type="button" disabled={saving} onClick={() => void changeDefault(a.id)} className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">Set default</button>}
        <button type="button" disabled={saving} onClick={() => void remove(a.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${a.label}`}><Trash2 className="h-3.5 w-3.5" /></button>
      </div></div><p className="text-xs text-muted-foreground line-clamp-2">{a.address}</p>
    </div>)}</div>
    {error && <p role="alert">{error} <button type="button" disabled={saving} onClick={() => void refresh()}>Reload places</button></p>}
    {adding ? <div className="rounded-2xl border border-border p-3 space-y-2 bg-card"><div className="grid grid-cols-2 gap-2">
      <Input disabled={disabled} aria-label="Place label" placeholder="Label (Home, Office)" maxLength={120} value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} />
      <Input disabled={disabled} aria-label="City" placeholder="City" maxLength={120} value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} />
    </div><Input disabled={disabled} aria-label="Street address" placeholder="Street address" maxLength={500} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} />
      <Input disabled={disabled} aria-label="Postal code" placeholder="Postal code" maxLength={30} value={draft.postal_code} onChange={e => setDraft({ ...draft, postal_code: e.target.value })} />
      <div className="flex gap-2"><Button type="button" disabled={saving} size="sm" variant="ghost" onClick={resetDraft}>Cancel</Button><Button type="button" disabled={disabled} size="sm" onClick={() => void save()} className="flex-1">{saving ? "Saving…" : "Save address"}</Button></div>
    </div> : <Button type="button" disabled={disabled} size="sm" variant="outline" onClick={() => setAdding(true)} className="rounded-full"><Plus className="h-3.5 w-3.5 mr-1" /> Add new address</Button>}
  </div>;
}
