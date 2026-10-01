import { Bell } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "./useNotifications";
import "@/styles/notifications-handoff.css";

export const NotificationBell = () => {
  const notifications = useNotifications(false);
  const descriptionId = useId();
  const hasCount = !notifications.error && notifications.count !== null;
  return <><Link to="/app/notifications" className="xoot-notifications-entry" aria-label="Notifications" aria-describedby={hasCount ? descriptionId : undefined}>
    <Bell size={20} aria-hidden="true" />
    {hasCount && notifications.count > 0 && <span aria-hidden="true" className="xoot-notifications-unread" />}
  </Link>{hasCount && <span id={descriptionId} className="sr-only">{notifications.count} unread notifications</span>}</>;
};
