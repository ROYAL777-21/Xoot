import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock, MapPin } from "lucide-react";
import { blankHome, readHome, saveHome, type HomeDraft } from "./profile-data";
import { useConfirmedSave, useProfileResource } from "./useProfileResource";
import { ProfileDetail, ProfileFormActions, ProfileInput, ProfileState, ProfileSwitch } from "./ProfileParts";

export default function HomeEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const load = useCallback((owner: string) => isNew ? Promise.resolve({ ...blankHome }) : readHome(owner, id ?? ""), [id, isNew]);
  const resource = useProfileResource(load, id);
  return <ProfileDetail title={isNew ? "Add a place" : resource.data?.label || "Your place"}>{resource.data && resource.owner ? <HomeForm key={`${resource.owner}:${id}`} owner={resource.owner} id={isNew ? null : id ?? null} initial={resource.data} isCurrent={resource.isCurrent} /> : <ProfileState loading={resource.authLoading || resource.owner !== null && resource.status === "loading"} error={resource.error} retry={resource.refresh} />}</ProfileDetail>;
}

function HomeForm({ owner, id, initial, isCurrent }: { owner: string; id: string | null; initial: HomeDraft; isCurrent: () => boolean }) {
  const [draft, setDraft] = useState(initial);
  const { saving, error, submit } = useConfirmedSave(isCurrent);
  const navigate = useNavigate();
  const field = (key: keyof Omit<HomeDraft, "is_default">, label: string, max = 1000, multiline = false) => multiline
    ? <label key={key}>{label}<textarea rows={2} value={draft[key] ?? ""} maxLength={max} disabled={saving} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>
    : <ProfileInput key={key} label={label} icon={key === "address" ? MapPin : key === "gate_code" || key === "alarm_code" ? Lock : undefined} value={draft[key] ?? ""} maxLength={max} disabled={saving} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />;
  return <form className="xoot-you-form" onSubmit={event => { event.preventDefault(); void submit(() => saveHome(owner, id, draft), () => navigate("/app/profile")); }}>
    {field("label", "Place name", 120)}{field("address", "Address", 500)}
    <label>What is it?<select disabled value=""><option value="">Unavailable</option></select><small>Place types cannot be saved yet. You can name this place Home, Office, a short-let, or any name you choose.</small></label>
    <ProfileSwitch label="Default place" description="Current saved status. Changing the default place is unavailable." checked={draft.is_default} disabled />
    <section className="xoot-you-card is-flat xoot-you-form-card" aria-label="Getting in"><h2 className="xoot-you-label">Getting in</h2>{field("access_instructions", "How does your Xooter get in?", 1000, true)}{field("gate_code", "Gate code", 100)}{field("alarm_code", "Alarm code", 100)}{field("parking_instructions", "Parking instructions", 1000, true)}{field("access_notes", "Access notes", 1000, true)}</section>
    <section className="xoot-you-card is-flat xoot-you-form-card" aria-label="Anything else worth knowing?"><h2 className="xoot-you-label">Anything else worth knowing?</h2>{field("pet_notes", "Pets", 1000, true)}{field("cleaning_preferences", "Cleaning preferences", 1000, true)}{field("fragile_areas", "Fragile areas", 1000, true)}{field("favourite_products", "Favourite products", 1000, true)}</section>
    {error && <p role="alert" className="xoot-you-error">{error}</p>}
    <ProfileFormActions saving={saving} label="Save this place" />
  </form>;
}
