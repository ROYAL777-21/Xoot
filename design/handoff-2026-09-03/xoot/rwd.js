/* ── XootRWD — the site's responsive primitives ───────────────────────────────
 *
 * These live in their own file because the site's modules are evaluated in separate scopes: a
 * hook declared at the top of SiteTop.jsx is NOT visible to SiteBody.jsx, and calling it there
 * took the whole page down with "useNarrow is not defined". One shared module, published on
 * window like the rest of the kit, is the fix.
 *
 * Reflow does almost all of the responsive work on this site — auto-fit grids whose tracks are
 * `minmax(min(100%, Npx), 1fr)` so a track can never demand more width than the viewport has,
 * and clamp() gutters, paddings and type. These hooks exist only for the things reflow cannot
 * express: collapsing the nav into a menu, dropping decorations that only make sense beside a
 * second column, and reacting to SHORT viewports rather than narrow ones.
 */
(function () {
  const R = () => window.React;

  /* Shared matchMedia subscription. Returns a boolean and re-renders on change. */
  function useMedia(query) {
    const React = R();
    const [on, setOn] = React.useState(
      () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
    );
    React.useEffect(() => {
      if (typeof window.matchMedia !== 'function') return;
      const mq = window.matchMedia(query);
      const handler = e => setOn(e.matches);
      setOn(mq.matches);
      /* Safari below 14 only has the deprecated listener API, and this site's audience is
         phone-heavy enough that the fallback is worth four lines. */
      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      }
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }, [query]);
    return on;
  }

  const useNarrow = px => useMedia('(max-width: ' + px + 'px)');

  /* SHORT, not narrow. A landscape phone is 844×390: wide enough that every width query says
     "desktop", while 390px of height means a tall hero image, a full-height sheet and a 128px
     section rhythm are all wrong. Aspect ratio alone isn't enough either — a 1280×800 laptop and
     a 640×400 window share a ratio and want different layouts — so this asks about real height. */
  const useShort = (px = 560) => useMedia('(max-height: ' + px + 'px)');

  /* True when the viewport is wider than it is tall AND genuinely shallow: the case where
     vertical space is the scarce axis and vertical rhythm has to compress. */
  const useLandscapeCompact = () =>
    useMedia('(orientation: landscape) and (max-height: 560px)');

  window.XootRWD = { useMedia, useNarrow, useShort, useLandscapeCompact };
  /* Bare aliases, matching how the rest of the kit shares across module scopes. */
  window.useNarrow = useNarrow;
  window.useShort = useShort;
  window.useLandscapeCompact = useLandscapeCompact;
})();
