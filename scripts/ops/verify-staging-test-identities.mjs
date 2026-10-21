// Resolve real users through Supabase Auth before any staging GPS fixture write.
// Distinct token strings alone do not imply distinct accounts (refreshes differ).
export async function verifyStagingTestIdentities({ base, key, tokens, fetcher = fetch }) {
  if (String(base).replace(/\/$/, '') !== 'https://fxmxyabdjqviqbcxmvlp.supabase.co') {
    throw new Error('Identity preflight refuses a non-staging target');
  }
  const ids = new Set();
  for (const [label, token] of Object.entries(tokens)) {
    let user;
    try {
      const reply = await fetcher(new URL('/auth/v1/user', base), {
        headers: { apikey: key, authorization: 'Bearer ' + token },
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
      });
      if (!reply.ok) throw new Error('not authenticated');
      user = await reply.json();
    } catch {
      throw new Error('Staging Auth could not verify test identity: ' + label);
    }
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user?.id ?? '') || user.is_anonymous === true) {
      throw new Error('A signed-in, non-anonymous staging user is required: ' + label);
    }
    if (ids.has(user.id)) throw new Error('Test tokens resolve to the same user; four distinct authorised accounts are required');
    ids.add(user.id);
  }
  if (ids.size !== 4) throw new Error('Four distinct authorised staging accounts are required');
}
