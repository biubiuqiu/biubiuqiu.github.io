(function () {
  'use strict';
  var demos = [];
  function block(text, kind) { return '<div class="demo-block ' + (kind || '') + '">' + text + '</div>'; }
  function pill(text, kind) { return '<span class="demo-pill ' + (kind || '') + '">' + text + '</span>'; }
  var records = ["User constraint: leave the database unchanged", "Read auth.ts", "Full test log · 80k (example)", "Failure traced to callback, line 42", "Callback fixed; ready to verify", "Current request: verify the fix"];
  var labels = ["User goal", "File read", "Test log", "Investigation", "Key decisions", "Latest request", "Recent tool calls", "Progress"];
  function renderProjection(root, phase) {
    root.querySelector('.demo-history').innerHTML = records.map(function (text, i) {
      var kind = 'is-full';
      if (phase > 0 && i === 2) kind = 'is-archive';
      if (phase > 1 && i < 2) kind = 'is-summary';
      return block(text, kind);
    }).join('');
    var views = [
      records.map(function (text) { return block(text, 'is-full'); }).join(''),
      block("User constraint: leave the database unchanged", 'is-full') + block("Key excerpt: callback failed on line 42", 'is-full') + block("Log reference: run-42 / test.log", 'is-reference') + block("Current request: verify the fix", 'is-full'),
      block("Handoff: callback fixed; leave database untouched; verify next", 'is-summary') + block("Callback fixed; ready to verify", 'is-full') + block("Current request: verify the fix", 'is-full') + block("Evidence: run-42 / test.log", 'is-reference'),
      block("Handoff: callback fixed; leave database untouched; verify next", 'is-summary') + block("Current request: verify the fix", 'is-full') + block("Read by reference: test.log, lines 36–50", 'is-reference') + block("Read just the relevant excerpt when needed", 'is-full')
    ];
    root.querySelector('.demo-context').innerHTML = views[phase];
    root.querySelector('.demo-artifact').classList.toggle('artifact-active', phase > 0);
    return [
      "Step 1: Sending the entire history on every turn lets a large log crowd out everything else on the desk.",
      "Step 2: Save the full log as an artifact. This turn carries the failure excerpt and a reference you can follow back to the original.",
      "Step 3: Summarize earlier work for handoff. Include the user’s constraints, current progress, and next step.",
      "Step 4: Follow the reference when you need the evidence again. The history survives even as the input gets smaller."
    ][phase];
  }
  function renderCompare(root, phase) {
    var product = root.dataset.product || 'pi';
    root.querySelectorAll('[data-product]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.product === product)); });
    root.querySelector('.demo-transcript').innerHTML = labels.map(function (text, i) {
      var kind = 'is-full';
      if (phase > 0 && product !== 'claude') kind = phase > 1 && (product === 'opencode' || i < 5) ? 'is-summary' : (i < 5 ? 'is-reference' : 'is-full');
      return pill(text, kind);
    }).join('');
    var input = root.querySelector('.demo-summary-input');
    var output = root.querySelector('.demo-summary-output');
    if (product === 'claude') {
      input.innerHTML = block(phase < 2 ? "Near the limit, or the user runs /compact" : "Conversation condensed into a task summary", 'is-summary') + block("Exact internal cutoffs are undisclosed", 'is-archive');
      output.innerHTML = block("Persistent rules / project instructions", 'is-full') + block(phase < 3 ? "The product manages context" : "The task summary supports subsequent work", phase < 3 ? '' : 'is-summary') + block("Retrieve knowledge on demand; give subtasks their own context", 'is-reference');
      return ["Claude Code: This view covers documented behavior. The internal number of retained messages is unknown.", "Compaction can run automatically. With /compact you can specify what to focus on.", "The summary preserves the thread of the task. Put lasting rules in project instructions.", "The diagram shows public concepts. Pi and OpenCode have their own thresholds; those do not establish Claude Code’s boundary."][phase];
    }
    var old = labels.slice(0, 5).map(function (text) { return pill(text, 'is-summary'); }).join('');
    var recent = labels.slice(5).map(function (text) { return pill(text, 'is-full'); }).join('');
    if (phase === 0) {
      input.innerHTML = block("Before compaction: inspect the full history");
      output.innerHTML = block("Rules + full history", 'is-full');
    } else if (phase === 1) {
      input.innerHTML = block(product === 'pi' ? "Select the earlier segment" : "Standard path: prepare the whole current conversation", 'is-reference');
      output.innerHTML = block("Mark the recent segment to retain", 'is-full') + recent;
    } else {
      input.innerHTML = '<div class="demo-pill-group">' + old + (product === 'opencode' ? labels.slice(5).map(function (text) { return pill(text, 'is-summary'); }).join('') : '') + '</div>' + block(product === 'pi' ? "Earlier segment → structured summary" : "Earlier + recent segments → structured summary", 'is-summary');
      output.innerHTML = phase === 2 ? block("Building the handoff summary (illustration)", 'is-summary') : block("Rules / current instructions", 'is-full') + block("Goal · constraints · progress · next step", 'is-summary') + '<div class="demo-pill-group">' + recent + '</div>' + block(product === 'pi' ? "The retained segment still passes through context projection and editing" : "Recent content is retained separately; long tool outputs may be shortened", 'is-reference');
    }
    var words = product === 'pi' ? [
      "Pi manages the original transcript separately from the input for the next model call.",
      "Step 2: Find a cut point within the budget and keep a recent segment. The boundary must preserve tool calls and their results together.",
      "Step 3: Summarize the earlier segment. An existing summary can serve as input to the next revision.",
      "Step 4: Form the next input from the summary and the retained segment. Branches and error recovery are omitted here."
    ] : [
      "OpenCode V2: This illustrates its ordinary text-summary path. Provider-native compaction follows a different path.",
      "Step 2: Choose how much recent content to keep. A standard summary request tries to retain the existing conversation prefix.",
      "Step 3: Include earlier and recent content in the summary request to reuse the prompt cache where possible. Oversized requests can fall back to less input.",
      "Step 4: Keep recent content alongside the summary. Even a summary that saw recent messages cannot stand in for every detail."
    ];
    return words[phase];
  }
  function renderBackground(root, phase) {
    var changed = root.querySelector('input[type="checkbox"]').checked;
    var main = block("Branch A · original events E1–E100", 'is-full');
    if (phase > 0) main += block("New messages / tool results E101–E104", 'is-full');
    if (phase > 1) main += block("More events arrive: E105–E108", 'is-full') + (changed ? block("User switches to branch B", 'is-warning') : '');
    root.querySelector('.demo-main-events').innerHTML = main;
    root.querySelector('.demo-candidate').innerHTML = [block("Not started"), block("Snapshot: branch A through E100", 'is-reference') + block("Summarizing in the background…", 'is-summary'), block("Candidate summary ready", 'is-summary') + block("Covers E1–E100 only; E101–E108 came later", 'is-reference'), block("Check branch, prefix, and instruction version", 'is-reference') + block(changed ? "Branch changed → candidate is stale" : "Conditions match → safe to commit", changed ? 'is-warning' : 'is-summary')][phase];
    var result = root.querySelector('.demo-checkpoint-result');
    result.classList.toggle('is-rejected', phase === 3 && changed);
    result.innerHTML = "<strong>Commit result</strong><div>" + (phase < 3 ? "Waiting for a safe boundary. The main session can continue recording events." : changed ? "Discard or recompute the stale candidate. Branch B and its new messages are preserved." : "<span class=\"demo-pill is-summary\">Summary: E1–E100</span><span aria-hidden=\"true\"> + </span><span class=\"demo-pill is-full\">E101–E108 in full</span>") + '</div>';
    return ["Step 1: The main session is on branch A. No background summary exists yet.", "Step 2: The summary task takes a snapshot through E100 while the main session keeps working.", "Step 3: New events have arrived by the time the summary is ready. They fall outside its snapshot.", changed ? "Step 4: Reject the candidate when the version check fails. A stale summary cannot overwrite the user’s new direction." : "Step 4: Once checks pass, commit the summary atomically and retain every event after the snapshot."][phase];
  }
  function initBudget(root) {
    root.querySelector('.demo-budget-controls').hidden = false;
    var slider = root.querySelector('input[type="range"]');
    function update() {
      var evidence = Number(slider.value), used = 44 + evidence, remaining = 104 - used;
      root.querySelector('[data-evidence-label]').textContent = evidence + 'k';
      root.querySelector('.budget-evidence').style.width = (evidence / 104 * 100) + '%';
      root.querySelector('.demo-budget-track').setAttribute('aria-label', "Input limit 104k; current usage " + used + "k; evidence accounts for " + evidence + 'k');
      var status = root.querySelector('.demo-budget-status');
      status.classList.toggle('budget-overflow', remaining < 0);
      status.textContent = remaining < 0 ? "Input: " + used + "k; over budget by " + (-remaining) + 'k。' : "Input: " + used + "k; remaining budget: " + remaining + 'k。';
      root.querySelector('.demo-explanation').textContent = remaining < 0 ? "Adding the full log exceeds the window even with a summary. Try keeping just a reference and an excerpt." : evidence === 8 ? "The input carries a reference and a short excerpt; the original log is stored separately. You save space and can still verify the evidence." : "Move the slider to see how evidence competes with history for space. The reserved output budget cannot absorb unlimited logs.";
      root.querySelectorAll('[data-budget]').forEach(function (button) { button.setAttribute('aria-pressed', String(Number(button.dataset.budget) === evidence)); });
    }
    slider.addEventListener('input', update);
    root.querySelectorAll('[data-budget]').forEach(function (button) { button.addEventListener('click', function () { slider.value = button.dataset.budget; update(); }); });
    update();
  }
  document.querySelectorAll('[data-context-demo]').forEach(function (root) {
    if (root.dataset.contextDemo === 'budget') { initBudget(root); return; }
    var phase = 0, timer = null;
    var controls = root.querySelector('.demo-controls'); controls.hidden = false;
    root.querySelectorAll('.demo-product-switch, .demo-branch-toggle').forEach(function (el) { el.hidden = false; });
    var render = { projection: renderProjection, compare: renderCompare, background: renderBackground }[root.dataset.contextDemo];
    function paint() {
      root.dataset.phase = String(phase);
      root.querySelector('.demo-explanation').textContent = render(root, phase);
      root.querySelector('.demo-count').textContent = (phase + 1) + ' / 4';
      root.querySelector('[data-demo-action="prev"]').disabled = phase === 0;
      root.querySelector('[data-demo-action="next"]').disabled = phase === 3;
      var play = root.querySelector('[data-demo-action="play"]');
      play.textContent = timer ? "Pause" : phase === 3 ? "Replay" : "Play";
      play.setAttribute('aria-pressed', String(Boolean(timer)));
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function pause() { stop(); paint(); }
    controls.addEventListener('click', function (event) {
      var button = event.target.closest('button'); if (!button) return;
      var action = button.dataset.demoAction;
      if (action === 'play') {
        if (timer) { pause(); return; }
        if (phase === 3) phase = 0;
        timer = setInterval(function () { phase = Math.min(3, phase + 1); if (phase === 3) stop(); paint(); }, 2400);
      } else {
        stop(); phase = action === 'reset' ? 0 : Math.max(0, Math.min(3, phase + (action === 'next' ? 1 : -1)));
      }
      paint();
    });
    root.querySelectorAll('[data-product]').forEach(function (button) { button.addEventListener('click', function () { stop(); phase = 0; root.dataset.product = button.dataset.product; paint(); }); });
    var branch = root.querySelector('input[type="checkbox"]');
    if (branch) branch.addEventListener('change', function () { stop(); phase = 0; paint(); });
    demos.push({ root: root, pause: pause });
    paint();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) demos.forEach(function (demo) { demo.pause(); }); });
  window.addEventListener('pagehide', function () { demos.forEach(function (demo) { demo.pause(); }); });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (!entry.isIntersecting) { var demo = demos.find(function (d) { return d.root === entry.target; }); if (demo) demo.pause(); } }); }, { threshold: 0 });
    demos.forEach(function (demo) { observer.observe(demo.root); });
  }
})();
