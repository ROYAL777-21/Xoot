-- Align integration_outbox channel constraints with native Expo push delivery.
-- The sensitive-access availability scheduler queues expo_push outbox rows.

alter table public.integration_outbox
  drop constraint if exists integration_outbox_channel_check;

alter table public.integration_outbox
  add constraint integration_outbox_channel_check
  check (
    channel in (
      'in_app',
      'brevo_email',
      'whatsapp_status',
      'whatsapp_urgent',
      'twilio_voice',
      'twilio_conversations',
      'payment_provider',
      'mie_screening',
      'airtable_ops',
      'expo_push'
    )
  );

comment on constraint integration_outbox_channel_check on public.integration_outbox
  is 'Allows only approved provider-delivery channels, including native Expo push notifications.';
