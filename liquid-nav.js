(() => {
  const nav = document.querySelector(".liquid-nav");
  if (!nav) return;
  const photo = nav.closest(".cover").querySelector(".cover-photo");
  const rim = nav.querySelector(".liquid-optics");
  const lens = nav.querySelector(".liquid-lens canvas");
  const solid = matchMedia("(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const zoom = 1.35;
  let active = null;
  let layoutKey = "";
  let layoutFrame = 0;
  let lightFrame = 0;
  let pointer = null;
  let onScreen = true;

  // Sample the same object-fit crop as the cover, with room to bend rays at the rim.
  function capture(bounds, imageBounds, ratio, pad) {
    const scale = Math.max(imageBounds.width / photo.naturalWidth, imageBounds.height / photo.naturalHeight);
    const width = photo.naturalWidth * scale;
    const height = photo.naturalHeight * scale;
    const [x, y] = getComputedStyle(photo).objectPosition.split(" ").map(value => parseFloat(value) / 100);
    const left = imageBounds.left - bounds.left + (imageBounds.width - width) * x;
    const top = imageBounds.top - bounds.top + (imageBounds.height - height) * y;
    const sample = document.createElement("canvas");
    sample.width = rim.width + pad * 2;
    sample.height = rim.height + pad * 2;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(photo, pad + left * ratio, pad + top * ratio, width * ratio, height * ratio);
    return context;
  }

  function drawRim(context, sample, pad, band) {
    const { width, height } = rim;
    const sourceWidth = sample.canvas.width;
    const pixels = sample.getImageData(0, 0, sourceWidth, sample.canvas.height).data;
    const frame = context.createImageData(width, height);
    const radius = height / 2;
    for (let x = 0; x < width; x++) {
      // The normal of a stadium is vertical along its sides and radial at its ends.
      const nx = x + .5 - Math.max(radius, Math.min(width - radius, x + .5));
      for (let y = 0; y < height; y++) {
        const ny = y + .5 - radius;
        const distance = Math.hypot(nx, ny);
        if (distance > radius) continue;
        const bevel = Math.max(0, 1 - (radius - distance) / band);
        const bend = band * bevel * bevel / Math.max(distance, 1);
        const sx = pad + x + nx * bend;
        const sy = pad + y + ny * bend;
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        const dx = sx - ix;
        const dy = sy - iy;
        const index = 4 * (iy * sourceWidth + ix);
        const below = index + 4 * sourceWidth;
        const out = 4 * (y * width + x);
        for (let channel = 0; channel < 3; channel++) {
          const upper = pixels[index + channel] * (1 - dx) + pixels[index + 4 + channel] * dx;
          const lower = pixels[below + channel] * (1 - dx) + pixels[below + 4 + channel] * dx;
          frame.data[out + channel] = upper * (1 - dy) + lower * dy;
        }
        frame.data[out + 3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
  }

  function positionLens(link) {
    const x = link.offsetLeft;
    const width = link.offsetWidth;
    nav.style.setProperty("--lens-x", x + "px");
    nav.style.setProperty("--lens-w", width + "px");
    // Keep the magnified scenery directly under the link as the lens moves between links.
    nav.style.setProperty("--sample-x", (-x * zoom - width * (zoom - 1) / 2) + "px");
    nav.style.setProperty("--sample-y", ((link.offsetHeight - nav.clientHeight * zoom) / 2) + "px");
  }

  function prepare() {
    layoutFrame = 0;
    if (active) {
      if (active.offsetWidth) positionLens(active);
      else {
        pointer = null;
        select(null);
        scheduleLight();
      }
    }
    if (solid.matches || !photo.complete || !photo.naturalWidth) {
      delete nav.dataset.refracting;
      layoutKey = "";
      return;
    }
    const bounds = nav.getBoundingClientRect();
    const imageBounds = photo.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const key = [bounds.width, bounds.height, bounds.left - imageBounds.left, bounds.top - imageBounds.top,
      imageBounds.width, imageBounds.height, ratio, photo.currentSrc, getComputedStyle(photo).objectPosition].join("/");
    if (!bounds.width || !bounds.height || key === layoutKey) return;
    layoutKey = key;
    delete nav.dataset.refracting;
    try {
      rim.width = lens.width = Math.round(bounds.width * ratio);
      rim.height = lens.height = Math.round(bounds.height * ratio);
      const rimContext = rim.getContext("2d");
      const lensContext = lens.getContext("2d");
      const band = Math.min(14 * ratio, rim.height * .25);
      const pad = Math.ceil(band) + 2;
      const sample = capture(bounds, imageBounds, ratio, pad);
      if (!rimContext || !lensContext || !sample) return;
      drawRim(rimContext, sample, pad, band);
      lensContext.drawImage(sample.canvas, pad, pad, rim.width, rim.height, 0, 0, lens.width, lens.height);
      lens.style.width = bounds.width * zoom + "px";
      lens.style.height = bounds.height * zoom + "px";
      nav.dataset.refracting = "";
    } catch {
      // An unreadable image or unavailable graphics context leaves the CSS material in place.
    }
  }

  function scheduleLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(prepare);
  }

  function updateLight() {
    lightFrame = 0;
    if (!onScreen || solid.matches || still.matches) return;
    const bounds = nav.getBoundingClientRect();
    let x, y;
    if (pointer) {
      x = (pointer.x - bounds.left) * 100 / bounds.width;
      y = (pointer.y - bounds.top) * 100 / bounds.height;
    } else if (active) {
      x = (active.offsetLeft + active.offsetWidth / 2) * 100 / bounds.width;
      y = 8;
    } else {
      const cover = photo.getBoundingClientRect();
      x = 20 + 76 * Math.min(1, Math.max(0, -cover.top / cover.height));
      y = 4;
    }
    nav.style.setProperty("--light-x", x + "%");
    nav.style.setProperty("--light-y", y + "%");
    if (active) nav.style.setProperty("--lens-light-x", (bounds.width * x / 100 - active.offsetLeft) + "px");
  }
  function scheduleLight() {
    if (onScreen && !lightFrame && !solid.matches && !still.matches) lightFrame = requestAnimationFrame(updateLight);
  }

  function select(link) {
    if (link === active) return;
    nav.toggleAttribute("data-travel", Boolean(active && link));
    active = link;
    nav.toggleAttribute("data-active", Boolean(link));
    if (link) positionLens(link);
  }
  function track(event) {
    pointer = { x: event.clientX, y: event.clientY };
    // Touch retains the original target while the finger moves across the glass.
    const target = event.pointerType === "touch" && event.type === "pointermove"
      ? document.elementFromPoint(event.clientX, event.clientY) : event.target;
    const link = target?.closest("a");
    select(link && nav.contains(link) ? link : null);
    scheduleLight();
  }
  function release() {
    delete nav.dataset.pressed;
    pointer = null;
    select(nav.querySelector("a:focus-visible"));
    scheduleLight();
  }

  nav.dataset.enhanced = "";
  nav.addEventListener("pointermove", track);
  nav.addEventListener("pointerdown", event => {
    nav.dataset.pressed = "";
    track(event);
  });
  window.addEventListener("pointerup", event => {
    if (!nav.hasAttribute("data-pressed")) return;
    delete nav.dataset.pressed;
    if (event.pointerType !== "mouse") release();
  });
  nav.addEventListener("pointercancel", release);
  nav.addEventListener("pointerleave", release);
  nav.addEventListener("focusin", event => {
    if (!event.target.matches("a:focus-visible")) return;
    pointer = null;
    select(event.target);
    scheduleLight();
  });
  nav.addEventListener("focusout", event => {
    if (!nav.contains(event.relatedTarget) && !pointer) {
      select(null);
      scheduleLight();
    }
  });
  window.addEventListener("blur", release);
  window.addEventListener("scroll", scheduleLight, { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) scheduleLight();
    }).observe(nav);
  }
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleLayout);
    [nav, photo, nav.parentElement, nav.closest(".cover").querySelector(".hero")].forEach(el => observer.observe(el));
  }
  solid.addEventListener("change", scheduleLayout);
  still.addEventListener("change", () => {
    nav.style.removeProperty("--light-x");
    nav.style.removeProperty("--light-y");
    scheduleLight();
  });
  window.addEventListener("resize", scheduleLayout);
  photo.addEventListener("load", scheduleLayout);
  document.fonts?.ready.then(scheduleLayout);
  scheduleLayout();
})();
