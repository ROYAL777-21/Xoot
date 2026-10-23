import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { BookOpen, Briefcase, CalendarCheck, ChartColumn, ChevronRight, CreditCard, Gift, Handshake, House, Lightbulb, Lock, MessageCircle, Plus, ShieldCheck, Users, Wallet, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useXootCred } from "@/hooks/useXootCred";
import { getHapticsEnabled, setHapticsEnabled, haptic } from "@/lib/haptics";
import { readProfileOverview } from "./profile-data";
import { useProfileResource, useConfirmedSave } from "./useProfileResource";
import { ProfileAvatar, ProfileGroup, ProfileMark, ProfileRow, ProfileState, ProfileSwitch } from "./ProfileParts";

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
};

export default function Profile() {
  const resource = useProfileResource(readProfileOverview);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const credit = useXootCred();
  const [haptics, setHaptics] = useState(getHapticsEnabled);
  const [hapticError, setHapticError] = useState(false);
  const [leaving, setLeaving] = useState<(() => boolean) | null>(null);
  const logout = useConfirmedSave(resource.isCurrent);
  const data = resource.data;
  const member = data?.membership?.status === "active";
  const membership = data?.membership;
  const since = membership ? dateLabel(membership.started_at) : null;
  const renewal = membership ? dateLabel(membership.next_billing_at) : null;
  const balance = credit.error ? "Unavailable" : credit.loading ? "Loading…" : `R${credit.availableBalance.toFixed(2)}`;

  return <div className="xoot-you"><h1 className="xoot-you-heading">You</h1>
    {!data || leaving === resource.isCurrent ? <ProfileState loading={resource.authLoading || (resource.owner !== null && !resource.error)} error={resource.error} retry={resource.refresh} /> : <div className="xoot-you-content">
      <Link to="/app/profile/account" className="xoot-you-card xoot-you-identity" onClick={() => haptic()}><ProfileAvatar name={data.profile.full_name ?? ""} src={data.profile.avatar_url} member={member} /><span><strong>{data.profile.full_name?.trim() || "Your account"}</strong><small>{member ? `Care+ member${since ? ` since ${since}` : ""}` : user?.email || "Edit your account"}</small></span><ChevronRight size={18} aria-hidden="true" /></Link>
      <Link to="/app/plans" className={`xoot-you-card xoot-you-promo is-care${member ? " is-member" : ""}`}><ProfileMark /><span><strong>{membership ? "Care+ membership" : "Join Care+"}</strong><small>{membership ? `${membership.status.replaceAll("_", " ")}${member && renewal ? ` · next billing ${renewal}` : ""}` : "Explore the membership and current plan"}</small></span><ChevronRight size={18} aria-hidden="true" /></Link>
      <Link to="/app/gifts" className="xoot-you-card xoot-you-promo is-gift"><i><Gift size={20} strokeWidth={1.9} /></i><span><strong>Gift a clean</strong><small>Give someone a visit — they pick the time</small></span><ChevronRight size={18} aria-hidden="true" /></Link>
      <ProfileGroup title="Your places">{data.places.length === 0 && <p className="xoot-you-empty">No places saved yet.</p>}{data.places.map(place => <ProfileRow key={place.id} icon={House} title={place.label} detail={place.address || "Address not added"} value={place.is_default ? "Default" : undefined} to={`/app/profile/homes/${place.id}`} />)}<ProfileRow icon={Plus} title="Add a place" detail="Homes, offices or short-lets" to="/app/profile/homes/new" /></ProfileGroup>
      <ProfileGroup title="Preferences" preferences>
        <ProfileSwitch label="Same Xooter every time" description="Automatic preferred-Xooter matching is unavailable." disabled />
        <ProfileSwitch label="Remind me the evening before" description="Evening reminder scheduling is unavailable." disabled />
        <ProfileSwitch label="Haptic feedback" description="A small tap when something changes, on supported devices" checked={haptics} onChange={enabled => { const saved = setHapticsEnabled(enabled); setHapticError(!saved); if (saved) { setHaptics(enabled); haptic(); } }} />
        {hapticError && <p role="alert" className="xoot-you-error">This device could not save your haptic preference.</p>}
        <ProfileSwitch label="Dark mode" description="Use a darker appearance" checked={resolvedTheme === "dark"} onChange={enabled => { haptic(); setTheme(enabled ? "dark" : "light"); }} />
      </ProfileGroup>
      <ProfileGroup title="Money"><ProfileRow icon={Wallet} title="XootCred" detail="Use it on a booking" value={balance} to="/app/loyalty" />{credit.error && <p className="xoot-you-error">Credit could not be loaded. <button type="button" onClick={credit.refresh}>Try again</button></p>}<ProfileRow icon={CreditCard} title="Payment methods" detail="Saved payment methods are unavailable." disabled /><ProfileRow icon={BookOpen} title="Receipts & invoices" detail="Open a visit to view its payment details" to="/app/bookings" /><ProfileRow icon={Handshake} title="Refer & earn" detail="Referral tracking and fulfilment are unavailable here." disabled /></ProfileGroup>
      <ProfileGroup title="Your app"><ProfileRow icon={Bell} title="Notifications" detail="Notification settings are unavailable; view your feed on Home." disabled /><ProfileRow icon={CalendarCheck} title="Connected calendars" detail="Calendar connections are unavailable." disabled /><ProfileRow icon={ChartColumn} title="Widgets" detail="Home-screen widgets are unavailable." disabled /><ProfileRow icon={Briefcase} title="Manage more" detail="Properties and dashboards" to="/app/properties" /><ProfileRow icon={Users} title="Saved Xooters" detail="Your favourites" to="/app/favorites" /></ProfileGroup>
      <ProfileGroup title="Support"><ProfileRow icon={ShieldCheck} title="XootCover" detail="View the trust and cover policy" to="/app/insurance" /><ProfileRow icon={MessageCircle} title="Get help" detail="Contact support" to="/app/support" /><ProfileRow icon={Lightbulb} title="How Xoot works" to="/#how" /><ProfileRow icon={Lock} title="Privacy & your data" detail="Read the privacy policy" to="/legal/privacy" /></ProfileGroup>
      <button type="button" className="xoot-you-signout" disabled={logout.saving} onClick={() => { void logout.submit(async () => { setLeaving(() => resource.isCurrent); try { await signOut(); } catch { if (resource.isCurrent()) setLeaving(null); throw new Error("Sign out failed. Please try again."); } }, () => navigate("/", { replace: true })); }}>Sign out</button>
      {logout.error && <p className="xoot-you-error" role="alert">{logout.error}</p>}
      <span className="xoot-you-footer">Xoot · Johannesburg</span>
    </div>}
  </div>;
}
