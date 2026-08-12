# Glass System

Status: policy ready; final values and placements require approved Figma frames.

## Role

Glass is reserved for controls, navigation, temporary overlays, Concierge chrome, and selected Care+ or native-extension surfaces. It is not the default treatment for page sections, forms, repeated content cards, or dashboards.

## Zoot treatment

- Prefer optically clear glass over cloudy or heavily frosted panels.
- On web and Android fallbacks, the principal highlight originates from the top right with restrained edge refraction and a small selected-state glisten.
- On current Apple platforms, prefer native Liquid Glass APIs and let the system own environmental light response.
- A chat sheet or modal uses a separate backdrop scrim so underlying text cannot be read. Do not solve background legibility with excessive frosting inside the glass itself.
- Glass text uses an opaque content layer with tested contrast.
- Pressed or selected glass may briefly compress and appear to bubble, then settle. No endless shimmer.

## Hierarchy

1. `glass.navigation`: persistent navigation and compact app chrome.
2. `glass.control`: interactive button, selector, or compact tool.
3. `glass.overlay`: Concierge sheet, menu, or modal chrome with backdrop isolation.
4. `glass.prominent`: rare primary action where native guidance supports it.

Do not nest glass panels or place many individual glass effects in a scrolling list.

## Platform implementation

For iOS versions with native Liquid Glass, use `glassEffect`, native glass button styles, `GlassEffectContainer` for grouped elements, `interactive()` only on controls, and availability-gated fallbacks. Grouping improves composition and rendering performance. See [Apple's custom Liquid Glass guidance](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views).

Web and Android use their existing platform primitives and approved token values. They must imitate the hierarchy and feedback, not private Apple rendering details.

## Accessibility fallbacks

- Reduce Transparency: replace material with an opaque semantic surface and clear border.
- Increase Contrast: strengthen border and content contrast; remove weak highlights.
- Reduced Motion: remove morphing and glisten; retain immediate selected-state feedback.
- Low-power or poor-performance mode: use the opaque fallback.

## Quality checks

- foreground contrast passes in every sampled background state;
- background copy is unreadable behind modal/chat overlays;
- scrolling remains smooth on the lowest supported devices;
- no layout shift occurs during press, selection, or morph;
- effect count and container count are measured, not guessed;
- one approved screenshot and motion reference exists per glass pattern.
