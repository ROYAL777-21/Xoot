import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const getAuthRedirectUrl = (path = 'auth/callback') =>
  makeRedirectUri({
    scheme: 'zoot',
    path,
  });

export const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.session;
};

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
