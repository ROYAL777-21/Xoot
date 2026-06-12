---
name: zoot-product
description: Product data skill for Zoot Care+, ZootCred, bookings, household memory, favorite Zooters, property profiles, Airbnb/landlord tools, notifications, loyalty, and replacing mock authenticated user experiences with live Supabase-backed states.
---

# Zoot Product Data Skill

Load `zoot` first. Then read the relevant product docs:

- `../work/zoot_company_wide_md_pack/docs/product/CARE_PLUS_SPEC.md`
- `../work/zoot_company_wide_md_pack/docs/product/ZOOTCRED_REFERRALS.md`
- `../work/zoot_company_wide_md_pack/docs/product/BOOKING_LOGIC.md`
- `../work/zoot_company_wide_md_pack/docs/product/AIRBNB_LANDLORD_HUB.md`
- `../work/zoot_company_wide_md_pack/docs/product/NOTIFICATIONS_AND_COMMS.md`
- `docs/CARE_PLUS_SPEC.md`
- `docs/SEO_BLOG_PLAN.md`

Use [references/product-states.md](references/product-states.md) for key state models.

## Data Rule

Marketing pages may use curated copy and representative benefit examples. Authenticated user pages must not show mock membership, mock ZootCred, mock household profile, fake favorite Zooter, fake property profile, fake booking, or fake payment status in production.

If live data is missing:

- show loading, empty, setup, or pending states;
- add a targeted TODO that names the Supabase table to query;
- do not backfill with mock objects for authenticated users.

## Care+ State Model

Use:

- `subscription_plans`
- `user_subscriptions`
- `household_profiles`
- `property_accounts`
- `zootcred_ledger`
- `zooters` for favorite/previously booked contractors

Care+ activation remains pending until server-side payment confirmation.

## ZootCred State Model

Use `zootcred_ledger` for balance, pending credits, expiry, referral rewards, and redemptions. Do not compute or mutate credits only in the browser.

## Copy and UX

Use Zoot's premium, direct, human tone. Keep claims operationally true. Avoid guarantees that depend on unavailable contractors, payment providers, insurance, or verification systems unless the backend proves them.
