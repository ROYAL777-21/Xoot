import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { performAppleSignIn } from './apple-auth-flow';
import { startOAuth } from './auth-links';

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
  if (Platform.OS !== 'ios') return Platform.OS === 'android';
  return AppleAuthentication.isAvailableAsync();
};

export const signInWithApple = async () => {
  if (Platform.OS !== 'ios') return startOAuth('apple');
  return performAppleSignIn({
  random: async () => Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join(''),
  sha256: value => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  authenticate: options => AppleAuthentication.signInAsync({
    ...options,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  }),
  exchange: async (token, nonce) => {
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce });
    return { session: data.session, error };
  },
  });
};

/**
 * `ERR_REQUEST_CANCELED` is what the sheet throws when the user dismisses it, which is
 * not a failure and must not surface as an error.
 */
export const isAppleSignInCancellation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED';
