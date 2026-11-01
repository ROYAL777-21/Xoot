/* Apply appearance before the static page paints. No inline script is needed under the CSP. */
(function () {
  var choice = "system";
  try { choice = localStorage.getItem("xoot-theme") || "system"; } catch (_) { /* Device default. */ }
  var dark = choice === "dark" || (choice !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(dark ? "dark" : "light");
  root.style.colorScheme = dark ? "dark" : "light";
}());
