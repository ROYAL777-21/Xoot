import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { supabase } from '@/lib/supabase';
import { createPkceCallbackConsumer } from './pkce-callback';

WebBrowser.maybeCompleteAuthSession();

export const getAuthRedirectUrl = (path = 'auth/callback') =>
  makeRedirectUri({
    // Must match the PRIMARY scheme in `app.config.ts` and an entry in Supabase's redirect
    // allowlist. `xoot://` stays registered on the app, so an OAuth client still pointing at the
    // old callback keeps working until it is updated.
    scheme: 'xoot',
    path,
  });

const consumeCallback = createPkceCallbackConsumer(async code => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data.session) throw new Error('Sign-in did not create a session. Please try again.');
});
export const createSessionFromUrl = (url: string) => consumeCallback(url, getAuthRedirectUrl());

export const startOAuth = async (provider: 'google' | 'apple') => {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('OAuth provider did not return a URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') {
    if (!await createSessionFromUrl(result.url)) throw new Error('Sign-in returned to an unexpected address.');
  }
  return result;
};

export const subscribeToAuthLinks = (onError: (error: Error) => void) => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    createSessionFromUrl(url).catch(onError);
  });
  return () => subscription.remove();
};
