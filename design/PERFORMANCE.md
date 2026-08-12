# Performance

Zoot should feel immediate on ordinary mobile networks and mid-range devices. Visual richness cannot block booking, authentication, status, or support.

## Web budgets

- Core Web Vitals target at p75: LCP at or below 2.5 seconds, INP at or below 200 ms, CLS at or below 0.1.
- Route-level code splitting for maps, charts, admin tools, rich editors, and rarely used flows.
- No new dependency for an effect already supported by platform APIs or the existing stack.
- Reserve image dimensions; ship responsive modern formats; lazy-load below-fold media.
- Keep the initial customer route independent of Mapbox and admin modules until needed.
- Treat the existing Vite large-chunk warning as a measurable engineering issue, not a threshold to hide.

## Mobile budgets

- Native launch hands control to useful content without a blocking custom animation.
- Booking and sign-in remain usable on a constrained network with explicit retry/offline states.
- Avoid unbounded lists, repeated independent glass effects, large base64 assets, and unnecessary background work.
- Maps, Concierge history, training media, and operations data load on demand.
- Measure startup, frame stability, memory, network requests, and JS bundle/module contribution on representative Android and iOS devices.

## Motion and glass

Prefer transform and opacity. Group native glass effects. Do not animate large blur regions, layout, or heavy shadow. Low-power and accessibility fallbacks use opaque surfaces and immediate state changes.

## Release evidence

Record the device, OS, build ID, network profile, route, data state, trace, metric, and regression threshold. A budget failure needs an owner and explicit release waiver; raising the threshold is not a fix.
