import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HandoffFlowerField } from '@/components/xoot/HeroArtwork';
import { manageCustomerUpdates, type CustomerUpdatesState, type CustomerChoices } from '@/lib/customer-communications';

type EligibleState = Extract<CustomerUpdatesState, { eligible: true }>;
const choices = [
  ['account_emails', 'Account welcome email', 'A personal hello when your new customer account is ready. Sign-in and security emails are separate.'],
  ['setup_reminders', 'A little help with your place', 'Optional reminders inside Xoot while you finish adding a place. You can explore without doing this.'],
  ['first_booking_reminders', 'A gentle first-visit nudge', 'An optional reminder inside Xoot before your first booking. No visit is booked or charged automatically.'],
] as const;

function OwnerChoices({ token }: { token: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<CustomerUpdatesState | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [saved, setSaved] = useState(false), [reload, setReload] = useState(0);
  const scopeRef = useRef<{ active: boolean } | null>(null);
  useEffect(() => {
    const scope = { active: true }; scopeRef.current = scope;
    setState(null); setBusy(true); setError(''); setSaved(false);
    void manageCustomerUpdates(token, 'get').then(value => { if (scope.active) setState(value); })
      .catch(() => { if (scope.active) setError('Your choices could not be loaded. Please try again.'); })
      .finally(() => { if (scope.active) setBusy(false); });
    return () => { scope.active = false; };
  }, [token, reload]);
  const save = async () => {
    if (!state?.eligible || busy) return;
    const scope = scopeRef.current;
    const values: CustomerChoices = { account_emails: state.account_emails, setup_reminders: state.setup_reminders, first_booking_reminders: state.first_booking_reminders };
    setBusy(true); setError(''); setSaved(false);
    try {
      const next = await manageCustomerUpdates(token, 'save', values, state.revision);
      if (!scope?.active) return;
      if (!next.eligible) { setState(next); return; }
      setState(next); setSaved(true);
    } catch { if (scope?.active) setError('Your choices were not confirmed. Reload them before trying again.'); }
    finally { if (scope?.active) setBusy(false); }
  };
  const setup = async () => {
    if (!state?.eligible || busy) return;
    const scope = scopeRef.current; setBusy(true); setError('');
    try {
      const next = await manageCustomerUpdates(token, 'setup_started');
      if (!scope?.active) return;
      setState(next); if (next.eligible) navigate('/app/profile/homes/new');
    } catch { if (scope?.active) setError('This step could not be saved. Reload your choices, or add a place from You.'); }
    finally { if (scope?.active) setBusy(false); }
  };
  return <section aria-labelledby="customer-update-heading" className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7 mb-6">
    <HandoffFlowerField className="pointer-events-none absolute inset-0 overflow-hidden" items={[{ size: 84, palette: 'lilac', left: '86%', top: '-12%', opacity: .4 }, { size: 55, palette: 'honey', left: '94%', top: '16%', opacity: .4 }]} />
    <div className="relative"><p className="text-xs uppercase tracking-widest text-brand font-semibold mb-2">YOUR XOOT, YOUR CHOICE</p>
      <h2 id="customer-update-heading" className="font-display text-2xl font-bold">A little more in the loop.</h2>
      <p className="text-sm text-muted-foreground mt-2 mb-5">Make room for the updates that help you. Change your choices whenever you like.</p>
      {busy && !state && <p role="status">Loading your choices…</p>}
      {state?.eligible === false && <p role="status">These choices are for your customer experience. Your Xooter updates stay in the Xooter dashboard.</p>}
      {state?.eligible && <><fieldset disabled={busy || !!error} className="space-y-5">{choices.map(([key, label, description]) => <label key={key} className="flex min-h-11 items-start justify-between gap-5" htmlFor={`customer-updates-${key}`}>
        <span><span id={`customer-updates-${key}-label`} className="block font-semibold text-sm">{label}</span><span id={`customer-updates-${key}-help`} className="block text-xs leading-relaxed text-muted-foreground mt-1">{description}</span></span>
        <Switch id={`customer-updates-${key}`} aria-labelledby={`customer-updates-${key}-label`} aria-describedby={`customer-updates-${key}-help`} checked={state[key]} onCheckedChange={value => { setState({ ...state, [key]: value } as EligibleState); setSaved(false); }} />
      </label>)}</fieldset>
        {!state.scheduling_enabled && <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Automatic reminders are not available yet. You can save your choices now.</p>}
        {!state.optional_email_available && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Optional reminders by email, tips and promotions are not available yet.</p>}
        <div className="mt-6 flex flex-wrap gap-3"><Button className="min-h-11" disabled={busy || !!error} onClick={() => void save()}>{busy ? 'Saving…' : 'Save choices'}</Button>
          {!state.setup_complete && <Button className="min-h-11" variant="outline" disabled={busy || !!error} onClick={() => void setup()}>{state.setup_started ? 'Continue adding a place' : 'Add a place when you’re ready'}</Button>}</div>
      </>}
      {error && <div role="alert" className="mt-4 text-sm"><p>{error}</p><Button variant="outline" className="mt-3 min-h-11" disabled={busy} onClick={() => setReload(value => value + 1)}>Reload choices</Button></div>}
      {saved && <p role="status" className="text-sm text-brand mt-3">Your choices are saved.</p>}
    </div>
  </section>;
}

export function CustomerCommunicationPreferences() {
  const { user, session, loading } = useAuth();
  if (loading || !user || !session || session.user.id !== user.id) return <p role="status">Sign in to choose your Xoot updates.</p>;
  return <OwnerChoices key={user.id} token={session.access_token} />;
}
