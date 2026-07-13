# Haptics

Haptics reinforce a visible state change; they never replace one.

## Allowed uses

- light selection feedback for service, date, duration, tab, or segmented choice;
- impact feedback when an approved glass control settles;
- success feedback only after backend-confirmed booking, payment, or saved change;
- warning or error feedback for a user-correctable blocked action;
- strong urgent feedback only for a genuinely urgent user-facing state.

## Prohibited uses

- app launch;
- passive scrolling;
- every navigation transition;
- loading loops;
- unverified payment or booking success;
- marketing decoration;
- background notification handling.

## Platform rules

Use Expo or native platform haptic APIs with capability checks. Respect system settings, reduced-motion preferences where applicable, and device limitations. Android patterns may differ from iOS to remain platform-native.

## Verification

Real-device tests must confirm trigger timing, no duplicate feedback on rapid taps, no haptic on disabled controls, and no success pattern before server confirmation.
