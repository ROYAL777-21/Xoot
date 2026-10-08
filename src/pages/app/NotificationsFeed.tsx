import { Bell, CalendarCheck, CircleAlert, CreditCard, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProfileDetail } from "./ProfileParts";
import { useNotifications } from "@/components/notifications/useNotifications";
import { NativePushPrompt } from "@/components/notifications/NativePushPrompt";
import { formatNotificationTime, formatNotificationTimestamp } from "@/components/notifications/notification-data";
import { resolveNotificationLink } from "@/lib/notification-routing";
import { haptic } from "@/lib/haptics";
import "@/styles/notifications-handoff.css";

function presentation(kind: string) {
  if (kind.startsWith("booking_") || kind.startsWith("replacement_")) return { Icon: CalendarCheck, tint: "lilac" };
  if (kind.startsWith("payment_") || kind.startsWith("homecare_") || kind.startsWith("care_plus_")) return { Icon: CreditCard, tint: "sage" };
  if (kind === "safety_sos") return { Icon: CircleAlert, tint: "blush" };
  if (kind.startsWith("support_") || kind.startsWith("concierge_")) return { Icon: LifeBuoy, tint: "mist" };
  return { Icon: Bell, tint: "honey" };
}
export default function NotificationsFeed() {
  const resource = useNotifications();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const subtitle = resource.authLoading ? "Loading…" : !resource.owner ? "Sign in to view notifications" : resource.error ? "Notifications unavailable" : resource.count === null ? "Loading…" : resource.count ? `${resource.count} new` : "All caught up";
  return <ProfileDetail title="Notifications" subtitle={subtitle} backTo="/app" backLabel="Back to Home" trailing={resource.owner && resource.count !== null && resource.count > 0 ? <button className="xoot-notifications-mark-all" type="button" disabled={resource.busy} onClick={() => { haptic(); void resource.markRead(); }}>Mark all read</button> : null}>
    <div className="xoot-notifications-scroll">
      {resource.owner && <NativePushPrompt key={resource.owner} />}
      {resource.loading && resource.owner && <p role="status">Loading notifications…</p>}
      {resource.error && <div className="xoot-notifications-state" role="alert"><p>{resource.error}</p><button type="button" disabled={resource.busy} onClick={() => void resource.refresh()}>Try again</button></div>}
      {resource.actionError && <p role="alert">{resource.actionError}</p>}
      {!resource.authLoading && !resource.owner && <p role="status">Sign in to view notifications.</p>}
      {!resource.loading && !resource.error && resource.owner && resource.items.length === 0 && <p role="status">No notifications yet.</p>}
      <div className="xoot-notifications-list">
        {resource.items.map(item => {
          const { Icon, tint } = presentation(item.kind);
          const destination = resolveNotificationLink(item.link);
          return <button key={item.id} type="button" className={`xoot-notification${item.read ? " is-read" : " is-unread"}`} disabled={resource.busy} aria-label={`${item.title}${item.read ? "" : ", unread"}`} aria-describedby={`notification-body-${item.id} notification-time-${item.id}`} onClick={async () => {
            haptic();
            if (await resource.markRead(item.id) && destination && resource.isCurrent()) navigate(destination);
          }}>
            <span className={`xoot-notification-icon is-${tint}`}><Icon size={19} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className="xoot-notification-copy"><span className="xoot-notification-title"><strong>{item.title}</strong><time id={`notification-time-${item.id}`} title={formatNotificationTimestamp(item.created_at)} aria-label={formatNotificationTimestamp(item.created_at)} dateTime={Number.isFinite(new Date(item.created_at).getTime()) ? item.created_at : undefined}>{formatNotificationTime(item.created_at, now)}</time></span><span id={`notification-body-${item.id}`} className="xoot-notification-body">{item.body}</span></span>
            {!item.read && <span className="xoot-notification-dot" aria-hidden="true" />}
          </button>;
        })}
      </div>
      {resource.pageError && <p role="alert">{resource.pageError}</p>}
      {resource.more && <button className="xoot-notifications-more" type="button" disabled={resource.busy} onClick={() => void resource.loadMore()}>{resource.pageError ? "Retry older notifications" : resource.busy ? "Loading…" : "Load older notifications"}</button>}
    </div>
  </ProfileDetail>;
}
