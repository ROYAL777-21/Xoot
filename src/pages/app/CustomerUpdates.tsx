import { Bell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProfileDetail } from './ProfileParts';
import { CustomerCommunicationPreferences } from '@/components/notifications/CustomerCommunicationPreferences';

export default function CustomerUpdates() {
  return <ProfileDetail title="Your updates" backTo="/app/profile" backLabel="Back to You">
    <CustomerCommunicationPreferences />
    <Link to="/app/notifications" className="xoot-you-card xoot-you-row"><Bell size={20} aria-hidden="true" /><span><strong>Your notifications</strong><small>Read the updates saved in your account</small></span><ChevronRight size={18} aria-hidden="true" /></Link>
    <p className="px-2 mt-4 text-xs text-muted-foreground">Private visit details stay inside Xoot. Open a visit for the latest information.</p>
  </ProfileDetail>;
}
