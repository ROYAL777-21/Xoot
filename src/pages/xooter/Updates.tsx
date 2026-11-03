import NotificationsFeed from '@/pages/app/NotificationsFeed';
import {CommunicationPreferences} from '@/components/xooter/CommunicationPreferences';
export default function Updates(){return <NotificationsFeed backTo="/xooter/kyc" backLabel="Back to verification" beforeFeed={<CommunicationPreferences />} />;}
