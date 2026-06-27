# Native-Feel UX Checklist

Zoot should feel calm, premium, and native rather than web-wrapped. These details apply to the website, PWA, and the Expo React Native mobile app.

## Implemented In The Web App Layer

1. Buttons use a subtle press scale so taps visually confirm intent.
2. Press states revert automatically when the browser cancels active touch during scroll.
3. Buttons maintain 44px touch targets for mobile ergonomics.
4. Shared controls remove harsh mobile tap highlights.
5. Interactive cards use a restrained lift and shadow change on hover.
6. Toggles use spring-like thumb motion instead of a flat state jump.
7. Inputs stay at 16px on mobile to avoid iOS zoom-jump.
8. Inputs scroll smoothly into view when the keyboard opens.
9. Textareas auto-grow as users type, capped to avoid taking over the screen.
10. Keyboard viewport changes update CSS variables for safe bottom spacing.
11. The keyboard dismisses when users tap outside editable fields.
12. The keyboard dismisses on scroll gestures for a more native mobile feel.
13. Skeletons use shimmer loading instead of abrupt blank states.
14. Empty states have a reusable premium component with helpful instructions.
15. Permission primer styling is available before native prompts are triggered.
16. Motion respects `prefers-reduced-motion`.
17. Page entry utilities support soft fade-ins, slide-ups, scale-ins, and cross-fades.
18. Busy actions expose `[aria-busy]` styling for clear feedback.
19. Safe-area utilities support notched iPhones and bottom browser bars.
20. Native scrolling utilities use momentum scrolling and contained overscroll.
21. Text selection uses the Zoot brand tint.
22. Haptics use Expo/native feedback in the mobile app, then safe web vibration fallback for browser surfaces.
23. Live Activity payloads avoid leaking full address or access-note details.
24. PWA manifest and service worker support app-like install paths.
25. Native iOS documentation covers Live Activities, Dynamic Island, and WidgetKit.
26. Apple/Safari standalone sessions receive the enhanced liquid-glass background treatment on navigation/support surfaces while foreground text stays on a non-blurred layer.

## Future React Native Or Expo Guidance

- Use Pressto or an equivalent gesture-aware press primitive for cancelable press interactions.
- Use React Native Reanimated spring presets sparingly for card reveals, sheet transitions, and toggle feedback.
- Prefer native Expo Router transitions or platform navigation transitions instead of custom page slides everywhere.
- Use `KeyboardAvoidingView`, `react-native-keyboard-controller`, or platform keyboard insets so forms move with the keyboard.
- Dismiss the keyboard on drag gestures in long forms and booking flows.
- Use permission primers before asking for notifications, location, photos, contacts, or camera access.
- Keep shimmer placeholders short and purposeful; never use them to hide slow or broken network flows.
- Avoid over-animation in trust, payment, support, and safety flows. Clarity beats delight there.
- Pair haptics with important intent confirmations only: join Care+, rebook, save Home Memory, submit support, confirm booking, complete job.
- Test press, scroll-cancel, keyboard, reduced-motion, and screen-reader states on physical iOS and Android devices before store submission.
