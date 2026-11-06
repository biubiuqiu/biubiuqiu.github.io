(function () {
  "use strict";
  var root = document.documentElement;
  var storageKey = "denis-theme";
  var choices = ["system", "light", "dark"];
  var preference = choices.indexOf(root.dataset.themePreference) >= 0 ? root.dataset.themePreference : "dark";
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  var controls = Array.from(document.querySelectorAll("[data-theme-control]"));
  var menus = Array.from(document.querySelectorAll(".language-switcher, .theme-switcher"));

  function applyTheme() {
    var effective = preference === "system" ? (media.matches ? "dark" : "light") : preference;
    root.dataset.theme = effective;
    root.dataset.themePreference = preference;
    root.style.colorScheme = effective;
    var color = effective === "dark" ? "#242326" : "#f6f3ef";
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) { meta.content = color; });
    controls.forEach(function (control) {
      var selectedLabel = "";
      control.querySelectorAll("[data-theme-choice]").forEach(function (button) {
        var selected = button.dataset.themeChoice === preference;
        button.setAttribute("aria-pressed", String(selected));
        if (selected) selectedLabel = button.querySelector("span").textContent;
      });
      var summary = control.querySelector("summary");
      var description = control.dataset.themeMenuLabel + ": " + selectedLabel;
      summary.setAttribute("aria-label", description);
      summary.setAttribute("title", description);
    });
  }

  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) return;
    var button = event.target.closest("[data-theme-choice]");
    if (button) {
      var choice = button.dataset.themeChoice;
      if (choices.indexOf(choice) < 0) return;
      preference = choice;
      try { localStorage.setItem(storageKey, preference); } catch (error) {}
      applyTheme();
      var control = button.closest("details");
      control.open = false;
      control.querySelector("summary").focus();
      return;
    }
    var activeMenu = event.target.closest(".language-switcher, .theme-switcher");
    menus.forEach(function (menu) { if (menu !== activeMenu) menu.open = false; });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var openMenu = menus.find(function (menu) { return menu.open; });
    menus.forEach(function (menu) { menu.open = false; });
    if (openMenu) openMenu.querySelector("summary").focus();
  });

  function followSystem() { if (preference === "system") applyTheme(); }
  if (typeof media.addEventListener === "function") media.addEventListener("change", followSystem);
  else if (typeof media.addListener === "function") media.addListener(followSystem);

  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    preference = choices.indexOf(event.newValue) >= 0 ? event.newValue : "dark";
    applyTheme();
  });

  applyTheme();
  controls.forEach(function (control) { control.hidden = false; });
})();

