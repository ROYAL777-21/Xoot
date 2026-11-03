import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerCommunicationPreferences } from './CustomerCommunicationPreferences';
import { CustomerJourneyEntry } from './CustomerJourneyEntry';
const mocks = vi.hoisted(() => ({ owner: 'one', sessionOwner: 'one', loading: false, invoke: vi.fn(), session: null as null | { user: { id: string }; access_token: string } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.owner }, session: mocks.session, loading: mocks.loading }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
const defaults = { eligible: true, account_emails: true, setup_reminders: false, first_booking_reminders: false, revision: 0,
  setup_started: false, setup_complete: false, optional_email_available: false, scheduling_enabled: false };
const response = (data: unknown = defaults) => ({ data: { success: true, data }, error: null });
function Where() { return <p aria-label="Current route">{useLocation().pathname}</p>; }
function Fixture() { return <MemoryRouter><CustomerCommunicationPreferences /><Where /></MemoryRouter>; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.owner = 'one'; mocks.loading = false; mocks.session = { user: { id: 'one' }, access_token: 'synthetic-one' };
  mocks.invoke.mockResolvedValue(response());
});
afterEach(cleanup);
describe('customer choices use the actual own confirmed response', () => {
  it('shows saved choices, optional off, flowers and honest scheduling availability', async () => {
    await act(async () => { render(<Fixture />); });
    expect(screen.getByRole('switch', { name: /A little help/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /first-visit nudge/ })).not.toBeChecked();
    expect(screen.getByText(/Automatic reminders are not available yet/)).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith('customer-communications', expect.objectContaining({ headers: { Authorization: 'Bearer synthetic-one' }, body: { action: 'get' } }));
  });
  it('does not infer consent or render switches on a failed or malformed response', async () => {
    mocks.invoke.mockResolvedValueOnce(response({ ...defaults, setup_reminders: 'true' }));
    await act(async () => { render(<Fixture />); });
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded'); expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
  it('does not present customer instructions to a current worker-only account', async () => {
    mocks.invoke.mockResolvedValueOnce(response({ eligible: false })); await act(async () => { render(<Fixture />); });
    expect(screen.getByRole('status')).toHaveTextContent('Xooter dashboard'); expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
  it('only claims saved after server acknowledgement with the actual revision', async () => {
    await act(async () => { render(<Fixture />); }); fireEvent.click(screen.getByRole('switch', { name: /A little help/ }));
    let finish!: (value: unknown) => void; mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save choices' })); });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled(); expect(screen.queryByText('Your choices are saved.')).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenLastCalledWith('customer-communications', expect.objectContaining({ body: { action: 'save', revision: 0, preferences: { account_emails: true, setup_reminders: true, first_booking_reminders: false } } }));
    await act(async () => { finish(response({ ...defaults, setup_reminders: true, revision: 1 })); }); expect(screen.getByRole('status')).toHaveTextContent('Your choices are saved.');
  });
  it('requires reload after a failed or stale save and exposes no raw diagnostics', async () => {
    await act(async () => { render(<Fixture />); }); mocks.invoke.mockResolvedValueOnce({ data: null, error: { message: 'private RPC recipient' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save choices' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('not confirmed'); expect(screen.getByRole('button', { name: 'Save choices' })).toBeDisabled(); expect(screen.queryByText(/private RPC/)).not.toBeInTheDocument();
  });
  it('records a deliberate setup start before opening the existing place form', async () => {
    await act(async () => { render(<Fixture />); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add a place when/ })); });
    expect(mocks.invoke).toHaveBeenLastCalledWith('customer-communications', expect.objectContaining({ body: { action: 'setup_started' } }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/app/profile/homes/new');
  });
  it('drops former-owner responses and hides them synchronously during auth changes', async () => {
    let finish!: (value: unknown) => void; mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let fixture!: ReturnType<typeof render>; await act(async () => { fixture = render(<Fixture />); });
    mocks.owner = 'two'; mocks.session = { user: { id: 'two' }, access_token: 'synthetic-two' };
    await act(async () => { fixture.rerender(<Fixture />); });
    await act(async () => { finish(response({ ...defaults, setup_reminders: true, first_booking_reminders: true })); });
    expect(screen.getByRole('switch', { name: /A little help/ })).not.toBeChecked();
    mocks.loading = true; fixture.rerender(<Fixture />); expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
  it('does not send when Auth user and session owner disagree', async () => {
    mocks.session = { user: { id: 'foreign' }, access_token: 'synthetic-foreign' };
    await act(async () => { render(<Fixture />); }); expect(mocks.invoke).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toHaveTextContent('Sign in');
  });
});
describe('nonblocking first customer-app entry', () => {
  it('deduplicates route remounts within the actual in-memory session', async () => {
    const first = render(<CustomerJourneyEntry />); await act(async () => {}); first.unmount();
    render(<CustomerJourneyEntry />); await act(async () => {});
    expect(mocks.invoke).toHaveBeenCalledOnce(); expect(mocks.invoke).toHaveBeenCalledWith('customer-communications', expect.objectContaining({ body: { action: 'enter' } }));
  });
  it('does not delay a child screen and offers a retry without raw account data', async () => {
    mocks.invoke.mockRejectedValueOnce(Error('private diagnostic'));
    await act(async () => { render(<><CustomerJourneyEntry /><h1>Your home</h1></>); });
    expect(screen.getByRole('heading', { name: 'Your home' })).toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('keep using Xoot');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); }); expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
});
