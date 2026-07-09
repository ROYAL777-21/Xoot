alter table public.native_push_subscriptions
  drop constraint if exists native_push_subscriptions_token_type_check;

alter table public.native_push_subscriptions
  add constraint native_push_subscriptions_token_type_check
  check (token_type in ('capacitor', 'expo_push', 'web_push', 'unknown'));

alter table public.native_push_subscriptions
  alter column token_type set default 'expo_push';

comment on constraint native_push_subscriptions_token_type_check on public.native_push_subscriptions
  is 'Allows legacy Capacitor, Expo Push Service, web push, and unknown token types without storing provider secrets in the mobile app.';

comment on column public.native_push_subscriptions.token_type
  is 'Native push provider token type. New Zoot native builds use Expo Push Service; legacy Capacitor remains accepted only for backwards compatibility.';
