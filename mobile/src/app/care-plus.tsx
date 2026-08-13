import { useState } from 'react';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, XootScreen } from '@/components/xoot-ui';
import { invokeXootFunction } from '@/lib/edge-functions';
import { useAuth } from '@/providers/auth-provider';

type CarePlusResponse = {
  subscription_id?: string;
  subscription_status?: string;
  payment_record_id?: string;
  already_exists?: boolean;
};

export default function CarePlusScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestMembership = async () => {
    if (!user) {
      setStatus('Sign in first to request Care+ membership.');
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      const response = await invokeXootFunction<CarePlusResponse>('care-plus-membership', {
        action: 'request_membership',
        planId: 'xoot-care-plus',
      });
      setStatus(
        response.already_exists
          ? `Care+ is already ${response.subscription_status}.`
          : 'Care+ request recorded. Membership activates only after payment confirmation.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Care+ request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <XootScreen>
      <LiquidCard>
        <Eyebrow>Care+</Eyebrow>
        <Title>A calmer home-care rhythm for R99/month.</Title>
        <Body muted>
          Care+ is designed around Home Memory, favourite Xooter preference, priority support, and monthly XootCred where available.
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>{user ? 'Account connected' : 'Guest preview'}</StatusPill>
        <PrimaryButton disabled={isSubmitting} onPress={requestMembership}>
          {isSubmitting ? 'Requesting Care+' : 'Join Care+ membership'}
        </PrimaryButton>
        <SecondaryButton disabled>
          Payment checkout activates after Stitch/Ozow credentials are connected
        </SecondaryButton>
        {status ? <Body>{status}</Body> : null}
      </LiquidCard>

      <LiquidCard>
        <Eyebrow>Member experience</Eyebrow>
        <Body>
          The mobile UI should show real membership, XootCred ledger, favourite Xooter, and property profiles from Supabase only. No production mock data.
        </Body>
      </LiquidCard>
    </XootScreen>
  );
}
