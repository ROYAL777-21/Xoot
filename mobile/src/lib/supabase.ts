import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { assertValidMobileConfig, mobileEnv } from '@/lib/env';
import { secureSessionStorage } from '@/lib/secure-storage';
import type { Database } from '../../../src/integrations/supabase/types';

assertValidMobileConfig();

const supabaseUrl =
  mobileEnv.supabaseUrl ||
  (mobileEnv.appEnv === 'development' ? 'http://127.0.0.1:54321' : '');
const supabasePublishableKey =
  mobileEnv.supabasePublishableKey ||
  (mobileEnv.appEnv === 'development' ? 'development-placeholder-publishable-key' : '');

export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: secureSessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
