import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enterCustomerSession } from '@/lib/customer-communications';

/** First confirmed customer-app entry, not another Auth/signup trigger. Never delays children. */
export function CustomerJourneyEntry() {
  const { user, session, loading } = useAuth();
  const owner = !loading && user && session?.user.id === user.id ? user.id : null;
  const [failure, setFailure] = useState<{ owner: string; session: typeof session } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!owner || !session) return;
    let active = true;
    void enterCustomerSession(session).then(() => { if (active) setFailure(null); })
      .catch(() => { if (active) setFailure({ owner, session }); });
    return () => { active = false; };
  }, [owner, session, retry]);
  if (!owner || failure?.owner !== owner || failure.session !== session) return null;
  return <p className="mx-5 mt-3 text-sm text-muted-foreground" role="status">Your update choices could not be loaded. You can keep using Xoot.{' '}
    <button type="button" className="underline font-semibold text-brand" onClick={() => { setFailure(null); setRetry(value => value + 1); }}>Try again</button>
  </p>;
}
