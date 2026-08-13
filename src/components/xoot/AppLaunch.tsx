import { useState } from "react";
import { SplashScreen } from "@/components/xoot/SplashScreen";

/**
 * Decides whether the splash plays, and gets out of the way once it has.
 *
 * "Upon app starting" means a launch, not a page view. Three rules keep it to that:
 *
 *   - Once per session. `sessionStorage` clears when the tab or the app closes, so a
 *     native launch always replays it and a refresh mid-session does not.
 *   - Never on a deep link. Someone opening a booking confirmation or an auth
 *     callback is mid-task and arriving from somewhere else; a brand animation there
 *     is an obstacle, not a welcome.
 *   - Never for search engines or link previews, which should reach content
 *     immediately.
 *
 * The app renders underneath the whole time — the splash is an overlay, not a gate,
 * so nothing about startup waits on it.
 */

const SESSION_KEY = "xoot.splash.played";

/** Paths that are somewhere to *go*, not somewhere to arrive. */
const LAUNCH_PATHS = ["/", "/welcome"];

/**
 * Reads only. React may call a `useState` initializer more than once for a single
 * mount — a render can be thrown away and retried — so this must stay free of side
 * effects. An earlier version marked the session here, and the second call duly saw
 * its own mark and decided the splash had already played, which suppressed it
 * everywhere.
 */
function shouldPlay() {
  if (typeof window === "undefined") return false;

  // Prerender and crawler traffic must never sit behind an animation.
  if (/bot|crawl|spider|prerender|lighthouse|headless/i.test(navigator.userAgent)) return false;

  if (!LAUNCH_PATHS.includes(window.location.pathname)) return false;

  try {
    return !window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    // Private mode or storage disabled. Play it — showing the splash twice is a far
    // smaller failure than a crash on startup.
    return true;
  }
}

export function AppLaunch() {
  // Resolved once, during the first render, so a later route change cannot start the
  // splash over the top of a screen the user is already using.
  const [playing, setPlaying] = useState(shouldPlay);

  // Marked when the splash *finishes*, not when it mounts.
  //
  // The service worker reloads every client the moment it activates (`sw.js`, on
  // `activate`), so a genuine first visit navigates twice. Marking on mount meant the
  // first load claimed the splash, the reload arrived a few hundred milliseconds
  // later and found it already claimed, and nobody ever saw the animation. Marking on
  // completion is also just the honest rule: a splash the user did not see has not
  // played.
  const done = () => {
    setPlaying(false);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // See above — not being able to remember is not a reason to fail.
    }
  };

  if (!playing) return null;
  return <SplashScreen onDone={done} />;
}
