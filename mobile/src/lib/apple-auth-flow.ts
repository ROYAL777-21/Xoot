/** No credentials are persisted here. The nonce binds Apple's ID token to this request. */
export async function performAppleSignIn<Session>(ports: {
  random: () => Promise<string>;
  sha256: (value: string) => Promise<string>;
  authenticate: (options: { nonce: string; state: string }) => Promise<{ identityToken: string | null; state: string | null }>;
  exchange: (token: string, rawNonce: string) => Promise<{ session: Session | null; error: unknown }>;
}): Promise<Session> {
  const rawNonce = await ports.random();
  const state = await ports.random();
  const credential = await ports.authenticate({ nonce: await ports.sha256(rawNonce), state });
  if (credential.state !== state) throw new Error('Apple sign-in could not be verified. Please try again.');
  if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
  const { session, error } = await ports.exchange(credential.identityToken, rawNonce);
  if (error) throw error;
  if (!session) throw new Error('Apple sign-in did not create a session. Please try again.');
  return session;
}
