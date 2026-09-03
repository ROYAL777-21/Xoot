/* Resilient design-system namespace for the UI kit.
 *
 * The kit is authored against a bundle that recompiles at the end of a turn, so a component
 * written today may not exist in `_ds_bundle.js` until tomorrow. A bare destructure of a
 * missing export yields `undefined`, and rendering `<undefined />` throws — which takes the
 * ENTIRE React tree down and leaves a blank page. One unbuilt component should not do that.
 *
 * This proxy resolves anything missing to a visible placeholder, so the rest of the kit
 * keeps working and the gap is obvious on screen rather than fatal in the console.
 *
 * Kit files should read from `window.XootNS`, never from the raw namespace.
 */
(function () {
  /* READ THE NAMESPACE LIVE, NEVER SNAPSHOT IT.
   *
   * This used to be `var REAL = window.CareDesignSystem_ed2067 || {}` — captured once, at the
   * moment this file was evaluated. That is a race, and it lost: the bundle is 34 000 lines, so
   * whenever it had not finished evaluating by the time ns.js ran, REAL froze as `{}` for the
   * lifetime of the page and EVERY component in the kit became a "not compiled" chip — on a
   * bundle where all 131 components were present and fine. It presented as an intermittently
   * broken page with an empty console, which is the worst possible failure mode.
   *
   * A getter costs nothing and cannot go stale. */
  function real() { return window.CareDesignSystem_ed2067 || {}; }

  /* A LAZY FORWARDER, NOT A DEAD END.
   *
   * The second half of the same race: kit modules destructure at their top level
   * (`const { Button } = window.XootNS`), so whatever they get is captured for good. If that
   * resolved to a static placeholder, the component stayed a chip even after the bundle landed.
   *
   * So the placeholder re-checks on every render and forwards to the real component the moment
   * it exists. A module that destructured too early now heals itself on the next render instead
   * of being permanently wrong, and the chip is shown only for something genuinely absent. */
  function placeholder(name) {
    function Missing(props) {
      var found = real()[name];
      if (typeof found === 'function' || (found && typeof found === 'object')) {
        return window.React.createElement(found, props);
      }
      return window.React.createElement('span', {
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6,
          background: 'var(--xoot-honey-wash, #FCEEDA)',
          color: 'var(--xoot-honey-ink, #94600E)',
          fontFamily: 'var(--xoot-font-mono, monospace)', fontSize: 10,
          lineHeight: 1.4, whiteSpace: 'nowrap',
        },
        title: name + ' is not in the compiled bundle yet',
      }, name + ' — not compiled');
    }
    Missing.displayName = 'Lazy(' + name + ')';
    return Missing;
  }

  /* Non-component exports need sensible empty shapes, not a placeholder component. */
  var FALLBACKS = {
    Haptics: { haptic: function () { return false; }, withHaptic: function (i, h) { return h; },
               setEnabled: function () {}, isEnabled: function () { return false; }, intents: [] },
    XOOT_SERVICES: {},
    XOOT_ICONS: {},
    XOOT_PHRASES: [],
    iconNames: [],
  };

  window.XootNS = new Proxy({}, {
    get: function (_t, key) {
      if (typeof key !== 'string') return undefined;
      var REAL = real();
      if (key in REAL) return REAL[key];
      if (key in FALLBACKS) return FALLBACKS[key];
      /* Capitalised names are components — hand back the lazy forwarder, which becomes the real
         component as soon as the bundle has it. */
      if (/^[A-Z]/.test(key)) return placeholder(key);
      return undefined;
    },
    has: function (_t, key) { return typeof key === 'string' && (key in real() || key in FALLBACKS || /^[A-Z]/.test(key)); },
    ownKeys: function () { return Object.keys(real()); },
    getOwnPropertyDescriptor: function (_t, key) {
      return { enumerable: true, configurable: true, value: window.XootNS[key] };
    },
  });

  /* Report what's missing once, so the gap is traceable without hunting. */
  window.XootNS.__missing = function (names) {
    var REAL = real();
    var gaps = names.filter(function (n) { return !(n in REAL); });
    if (gaps.length) console.warn('[Xoot kit] not yet in the bundle:', gaps.join(', '));
    return gaps;
  };
})();

/* ── Theme ────────────────────────────────────────────────────────────────
   Dark mode is a document-level concern, not a screen's. Setting the attribute inside one
   screen meant the theme unmounted with it — flip the switch, navigate away, and you were
   back in light. This owns the attribute on every phone frame in the page, applies to
   frames mounted later, and persists the choice. */
(function () {
  var KEY = 'xoot.theme';

  /* ── Theme: light on every launch, dark as a session choice ───────────────
     Xoot opens light. Always. Not "unless something is stored", not "unless the device says
     otherwise" — light, every single time the app loads.

     That needs saying plainly because three previous attempts at this failed, each for the
     same underlying reason: they treated dark as a PERSISTED preference and then tried to
     find the right conditions under which to ignore it.

       1. Default from the device. A dark-set phone opened the app dark, which nobody asked
          this app for.
       2. Default from localStorage. Any toggle, ever, made the app dark forever after.
       3. A one-shot reset stamp. It cleared the stored value once, then was spent — so the
          very next toggle re-created the problem it was meant to solve, permanently.

     Each fix was more machinery guarding the same wrong premise. The premise is the bug: for
     a light-first product, a persisted dark value can never be distinguished from stale junk,
     so it should not survive a reload at all.

     So dark lives in sessionStorage. The toggle in You works exactly as before and flips the
     whole app instantly; it survives navigation within the session, and it is gone on reload.
     No stamps, no migrations, no fourth attempt.

     The stale localStorage key is actively removed rather than ignored, so an old 'dark' can
     never be read by some other code path later. */
  var SESSION_KEY = 'xoot.theme.session';

  var current = 'light';
  try {
    /* Purge the old persisted key wherever it still exists. Leaving it would mean any future
       reader re-introduces the bug. */
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem('xoot.theme.v2');
    if (window.sessionStorage.getItem(SESSION_KEY) === 'dark') current = 'dark';
  } catch (e) {}

  /* Scoped to the phone frames only. The kit page around them is scaffolding, not product —
     it stays light, and it is not written to survive a token inversion.

     Frames carrying data-theme-lock own their theme and are left alone: onboarding runs before
     a user has any preference, so it must never inherit one set later. */
  function paint() {
    var frames = document.querySelectorAll('[data-phone]');
    for (var i = 0; i < frames.length; i++) {
      var lock = frames[i].getAttribute('data-theme-lock');
      frames[i].setAttribute('data-theme', lock || current);
    }
  }

  window.XootTheme = {
    get: function () { return current; },
    isDark: function () { return current === 'dark'; },
    set: function (theme) {
      current = theme === 'dark' ? 'dark' : 'light';
      /* Session, not local — see the note above. */
      try { window.sessionStorage.setItem(SESSION_KEY, current); } catch (e) {}
      paint();
    },
    toggle: function () { window.XootTheme.set(current === 'dark' ? 'light' : 'dark'); },
  };

  /* Frames mount and unmount as you move around, so repaint when the tree changes. */
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(paint).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();
})();
