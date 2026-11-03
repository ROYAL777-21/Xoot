/** Same reviewed exact-origin policy as action-utils, without importing its floating SDK/admin
 * factory into a customer-owned handler. This module is frozen into this handler at deploy. */
const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'https://xoot.co.za', 'https://www.xoot.co.za'];
export function getCustomerAllowedOrigins(configured: string | undefined, supabaseUrl: string) {
  const values = configured?.split(',').map(value => value.trim()).filter(Boolean);
  const permitted = values?.length ? values : defaults;
  return supabaseUrl === 'https://fxmxyabdjqviqbcxmvlp.supabase.co'
    ? [...new Set([...permitted, 'https://staging.xoot.co.za', 'https://preview.xoot.co.za'])] : [...permitted];
}
