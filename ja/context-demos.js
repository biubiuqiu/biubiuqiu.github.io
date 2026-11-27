(function () {
  'use strict';
  var demos = [];
  function block(text, kind) { return '<div class="demo-block ' + (kind || '') + '">' + text + '</div>'; }
  function pill(text, kind) { return '<span class="demo-pill ' + (kind || '') + '">' + text + '</span>'; }
  var records = ["ユーザーの制約：データベースは変更しない", "auth.ts を読み取る", "テストログ全文 · 80k（例）", "失敗箇所：callback の42行目", "コールバックの修正完了。次は検証", "現在の依頼：修正結果を検証"];
  var labels = ["ユーザーの目標", "ファイルの読み取り", "テストログ", "調査の試行", "主な判断", "直近の依頼", "直近のツール呼び出し", "進捗"];
  function renderProjection(root, phase) {
    root.querySelector('.demo-history').innerHTML = records.map(function (text, i) {
      var kind = 'is-full';
      if (phase > 0 && i === 2) kind = 'is-archive';
      if (phase > 1 && i < 2) kind = 'is-summary';
      return block(text, kind);
    }).join('');
    var views = [
      records.map(function (text) { return block(text, 'is-full'); }).join(''),
      block("ユーザーの制約：データベースは変更しない", 'is-full') + block("該当箇所：callback の42行目で失敗", 'is-full') + block("ログの参照先：run-42 / test.log", 'is-reference') + block("現在の依頼：修正結果を検証", 'is-full'),
      block("引き継ぎ：コールバック修正済み。DB は変更せず、次に結果を検証", 'is-summary') + block("コールバックの修正完了。次は検証", 'is-full') + block("現在の依頼：修正結果を検証", 'is-full') + block("根拠の参照先：run-42 / test.log", 'is-reference'),
      block("引き継ぎ：コールバック修正済み。DB は変更せず、次に結果を検証", 'is-summary') + block("現在の依頼：修正結果を検証", 'is-full') + block("参照先から取得：test.log の36～50行目", 'is-reference') + block("必要な箇所だけ読み戻す", 'is-full')
    ];
    root.querySelector('.demo-context').innerHTML = views[phase];
    root.querySelector('.demo-artifact').classList.toggle('artifact-active', phase > 0);
    return [
      "ステップ1：毎ターン履歴を丸ごと渡すと、巨大なログが作業机を埋めてしまいます。",
      "ステップ2：ログ全文を成果物として保存します。今回は失敗箇所と参照先だけを渡し、必要になったら全文に戻れます。",
      "ステップ3：過去の作業を引き継ぎ用に要約します。ユーザーの制約、現在の進捗、次の一手を含めます。",
      "ステップ4：再び根拠が必要になったら参照先を読みます。今回の入力を小さくしても履歴は残ります。"
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
      input.innerHTML = block(phase < 2 ? "上限が近づく、またはユーザーが /compact を実行" : "会話をタスクの要約にまとめる", 'is-summary') + block("内部の正確な分割位置は非公開", 'is-archive');
      output.innerHTML = block("永続的なルール・プロジェクト指示", 'is-full') + block(phase < 3 ? "製品側でコンテキストを管理" : "タスクの要約を使って作業を継続", phase < 3 ? '' : 'is-summary') + block("必要な知識を随時取得し、サブタスクは独立したコンテキストで処理", 'is-reference');
      return ["Claude Code：ここでは公開されている挙動を扱います。内部で保持するメッセージ件数は不明です。", "自動で圧縮できます。/compact を使うと要約で重視する点を指定できます。", "要約にはタスクを続ける手がかりが残ります。継続して適用するルールはプロジェクト指示に記述します。", "図は公開情報に基づく概念図です。Pi や OpenCode のしきい値から Claude Code の分割位置を推定することはできません。"][phase];
    }
    var old = labels.slice(0, 5).map(function (text) { return pill(text, 'is-summary'); }).join('');
    var recent = labels.slice(5).map(function (text) { return pill(text, 'is-full'); }).join('');
    if (phase === 0) {
      input.innerHTML = block("圧縮前：履歴全体を確認");
      output.innerHTML = block("ルールと履歴全体", 'is-full');
    } else if (phase === 1) {
      input.innerHTML = block(product === 'pi' ? "古い区間を選ぶ" : "通常の経路：現在の会話全体を準備", 'is-reference');
      output.innerHTML = block("保持する直近の区間を指定", 'is-full') + recent;
    } else {
      input.innerHTML = '<div class="demo-pill-group">' + old + (product === 'opencode' ? labels.slice(5).map(function (text) { return pill(text, 'is-summary'); }).join('') : '') + '</div>' + block(product === 'pi' ? "古い区間 → 構造化した要約" : "古い区間＋直近の区間 → 構造化した要約", 'is-summary');
      output.innerHTML = phase === 2 ? block("引き継ぎ用の要約を作成中（模式図）", 'is-summary') : block("ルール・現在の指示", 'is-full') + block("目標・制約・進捗・次の一手", 'is-summary') + '<div class="demo-pill-group">' + recent + '</div>' + block(product === 'pi' ? "保持した区間にもコンテキストの抽出・編集を適用" : "直近の内容は別途保持。長いツール出力は短縮する場合あり", 'is-reference');
    }
    var words = product === 'pi' ? [
      "Pi は元の会話記録と、次にモデルに渡す入力を別々に管理します。",
      "ステップ2：予算に収まる分割点を探し、直近の区間を確保します。ツール呼び出しとその結果が分断されないようにします。",
      "ステップ3：古い区間を要約します。次回の更新では既存の要約を入力として利用できます。",
      "ステップ4：要約と保持区間から次の入力を組み立てます。ここでは分岐や異常時の復旧を省略しています。"
    ] : [
      "OpenCode V2：通常のテキスト要約を示します。プロバイダー標準の圧縮は別の経路です。",
      "ステップ2：保持する直近の範囲を決めます。通常の要約リクエストでは、既存の会話の先頭部分をできるだけ維持します。",
      "ステップ3：古い内容と直近の内容を要約リクエストに含め、プロンプトキャッシュの再利用を試みます。リクエストが大きすぎる場合は、入力を減らして再試行できます。",
      "ステップ4：要約とは別に直近の内容を保持します。要約の入力に含めても、細部まで要約に残るとは限りません。"
    ];
    return words[phase];
  }
  function renderBackground(root, phase) {
    var changed = root.querySelector('input[type="checkbox"]').checked;
    var main = block("ブランチ A · 元のイベント E1～E100", 'is-full');
    if (phase > 0) main += block("新しいメッセージ・ツール結果 E101～E104", 'is-full');
    if (phase > 1) main += block("さらに E105～E108 が到着", 'is-full') + (changed ? block("ユーザーがブランチ B に切り替える", 'is-warning') : '');
    root.querySelector('.demo-main-events').innerHTML = main;
    root.querySelector('.demo-candidate').innerHTML = [block("未開始"), block("スナップショット：ブランチ A の E100 まで", 'is-reference') + block("バックグラウンドで要約中…", 'is-summary'), block("要約候補が完成", 'is-summary') + block("対象は E1～E100。後続の E101～E108 は含まない", 'is-reference'), block("ブランチ・先頭部分・指示のバージョンを照合", 'is-reference') + block(changed ? "ブランチが変わったため候補は無効" : "条件が一致したため適用可能", changed ? 'is-warning' : 'is-summary')][phase];
    var result = root.querySelector('.demo-checkpoint-result');
    result.classList.toggle('is-rejected', phase === 3 && changed);
    result.innerHTML = "<strong>適用結果</strong><div>" + (phase < 3 ? "安全に適用できる境界を待っています。メインセッションでは新しいイベントを記録できます。" : changed ? "古い候補を破棄するか再計算します。ブランチ B とその新しいメッセージはそのまま残ります。" : "<span class=\"demo-pill is-summary\">要約：E1～E100</span><span aria-hidden=\"true\"> + </span><span class=\"demo-pill is-full\">E101～E108 は全文保持</span>") + '</div>';
    return ["ステップ1：メインセッションはブランチ A にいます。バックグラウンドの要約はまだありません。", "ステップ2：要約タスクは E100 までのスナップショットを取得し、メインセッションは作業を続けます。", "ステップ3：要約が完成するまでに新しいイベントが到着しました。これらはスナップショットの対象外です。", changed ? "ステップ4：バージョン条件が合わないため適用を拒否します。古い要約が新しい方針を上書きすることを防ぎます。" : "ステップ4：照合に成功したら、要約をアトミックに書き込み、スナップショット以降の全イベントを保持します。"][phase];
  }
  function initBudget(root) {
    root.querySelector('.demo-budget-controls').hidden = false;
    var slider = root.querySelector('input[type="range"]');
    function update() {
      var evidence = Number(slider.value), used = 44 + evidence, remaining = 104 - used;
      root.querySelector('[data-evidence-label]').textContent = evidence + 'k';
      root.querySelector('.budget-evidence').style.width = (evidence / 104 * 100) + '%';
      root.querySelector('.demo-budget-track').setAttribute('aria-label', "入力上限104k、現在使用中：" + used + "k、うち根拠データ：" + evidence + 'k');
      var status = root.querySelector('.demo-budget-status');
      status.classList.toggle('budget-overflow', remaining < 0);
      status.textContent = remaining < 0 ? "入力：" + used + "k、上限超過：" + (-remaining) + 'k。' : "入力：" + used + "k、残り：" + remaining + 'k。';
      root.querySelector('.demo-explanation').textContent = remaining < 0 ? "要約があっても、ログ全文を入れると次の入力は上限を超えます。参照先と抜粋だけに切り替えてみましょう。" : evidence === 8 ? "入力には参照先と必要な抜粋だけを含めます。元のログは別に保存するので、空きを確保しながら後で根拠を確認できます。" : "スライダーを動かして、根拠データが増えると他の履歴に使える領域がどう減るか確認してください。出力用の予約領域をログで埋めることはできません。";
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
      play.textContent = timer ? "一時停止" : phase === 3 ? "もう一度再生" : "再生";
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
