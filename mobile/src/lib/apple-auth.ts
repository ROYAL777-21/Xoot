import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Sign in with Apple, natively.
 *
 * Not a preference. Apple's Guideline 4.8 requires an app that offers third-party
 * sign-in — Xoot offers Google — to also offer Sign in with Apple, and on iOS it has to
 * be the native sheet. Routing Apple through the same web browser flow as Google is a
 * documented rejection reason, and `app.config.ts` was already claiming the
 * `usesAppleSignIn` entitlement with no module installed to honour it.
 *
 * The native flow returns an identity token, which Supabase exchanges directly. That
 * skips the browser round trip entirely, so it is also the faster path.
 */

export const isAppleSignInAvailable = async () => {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
};

export const signInWithApple = async () => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  // Apple returns the identity token once, on the first authorisation. On every later
  // sign-in the name and email come back null — Apple assumes the app stored them. So
  // the token is the only thing that can be relied on here, and the profile is filled
  // from what Supabase already holds.
  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  return data.session;
};

/**
 * `ERR_REQUEST_CANCELED` is what the sheet throws when the user dismisses it, which is
 * not a failure and must not surface as an error.
 */
export const isAppleSignInCancellation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED';
