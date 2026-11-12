(function () {
  'use strict';
  var demos = [];
  function block(text, kind) { return '<div class="demo-block ' + (kind || '') + '">' + text + '</div>'; }
  function pill(text, kind) { return '<span class="demo-pill ' + (kind || '') + '">' + text + '</span>'; }
  var records = ['用户限制：不要改数据库', '读取 auth.ts', '完整测试日志 · 80k（示意）', '定位失败：callback 第 42 行', '修复回调，准备验证', '当前要求：检查修复结果'];
  var labels = ['用户目标', '读文件', '测试日志', '排查尝试', '关键决策', '最新要求', '近期工具', '当前进度'];
  function renderProjection(root, phase) {
    root.querySelector('.demo-history').innerHTML = records.map(function (text, i) {
      var kind = 'is-full';
      if (phase > 0 && i === 2) kind = 'is-archive';
      if (phase > 1 && i < 2) kind = 'is-summary';
      return block(text, kind);
    }).join('');
    var views = [
      records.map(function (text) { return block(text, 'is-full'); }).join(''),
      block('用户限制：不要改数据库', 'is-full') + block('关键片段：callback 第 42 行失败', 'is-full') + block('日志引用：run-42 / test.log', 'is-reference') + block('当前要求：检查修复结果', 'is-full'),
      block('交接摘要：修复回调；不改数据库；下一步验证', 'is-summary') + block('修复回调，准备验证', 'is-full') + block('当前要求：检查修复结果', 'is-full') + block('证据引用：run-42 / test.log', 'is-reference'),
      block('交接摘要：修复回调；不改数据库；下一步验证', 'is-summary') + block('当前要求：检查修复结果', 'is-full') + block('按引用取回：test.log 第 36–50 行', 'is-reference') + block('需要时只补读相关片段，不重新塞入全部日志', 'is-full')
    ];
    root.querySelector('.demo-context').innerHTML = views[phase];
    root.querySelector('.demo-artifact').classList.toggle('artifact-active', phase > 0);
    return [
      '第 1 步：如果每轮都带上全部历史，大日志会不断挤占“桌面”。',
      '第 2 步：把完整日志保存成工件。本轮只带失败片段和引用；全文仍然可以找回来。',
      '第 3 步：把旧过程写成交接摘要。用户限制、当前进度和下一步继续保留。',
      '第 4 步：后面又需要证据时，按引用补读。减少本轮输入，不等于删除历史。'
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
      input.innerHTML = block(phase < 2 ? '接近上限，或用户运行 /compact' : '对话被整理为任务摘要', 'is-summary') + block('精确的内部切分范围未公开', 'is-archive');
      output.innerHTML = block('持久规则 / 项目指令', 'is-full') + block(phase < 3 ? '上下文管理由产品完成' : '任务摘要继续支持后续工作', phase < 3 ? '' : 'is-summary') + block('按需知识、独立子任务上下文协作', 'is-reference');
      return ['Claude Code：先看公开机制。这里不推测内部保留了多少条消息。', '已知：可以自动压缩，也可以用 /compact 指定关注重点。', '已知：摘要保留任务线索；持久规则应放在项目指令中。', '只画公开的概念关系，不把 Pi 或 OpenCode 的切分阈值套到 Claude Code 上。'][phase];
    }
    var old = labels.slice(0, 5).map(function (text) { return pill(text, 'is-summary'); }).join('');
    var recent = labels.slice(5).map(function (text) { return pill(text, 'is-full'); }).join('');
    if (phase === 0) {
      input.innerHTML = block('尚未压缩：先观察完整历史');
      output.innerHTML = block('规则 + 完整历史', 'is-full');
    } else if (phase === 1) {
      input.innerHTML = block(product === 'pi' ? '选出较早的区间' : '正常路径：准备整段当前对话', 'is-reference');
      output.innerHTML = block('标出近期保留区间', 'is-full') + recent;
    } else {
      input.innerHTML = '<div class="demo-pill-group">' + old + (product === 'opencode' ? labels.slice(5).map(function (text) { return pill(text, 'is-summary'); }).join('') : '') + '</div>' + block(product === 'pi' ? '较早区间 → 结构化摘要' : '较早 + 近期 → 结构化摘要', 'is-summary');
      output.innerHTML = phase === 2 ? block('正在形成交接摘要（示意）', 'is-summary') : block('规则 / 当前指令', 'is-full') + block('目标 · 约束 · 进度 · 下一步', 'is-summary') + '<div class="demo-pill-group">' + recent + '</div>' + block(product === 'pi' ? '保留区间仍会经过上下文投影 / 编辑' : '近期内容单独保留；长工具输出可能缩短', 'is-reference');
    }
    var words = product === 'pi' ? [
      'Pi：原始会话记录与下一轮模型输入分开管理。',
      '第 2 步：按预算寻找切分点，留出近期区间；具体边界需要保护工具交换。',
      '第 3 步：将较早区间生成摘要；已有摘要可作为迭代上下文。',
      '第 4 步：下一轮使用摘要和保留区间形成投影。这里省略了分支、异常恢复等细节。'
    ] : [
      'OpenCode V2：这张图演示普通文本摘要路径，不包括 provider 原生压缩。',
      '第 2 步：选择近期保留范围；正常摘要请求尽量保留现有对话前缀。',
      '第 3 步：摘要请求包含较早与近期内容，尝试复用 prompt cache；超大请求有缩减回退。',
      '第 4 步：摘要之外保留近期内容。摘要看过近期内容，不代表近期细节都能被摘要替代。'
    ];
    return words[phase];
  }
  function renderBackground(root, phase) {
    var changed = root.querySelector('input[type="checkbox"]').checked;
    var main = block('分支 A · 原始事件 E1–E100', 'is-full');
    if (phase > 0) main += block('新消息 / 工具结果 E101–E104', 'is-full');
    if (phase > 1) main += block('继续产生 E105–E108', 'is-full') + (changed ? block('用户切换到分支 B', 'is-warning') : '');
    root.querySelector('.demo-main-events').innerHTML = main;
    root.querySelector('.demo-candidate').innerHTML = [block('还未开始'), block('抓取快照：分支 A，到 E100', 'is-reference') + block('后台生成摘要…', 'is-summary'), block('候选摘要已完成', 'is-summary') + block('它只覆盖 E1–E100，不包含 E101–E108', 'is-reference'), block('核对分支、前缀和指令版本', 'is-reference') + block(changed ? '分支已变 → 候选失效' : '条件匹配 → 可以切入', changed ? 'is-warning' : 'is-summary')][phase];
    var result = root.querySelector('.demo-checkpoint-result');
    result.classList.toggle('is-rejected', phase === 3 && changed);
    result.innerHTML = '<strong>切入结果</strong><div>' + (phase < 3 ? '等待安全边界；主会话可以继续积累新事件。' : changed ? '丢弃或重算旧候选。当前分支 B 和新消息不会被旧摘要覆盖。' : '<span class="demo-pill is-summary">摘要：E1–E100</span><span aria-hidden="true"> + </span><span class="demo-pill is-full">完整保留 E101–E108</span>') + '</div>';
    return ['第 1 步：主会话在分支 A。此时还没有后台摘要。', '第 2 步：摘要任务拿走 E100 之前的快照；主会话继续工作。', '第 3 步：摘要完成时，后面又有新事件。它们不在这份摘要里。', changed ? '第 4 步：版本条件不匹配，拒绝切入。旧摘要不能覆盖用户的新方向。' : '第 4 步：校验通过后，原子写入摘要，同时保留快照之后的所有事件。'][phase];
  }
  function initBudget(root) {
    root.querySelector('.demo-budget-controls').hidden = false;
    var slider = root.querySelector('input[type="range"]');
    function update() {
      var evidence = Number(slider.value), used = 44 + evidence, remaining = 104 - used;
      root.querySelector('[data-evidence-label]').textContent = evidence + 'k';
      root.querySelector('.budget-evidence').style.width = (evidence / 104 * 100) + '%';
      root.querySelector('.demo-budget-track').setAttribute('aria-label', '输入上限104k，当前使用' + used + 'k，其中证据' + evidence + 'k');
      var status = root.querySelector('.demo-budget-status');
      status.classList.toggle('budget-overflow', remaining < 0);
      status.textContent = remaining < 0 ? '输入 ' + used + 'k，超出输入上限 ' + (-remaining) + 'k。' : '输入 ' + used + 'k，尚余 ' + remaining + 'k。';
      root.querySelector('.demo-explanation').textContent = remaining < 0 ? '整份大日志一进来，即使已有摘要，下一轮仍然超窗。试试“只留引用与片段”。' : evidence === 8 ? '正文只带引用和必要片段，原始日志另外保存。桌面更空，也仍能回去查证。' : '拖动滑块，看证据变大后，留给其他历史的空间怎样减少。输出预留不能拿来无限填日志。';
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
      play.textContent = timer ? '暂停' : phase === 3 ? '重播动画' : '播放动画';
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
