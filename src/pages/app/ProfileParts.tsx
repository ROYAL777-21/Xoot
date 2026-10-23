import { useEffect, useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, User, type LucideIcon } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { CarePlusSymbol } from "@/components/care-plus/CarePlusSymbol";
import "@/styles/profile-handoff.css";

export function ProfileMark({ size = 23 }: { size?: number }) {
  return <CarePlusSymbol width={size} />;
}
export function ProfileAvatar({ name, src, member = false, large = false }: { name: string; src?: string | null; member?: boolean; large?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <span className={`xoot-you-avatar${large ? " is-large" : ""}`}><span>{src && failedSrc !== src ? <img src={src} alt="" onError={() => setFailedSrc(src)} /> : name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || <User size={25} aria-hidden="true" />}</span>{member && <i><ProfileMark size={18} /></i>}</span>;
}
export function ProfileRow({ icon: Icon, title, detail, value, to, onClick, disabled }: { icon: LucideIcon; title: string; detail?: string; value?: string; to?: string; onClick?: () => void; disabled?: boolean }) {
  const contents = <><Icon size={19} strokeWidth={1.85} aria-hidden="true" /><span><strong>{title}</strong>{detail && <small>{detail}</small>}</span>{value && <em>{value}</em>}<ChevronRight size={17} aria-hidden="true" /></>;
  return to ? <Link className="xoot-you-row" to={to} onClick={() => haptic()}>{contents}</Link> : <button className="xoot-you-row" type="button" disabled={disabled} onClick={() => { haptic(); onClick?.(); }}>{contents}</button>;
}
export function ProfileGroup({ title, children, preferences = false }: { title: string; children: ReactNode; preferences?: boolean }) {
  return <section className={`xoot-you-card is-flat${preferences ? " is-preferences" : ""}`} aria-label={title}><h2 className="xoot-you-label">{title}</h2>{children}</section>;
}
export function ProfileSwitch({ label, description, checked = false, onChange, disabled = false }: { label: string; description?: string; checked?: boolean; onChange?: (value: boolean) => void; disabled?: boolean }) {
  return <label className={`xoot-you-switch${disabled ? " is-unavailable" : ""}`}><span><strong>{label}</strong>{description && <small>{description}</small>}</span><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event => onChange?.(event.target.checked)} /><i aria-hidden="true"><b /></i></label>;
}
export function ProfileState({ loading, error, retry }: { loading?: boolean; error?: string | null; retry?: () => void }) {
  return <div className="xoot-you-state" role={error ? "alert" : "status"}><p>{error || (loading ? "Loading your details…" : "Sign in to view your details.")}</p>{error && <button type="button" onClick={retry}>Try again</button>}</div>;
}
export function ProfileDetail({ title, children, subtitle, trailing, backTo = "/app/profile", backLabel = "Back to You" }: { title: string; children: ReactNode; subtitle?: string; trailing?: ReactNode; backTo?: string; backLabel?: string }) {
  return <div className="xoot-you xoot-you-detail"><header className="xoot-you-topbar"><Link to={backTo} aria-label={backLabel}><ArrowLeft size={20} strokeWidth={2.15} aria-hidden="true" /></Link>{subtitle !== undefined ? <span className="xoot-notifications-heading"><h1>{title}</h1><small>{subtitle}</small></span> : <h1>{title}</h1>}{trailing}</header>{children}</div>;
}

export function ProfileInput({ label, icon: Icon, hint, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: LucideIcon; hint?: string }) {
  return <label>{label}<span className={`xoot-you-input${Icon ? " has-icon" : ""}`}>{Icon && <Icon size={18} strokeWidth={1.8} aria-hidden="true" />}<input {...input} /></span>{hint && <small>{hint}</small>}</label>;
}

export function ProfileFormActions({ saving, label }: { saving: boolean; label: string }) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setKeyboardOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update(); viewport.addEventListener("resize", update); viewport.addEventListener("scroll", update);
    return () => { viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update); };
  }, []);
  return <div className="xoot-you-form-actions" style={{ bottom: keyboardOffset }}><div><button className="xoot-you-primary" type="submit" disabled={saving}>{saving ? "Saving…" : label}</button></div></div>;
}
