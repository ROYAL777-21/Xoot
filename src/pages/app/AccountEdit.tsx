import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, MapPin, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { readIdentity, saveIdentity, type Identity } from "./profile-data";
import { useConfirmedSave, useProfileResource } from "./useProfileResource";
import { ProfileAvatar, ProfileDetail, ProfileFormActions, ProfileInput, ProfileState } from "./ProfileParts";

export default function AccountEdit() {
  const resource = useProfileResource(readIdentity);
  const { user } = useAuth();
  return <ProfileDetail title="Your account">{resource.data && resource.owner ? <AccountForm key={resource.owner} owner={resource.owner} initial={resource.data} email={user?.email ?? ""} isCurrent={resource.isCurrent} /> : <ProfileState loading={resource.authLoading || resource.owner !== null && resource.status === "loading"} error={resource.error} retry={resource.refresh} />}</ProfileDetail>;
}

function AccountForm({ owner, initial, email, isCurrent }: { owner: string; initial: Identity; email: string; isCurrent: () => boolean }) {
  const [draft, setDraft] = useState(initial);
  const { saving, error, submit } = useConfirmedSave(isCurrent);
  const navigate = useNavigate();
  return <form className="xoot-you-form" onSubmit={event => { event.preventDefault(); void submit(() => saveIdentity(owner, draft), () => navigate("/app/profile")); }}>
    <div className="xoot-you-photo"><ProfileAvatar name={draft.full_name ?? ""} src={draft.avatar_url} large /><button type="button" disabled>Change photo</button><small>Photo uploads are unavailable for customer accounts.</small></div>
    <ProfileInput label="Your name" value={draft.full_name ?? ""} maxLength={120} autoComplete="name" onChange={event => setDraft({ ...draft, full_name: event.target.value })} disabled={saving} />
    <ProfileInput label="Email" icon={BookOpen} value={email} readOnly autoComplete="email" hint="Email changes require a verified change flow, which is unavailable here." />
    <ProfileInput label="Mobile" icon={Phone} value={draft.phone ?? ""} maxLength={30} type="tel" autoComplete="tel" onChange={event => setDraft({ ...draft, phone: event.target.value })} disabled={saving} />
    <ProfileInput label="Default address" icon={MapPin} value={draft.address ?? ""} maxLength={500} autoComplete="street-address" onChange={event => setDraft({ ...draft, address: event.target.value })} disabled={saving} hint="Used to pre-fill your bookings." />
    <label>Preferred language<select disabled value=""><option value="">Unavailable</option></select><small>Language preference saving is unavailable.</small></label>
    {error && <p role="alert" className="xoot-you-error">{error}</p>}
    <ProfileFormActions saving={saving} label="Save changes" />
  </form>;
}
