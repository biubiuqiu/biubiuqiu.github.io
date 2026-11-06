(function () {
  var preference = "system";
  try {
    var stored = localStorage.getItem("denis-theme");
    if (stored === "light" || stored === "dark" || stored === "system") preference = stored;
  } catch (error) {}
  var systemDark = false;
  try { systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (error) {}
  var theme = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  var root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = theme;
  var color = theme === "dark" ? "#161b19" : "#f2eee7";
  document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) { meta.content = color; });
})();

