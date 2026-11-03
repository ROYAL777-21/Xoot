import { describe, expect, it } from 'vitest';
import { getCustomerAllowedOrigins } from './origins';
describe('frozen customer CORS policy', () => {
  it('keeps staging hosts out of production defaults', () => {
    expect(getCustomerAllowedOrigins(undefined, 'https://mvlrkelahhsyjrwgsxaf.supabase.co')).toEqual([
      'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'https://xoot.co.za', 'https://www.xoot.co.za',
    ]);
  });
  it('preserves every exact configured preview without widening production', () => {
    const configured = 'https://xoot.co.za, https://xoot-example-royal777-21s-projects.vercel.app';
    expect(getCustomerAllowedOrigins(configured, 'https://mvlrkelahhsyjrwgsxaf.supabase.co')).toHaveLength(2);
    expect(getCustomerAllowedOrigins(configured, 'https://fxmxyabdjqviqbcxmvlp.supabase.co')).toHaveLength(4);
  });
});
