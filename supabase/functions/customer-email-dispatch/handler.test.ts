import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCustomerJourneyEmail, createCustomerEmailDispatch, trustedCustomerJourneyApp } from './handler';
const id = '10000000-0000-4000-8000-000000000001', nonce = '20000000-0000-4000-8000-000000000001';
const config = { supabaseUrl: 'https://fxmxyabdjqviqbcxmvlp.supabase.co', appUrl: 'https://xoot-example-royal777-21s-projects.vercel.app', smtpConfigured: true };
const email = { id, email: 'synthetic-customer@example.test', first_name: 'Synthetic', kind: 'customer_welcome', title: 'Welcome to Xoot', body: 'Explore Xoot at your own pace.', route: '/app' };
let rpc: ReturnType<typeof vi.fn>, smtp: ReturnType<typeof vi.fn>;
const request = (action = 'dispatch', headers: Record<string, string> = { apikey: 'synthetic-service' }) => new Request('https://example.test', { method: 'POST', headers, body: JSON.stringify({ action }) });
const handler = (changes = {}) => createCustomerEmailDispatch({ ...config, ...changes }, () => ({ rpc }), smtp);
beforeEach(() => {
  rpc = vi.fn().mockImplementation(async (name: string) => ({ data: name === 'customer_email_worker_authorized' ? true
    : name === 'claim_customer_journey_email' ? { id, nonce } : name === 'authorize_customer_journey_email' ? email : true, error: null }));
  smtp = vi.fn().mockResolvedValue({ messageId: `<xoot-customer-${id}@xoot.co.za>` });
});
describe('private customer welcome SMTP boundary', () => {
  it('requires actual service-role authority before any claim or SMTP', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null }); expect((await handler()(request())).status).toBe(401); expect(smtp).not.toHaveBeenCalled(); expect(rpc).toHaveBeenCalledOnce();
  });
  it('refuses browser origin and missing private key', async () => {
    expect((await handler()(request('dispatch', { apikey: 'synthetic', Origin: 'https://xoot.co.za' }))).status).toBe(403);
    expect((await handler()(request('dispatch', {}))).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it('health reports only configuration and makes no claim or send', async () => {
    expect(await (await handler({ smtpConfigured: false })(request('health'))).json()).toEqual({ state: 'closed_until_acceptance', smtpConfigured: false, appUrlAllowed: true });
    expect(rpc).toHaveBeenCalledOnce(); expect(smtp).not.toHaveBeenCalled();
  });
  it('does not consume a claim when SMTP or trusted application URL is missing', async () => {
    expect((await handler({ smtpConfigured: false })(request())).status).toBe(503);
    expect((await handler({ appUrl: 'https://foreign.example' })(request())).status).toBe(503);
    expect(rpc.mock.calls.some(call => call[0] === 'claim_customer_journey_email')).toBe(false);
  });
  it('uses only customer RPCs and independent receipt namespace', async () => {
    const response = await handler()(request()); expect(await response.json()).toEqual({ state: 'accepted', eventId: id });
    expect(response.headers.get('Cache-Control')).toBe('no-store'); expect(smtp).toHaveBeenCalledOnce();
    expect(smtp.mock.calls[0][0].sender).toEqual({ name: 'Xoot', email: 'no-reply@xoot.co.za' });
    expect(smtp.mock.calls[0][0].htmlContent).toContain('https://xoot.co.za/images/xoot-mail-flowers.png');
    expect(smtp.mock.calls[0][0].htmlContent).toContain('/app/profile/updates');
    expect(rpc.mock.calls.every(call => call[0].includes('customer'))).toBe(true);
    expect(rpc).toHaveBeenLastCalledWith('finish_customer_journey_email', { p_id: id, p_nonce: nonce, p_state: 'accepted', p_message_id: `<xoot-customer-${id}@xoot.co.za>` });
  });
  it('rechecks live consent and role after claim rather than sending cached recipient', async () => {
    rpc.mockImplementation(async (name: string) => ({ data: name === 'customer_email_worker_authorized' ? true : name === 'claim_customer_journey_email' ? { id, nonce } : null, error: null }));
    expect(await (await handler()(request())).json()).toEqual({ state: 'suppressed', eventId: id }); expect(smtp).not.toHaveBeenCalled();
  });
  it('never retries an uncertain SMTP outcome or exposes provider diagnostics', async () => {
    smtp.mockRejectedValueOnce(Error('private provider/recipient diagnostic'));
    expect(await (await handler()(request())).json()).toEqual({ state: 'uncertain', eventId: id }); expect(smtp).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenLastCalledWith('finish_customer_journey_email', { p_id: id, p_nonce: nonce, p_state: 'uncertain', p_message_id: null });
  });
  it('requires fresh authorization and successful exact receipt acknowledgement', async () => {
    const times = [0, 2001]; expect((await createCustomerEmailDispatch(config, () => ({ rpc }), smtp, () => times.shift()!)(request())).status).toBe(503); expect(smtp).not.toHaveBeenCalled();
    rpc.mockImplementation(async (name: string) => ({ data: name === 'customer_email_worker_authorized' ? true : name === 'claim_customer_journey_email' ? { id, nonce } : name === 'authorize_customer_journey_email' ? email : false, error: null }));
    expect(await (await handler()(request())).json()).toEqual({ state: 'uncertain', eventId: id });
  });
  it.each(['customer_setup_24h', 'customer_first_booking', 'xooter_welcome', 'booking_confirmed'])('keeps unsupported or optional external kind %s closed', async kind => {
    rpc.mockImplementation(async (name: string) => ({ data: name === 'customer_email_worker_authorized' ? true : name === 'claim_customer_journey_email' ? { id, nonce } : name === 'authorize_customer_journey_email' ? { ...email, kind } : true, error: null }));
    expect((await handler()(request())).status).toBe(503); expect(smtp).not.toHaveBeenCalled();
  });
  it('escapes safe personalization and refuses redirects/header injection', () => {
    const built = buildCustomerJourneyEmail({ ...email, first_name: '<svg onload=evil()>' }, config.appUrl, true);
    expect(built.htmlContent).not.toContain('<svg onload'); expect(built.htmlContent).toContain('&lt;svg'); expect(built.subject).toMatch(/^\[Xoot staging test\]/);
    expect(() => buildCustomerJourneyEmail({ ...email, route: '/xooter' }, config.appUrl, true)).toThrow();
    expect(() => buildCustomerJourneyEmail({ ...email, title: 'Xoot\r\nBcc:foreign' }, config.appUrl, true)).toThrow();
  });
  it('allows canonical links in production and owned staging links only', () => {
    expect(trustedCustomerJourneyApp('https://xoot.co.za', 'mvlrkelahhsyjrwgsxaf')).toBe(true);
    expect(trustedCustomerJourneyApp(config.appUrl, 'mvlrkelahhsyjrwgsxaf')).toBe(false);
    expect(trustedCustomerJourneyApp('https://xoot.co.za.evil.test', 'mvlrkelahhsyjrwgsxaf')).toBe(false);
  });
});
