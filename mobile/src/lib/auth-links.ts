import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const oauthProviderAvailability = {
  google: process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED === 'true',
  apple: process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED === 'true',
} as const;

export const getAuthRedirectUrl = (path = 'auth/callback') =>
  makeRedirectUri({
    scheme: 'zoot',
    path,
  });

let lastAuthUrl: string | null = null;
let lastAuthPromise: ReturnType<typeof exchangeSessionFromUrl> | null = null;

async function exchangeSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  const errorDescription = typeof params.error_description === 'string' ? params.error_description : null;
  if (errorCode || errorDescription) throw new Error(errorDescription ?? errorCode ?? 'OAuth callback failed');

  const code = typeof params.code === 'string' ? params.code : null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.session;
}

export const createSessionFromUrl = (url: string) => {
  if (lastAuthUrl === url && lastAuthPromise) return lastAuthPromise;
  lastAuthUrl = url;
  lastAuthPromise = exchangeSessionFromUrl(url);
  return lastAuthPromise;
};

export const startOAuth = async (provider: 'google' | 'apple') => {
  if (!oauthProviderAvailability[provider]) {
    throw new Error(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in is not available in this build.`);
  }
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
    await createSessionFromUrl(result.url);
  }
  return result;
};

export const subscribeToAuthLinks = (onError: (error: Error) => void) => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    createSessionFromUrl(url).catch(onError);
  });
  return () => subscription.remove();
};
