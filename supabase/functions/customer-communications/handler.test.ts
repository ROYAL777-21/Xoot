import { describe, expect, it, vi } from 'vitest';
import { createCustomerCommunicationsHandler } from './handler';
const origin = 'https://xoot.co.za';
const request = (body: unknown, headers: Record<string, string> = { Origin: origin, Authorization: 'Bearer synthetic-customer' }) =>
  new Request('https://example.test', { method: 'POST', headers, body: JSON.stringify(body) });
const setup = () => {
  const rpc = vi.fn().mockResolvedValue({ data: { eligible: true }, error: null });
  const store = vi.fn(() => rpc);
  return { rpc, store, handler: createCustomerCommunicationsHandler([origin], store) };
};
describe('customer-owned update API', () => {
  it('passes only the presented bearer to an owner-bound RPC', async () => {
    const { handler, store, rpc } = setup();
    const response = await handler(request({ action: 'enter' }));
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(store).toHaveBeenCalledWith('Bearer synthetic-customer');
    expect(rpc).toHaveBeenCalledWith('manage_customer_communications', { p_action: 'enter', p_preferences: null, p_revision: null });
  });
  it.each([{ action: 'get', user_id: 'someone-else' }, { action: 'get', now: '2099-01-01' },
    { action: 'setup_complete', recipient: 'foreign@example.test' }, { action: 'get', preferences: {} },
    { action: 'save', revision: 0, preferences: { account_emails: 'true', setup_reminders: true, first_booking_reminders: true } },
    { action: 'save', revision: -1, preferences: { account_emails: true, setup_reminders: true, first_booking_reminders: true } },
    { action: 'collect' }])('rejects caller-owned identity, clock or invalid consent %j', async body => {
    const { handler, store } = setup(); expect((await handler(request(body))).status).toBe(400); expect(store).not.toHaveBeenCalled();
  });
  it('preserves strict explicit consent and revision', async () => {
    const { handler, rpc } = setup();
    expect((await handler(request({ action: 'save', revision: 2, preferences: { account_emails: false, setup_reminders: true, first_booking_reminders: false } }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('manage_customer_communications', { p_action: 'save', p_revision: 2, p_preferences: { account_emails: false, setup_reminders: true, first_booking_reminders: false } });
  });
  it('returns a conflict rather than claiming a stale save', async () => {
    const { handler, rpc } = setup(); rpc.mockResolvedValueOnce({ data: null, error: { code: '40001', message: 'private data' } });
    const response = await handler(request({ action: 'get' })); expect(response.status).toBe(409); expect(await response.text()).not.toContain('private data');
  });
  it('rejects foreign origins and missing authentication before database access', async () => {
    const { handler, store } = setup();
    expect((await handler(request({ action: 'get' }, { Origin: 'https://foreign.example', Authorization: 'Bearer synthetic' }))).status).toBe(403);
    expect((await handler(request({ action: 'get' }, { Origin: origin }))).status).toBe(401); expect(store).not.toHaveBeenCalled();
  });
  it('bounds bodies and does not expose RPC/transport diagnostics', async () => {
    const { handler, rpc } = setup();
    expect((await handler(request({ action: 'get', extra: 'x'.repeat(2048) }))).status).toBe(413);
    rpc.mockRejectedValueOnce(Error('private database diagnostics'));
    const response = await handler(request({ action: 'get' })); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private database');
  });
});
