import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type CustomerChoices = { account_emails: boolean; setup_reminders: boolean; first_booking_reminders: boolean };
export type CustomerUpdatesState = ({ eligible: true; revision: number; setup_started: boolean; setup_complete: boolean;
  optional_email_available: boolean; scheduling_enabled: boolean } & CustomerChoices) | { eligible: false };
export type CustomerUpdateAction = 'enter' | 'get' | 'save' | 'setup_started' | 'setup_complete';
const booleanFields = ['account_emails', 'setup_reminders', 'first_booking_reminders', 'setup_started', 'setup_complete', 'optional_email_available', 'scheduling_enabled'] as const;

function parseState(value: unknown): CustomerUpdatesState {
  if (!value || typeof value !== 'object' || !('eligible' in value)) throw Error('Update choices unavailable');
  if (value.eligible === false) return { eligible: false };
  const state = value as CustomerUpdatesState;
  if (state.eligible !== true || booleanFields.some(key => typeof state[key] !== 'boolean')
    || !Number.isSafeInteger(state.revision) || state.revision < 0) throw Error('Update choices unavailable');
  return state;
}

export async function manageCustomerUpdates(token: string, action: CustomerUpdateAction, choices?: CustomerChoices, revision?: number) {
  const body = action === 'save' ? { action, preferences: choices, revision } : { action };
  const { data, error } = await supabase.functions.invoke('customer-communications', {
    headers: { Authorization: `Bearer ${token}` }, body, signal: AbortSignal.timeout(15_000),
  });
  if (error || data?.success !== true) throw Error('Your update choices could not be confirmed.');
  return parseState(data.data);
}

// AppShell may remount between routes. Deduplicate its nonblocking entry within the actual
// in-memory Auth session; retain no DTO, owner, token, profile or address in this cache.
const entries = new WeakMap<Session, Promise<void>>();
export function enterCustomerSession(session: Session) {
  const existing = entries.get(session);
  if (existing) return existing;
  const entry = manageCustomerUpdates(session.access_token, 'enter').then(() => undefined);
  entries.set(session, entry);
  void entry.catch(() => { if (entries.get(session) === entry) entries.delete(session); });
  return entry;
}
