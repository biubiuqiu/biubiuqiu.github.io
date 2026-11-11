(function () {
  'use strict';
  var viewer = document.querySelector('.photo-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  var links = Array.from(document.querySelectorAll('.photo-link, .media-photo'));
  var image = viewer.querySelector('.photo-image');
  var caption = viewer.querySelector('.photo-caption');
  var title = viewer.querySelector('.photo-title');
  var counter = viewer.querySelector('.photo-counter');
  var status = viewer.querySelector('.photo-status');
  var previous = viewer.querySelector('.photo-prev');
  var next = viewer.querySelector('.photo-next');
  var separate = viewer.querySelector('.photo-separate');
  var stage = viewer.querySelector('.photo-stage');
  var group = [], index = 0, trigger = null, scrollY = 0, savedBodyStyle = null;
  var request = 0, touchStart = null, swiped = false;

  function show(position) {
    index = (position + group.length) % group.length;
    var link = group[index], token = ++request;
    var label = link.dataset.caption || link.querySelector('img').alt;
    caption.textContent = label;
    counter.textContent = (index + 1) + ' / ' + group.length;
    separate.href = link.href;
    image.hidden = true;
    image.alt = label;
    stage.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.textContent = viewer.dataset.loading;
    var pending = new Image();
    pending.onload = function () {
      if (request !== token || !viewer.open) return;
      image.src = pending.src;
      image.hidden = false;
      status.hidden = true;
      stage.setAttribute('aria-busy', 'false');
      // Warm the adjacent photo without loading the full album up front.
      if (group.length > 1) new Image().src = group[(index + 1) % group.length].href;
    };
    pending.onerror = function () {
      if (request !== token || !viewer.open) return;
      status.textContent = viewer.dataset.error;
      stage.setAttribute('aria-busy', 'false');
    };
    pending.src = link.href;
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      var section = link.closest('.interest-story');
      group = links.filter(function (item) { return item.closest('.interest-story') === section; });
      title.textContent = section.querySelector('.interest-title').textContent;
      previous.hidden = next.hidden = group.length < 2;
      viewer.classList.toggle('single-photo', group.length < 2);
      scrollY = window.scrollY;
      savedBodyStyle = document.body.getAttribute('style');
      document.documentElement.classList.add('viewer-open');
      document.body.style.position = 'fixed';
      document.body.style.top = -scrollY + 'px';
      document.body.style.width = '100%';
      viewer.showModal();
      show(group.indexOf(link));
    });
  });

  previous.addEventListener('click', function () { show(index - 1); });
  next.addEventListener('click', function () { show(index + 1); });
  viewer.querySelector('.photo-close').addEventListener('click', function () { viewer.close(); });
  viewer.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey || group.length < 2) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  stage.addEventListener('click', function (event) {
    if (swiped) { swiped = false; return; }
    // Only the empty stage closes the viewer; tapping the photo is safe.
    if (event.target === stage) viewer.close();
  });
  stage.addEventListener('touchstart', function (event) {
    touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX, y:event.touches[0].clientY} : null;
    swiped = false;
  }, {passive:true});
  stage.addEventListener('touchmove', function (event) {
    if (event.touches.length !== 1) touchStart = null;
  }, {passive:true});
  stage.addEventListener('touchcancel', function () { touchStart = null; }, {passive:true});
  stage.addEventListener('touchend', function (event) {
    if (!touchStart || !event.changedTouches.length || group.length < 2) return;
    var dx = event.changedTouches[0].clientX - touchStart.x;
    var dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      show(index + (dx < 0 ? 1 : -1));
    }
  }, {passive:true});
  viewer.addEventListener('close', function () {
    ++request;
    image.removeAttribute('src');
    image.hidden = true;
    touchStart = null;
    document.documentElement.classList.remove('viewer-open');
    if (savedBodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', savedBodyStyle);
    window.scrollTo({top:scrollY, behavior:'instant'});
    if (trigger) trigger.focus({preventScroll:true});
  });
})();
