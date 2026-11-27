(function(){
'use strict';
document.querySelectorAll('[data-tool-lab]').forEach(function(root){
 root.querySelectorAll('[hidden]').forEach(function(e){e.hidden=false;});
 var explain=root.querySelector('.demo-explanation');
 if(root.dataset.toolLab==='read'){
  var pages={first:["1  export const config = {\n2    host: 'localhost',","全6行のうち1～2行目を表示。続きは3行目からです。","まず読んだ範囲を確認しましょう。この抜粋に retries がなくても、ファイル全体に存在しないとは判断できません。"],next:['3    retries: 3,\n4    timeout: 1000,',"全6行のうち3～4行目を表示。5～6行目が残っています。","続けて読むと retries が見つかります。再開位置を明示すれば、モデルは前回どこで止まったか推測せずに済みます。"],target:['2    host: \'localhost\',\n3    retries: 3,\n4    timeout: 1000,',"指定範囲：全6行のうち2～4行目。","位置が分かっている場合はその前後を読みます。ファイル全体を入力に含めずに retries を検証できます。"]};
  function show(name){var p=pages[name];root.querySelector('.tool-read-result').textContent=p[0];root.querySelector('.tool-read-notice').textContent=p[1];explain.textContent=p[2];root.querySelectorAll('[data-read]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.read===name));});}
  root.querySelectorAll('[data-read]').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.read);});});show('first');
 }else if(root.dataset.toolLab==='edit'){
  var other=root.querySelector('input');
  function file(applied){root.querySelector('.tool-edit-file').textContent='const upload = { retries: '+(applied?5:other.checked?4:3)+' };\nconst download = { retries: 3 };';}
  function edit(unique){file(false);root.querySelector('.tool-edit-proposal').textContent=unique?'old: const upload = { retries: 3 };\nnew: const upload = { retries: 5 };':'old: retries: 3\nnew: retries: 5';
   if(unique&&other.checked){explain.textContent="拒否：旧コードはすでに retries: 4 に変わっています。現在のファイルを読み直し、他の変更を理解してから修正方法を決めます。";root.dataset.result='error';}
   else if(!unique&&!other.checked){explain.textContent="拒否：upload と download の両方に一致しました。対象を一意に特定できる文脈を加えてください。";root.dataset.result='error';}
   else if(!unique&&other.checked){root.querySelector('.tool-edit-file').textContent='const upload = { retries: 4 };\nconst download = { retries: 5 };';explain.textContent="短い断片は今度は download だけに一致します。置換には成功しますが、upload を直す目的は達成できません。一意性だけでは意図を確かめられません。";root.dataset.result='error';}
   else{file(true);explain.textContent="成功：旧コードに一致した upload だけが3から5に変わり、download は3のままです。照合で確認できるのは断片の前提で、ファイル全体のバージョンではありません。";root.dataset.result='ok';}
  }
  other.addEventListener('change',function(){file(false);root.querySelector('.tool-edit-proposal').textContent="新しい置換の送信を待っています。";explain.textContent=other.checked?"他の人が upload を4に変更しました。短い断片と完全な旧コードをそれぞれ試して、結果を比較してください。":"元のファイルに戻しました。短い断片を試し、次に文脈を加えてください。";delete root.dataset.result;});root.querySelectorAll('[data-edit]').forEach(function(b){b.addEventListener('click',function(){edit(b.dataset.edit==='unique');});});
 }else if(root.dataset.toolLab==='shell'){
  var phase=0,timer=null;
  var states=[["テストコマンドは未起動","ログ成果物：未生成","実行待ち。","まだ実行していないため、テスト結果はありません。「開始した」というメッセージは合格の根拠になりません。"],["テストプロセス実行中 · job-demo-1","test-demo.log にログを書き込み中","status: running\njob_id: job-demo-1\noutput: テスト実行中…","ツールが実行中という状態を返すと、モデルは結果に依存しない作業を進められます。合格と宣言したり、同じテストを再度起動したりせず、結果を待ちます。"],["テストプロセス終了 · exit_code: 1","全文の保存先：test-demo.log","status: completed\nexit_code: 1\n…前半の長いログは省略…\nFAIL retry.spec.ts\nexpected 5, received 3\ntruncated: true","ログが長いため、抜粋と全文への参照先だけを返します。プロセスは終了しましたが、テストは失敗しています。completed は終了を示す状態です。"],["参照先から失敗箇所を確認","test-demo.log の該当範囲だけを取得","失敗したアサーション付近：\nretry.spec.ts:42\n設定値はまだ3です。引き続き原因を調べます。","ツールの結果は次の判断に使う根拠です。タスクを完了するには正しく修正し、対応する検証にも合格する必要があります。"]];
  function stop(){if(timer)clearInterval(timer);timer=null;}
  function paint(){var s=states[phase];root.querySelector('.tool-process').textContent=s[0];root.querySelector('.tool-logfile').textContent=s[1];root.querySelector('.tool-shell-output').textContent=s[2];explain.textContent=s[3];root.querySelector('.demo-count').textContent=(phase+1)+' / 4';root.querySelector('[data-shell=prev]').disabled=phase===0;root.querySelector('[data-shell=next]').disabled=phase===3;root.querySelector('[data-shell=play]').textContent=timer?"一時停止":phase===3?"もう一度再生":"再生";root.querySelector('[data-shell=play]').setAttribute('aria-pressed',String(!!timer));root.querySelectorAll('.tool-stage-row span').forEach(function(el,i){el.classList.toggle('stage-active',i===Math.min(phase,2));});}
  root.querySelectorAll('[data-shell]').forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.shell;if(a==='play'){if(timer)stop();else{if(phase===3)phase=0;timer=setInterval(function(){phase++;if(phase>=3){phase=3;stop();}paint();},3000);}}else{stop();phase=a==='reset'?0:Math.max(0,Math.min(3,phase+(a==='next'?1:-1)));}paint();});});
  document.addEventListener('visibilitychange',function(){if(document.hidden){stop();paint();}});window.addEventListener('pagehide',stop);
  if('IntersectionObserver'in window)new IntersectionObserver(function(entries){if(!entries[0].isIntersecting){stop();paint();}},{threshold:0}).observe(root);paint();
 }
});
})();
