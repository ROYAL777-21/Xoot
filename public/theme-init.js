/* Apply appearance before the static page paints. No inline script is needed under the CSP. */
(function () {
  var path = window.location.pathname;
  var app = /^\/(?:app|xooter|admin)(?:\/|$)/.test(path) && !/^\/xooter\/apply(?:\/|$)/.test(path);
  var choice = "system";
  if (app) {
    try { choice = localStorage.getItem("xoot-theme") || "system"; } catch (_) { /* Device default in the app. */ }
  }
  var dark = app && (choice === "dark" || (choice !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  var root = document.documentElement;
  root.dataset.xootThemeScope = app ? "app" : "website";
  root.classList.remove("light", "dark");
  root.classList.add(dark ? "dark" : "light");
  root.style.colorScheme = dark ? "dark" : "light";
}());
