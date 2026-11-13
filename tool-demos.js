(function(){
'use strict';
document.querySelectorAll('[data-tool-lab]').forEach(function(root){
 root.querySelectorAll('[hidden]').forEach(function(e){e.hidden=false;});
 var explain=root.querySelector('.demo-explanation');
 if(root.dataset.toolLab==='read'){
  var pages={first:["1  export const config = {\n2    host: 'localhost',",'仅展示第 1–2 行，共 6 行。继续读取从第 3 行开始。','先确定范围，再判断文件。没有看到 retries，不能断言它不存在。'],next:['3    retries: 3,\n4    timeout: 1000,','仅展示第 3–4 行，共 6 行。仍有第 5–6 行。','接着读才看到 retries。明确的续读位置，让模型无需猜测上次停在哪里。'],target:['2    host: \'localhost\',\n3    retries: 3,\n4    timeout: 1000,','指定范围：第 2–4 行，共 6 行。','已知目标位置时，直接读取附近上下文。这样可以检查 retries，而不把整个文件都带进输入。']};
  function show(name){var p=pages[name];root.querySelector('.tool-read-result').textContent=p[0];root.querySelector('.tool-read-notice').textContent=p[1];explain.textContent=p[2];root.querySelectorAll('[data-read]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.read===name));});}
  root.querySelectorAll('[data-read]').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.read);});});show('first');
 }else if(root.dataset.toolLab==='edit'){
  var other=root.querySelector('input');
  function file(applied){root.querySelector('.tool-edit-file').textContent='const upload = { retries: '+(applied?5:other.checked?4:3)+' };\nconst download = { retries: 3 };';}
  function edit(unique){file(false);root.querySelector('.tool-edit-proposal').textContent=unique?'old: const upload = { retries: 3 };\nnew: const upload = { retries: 5 };':'old: retries: 3\nnew: retries: 5';
   if(unique&&other.checked){explain.textContent='拒绝：旧代码已经变为 retries: 4。先重新读取当前版本、理解其他改动，再决定怎样修改。';root.dataset.result='error';}
   else if(!unique&&!other.checked){explain.textContent='拒绝：匹配了 upload 与 download 两处。增加上下文，不要让工具替你猜。';root.dataset.result='error';}
   else if(!unique&&other.checked){root.querySelector('.tool-edit-file').textContent='const upload = { retries: 4 };\nconst download = { retries: 5 };';explain.textContent='短片段现在只匹配 download，替换会成功，却没有完成“修改 upload”的意图。唯一匹配也不能代替正确理解。';root.dataset.result='error';}
   else{file(true);explain.textContent='成功：旧代码唯一匹配 upload，只把它从 3 改为 5，download 仍然是 3。匹配验证的是片段前提，不是整个文件版本。';root.dataset.result='ok';}
  }
  other.addEventListener('change',function(){file(false);root.querySelector('.tool-edit-proposal').textContent='等待提交新的替换。';explain.textContent=other.checked?'现在 upload 已被别人改成 4。分别试试短片段和完整旧代码，会得到不同结果。':'恢复原始文件。尝试短片段，再补足上下文。';delete root.dataset.result;});root.querySelectorAll('[data-edit]').forEach(function(b){b.addEventListener('click',function(){edit(b.dataset.edit==='unique');});});
 }else if(root.dataset.toolLab==='shell'){
  var phase=0,timer=null;
  var states=[['尚未启动测试命令','日志工件：尚未生成','等待执行。','还没有运行，就没有测试结论。文字里说“已开始”也不等于测试通过。'],['测试进程运行中 · job-demo-1','日志持续写入：test-demo.log','status: running\njob_id: job-demo-1\noutput: 正在执行测试…','工具先返回运行状态，模型可以处理不依赖结果的工作。此时不能宣布测试通过，也不应重复启动。'],['测试进程已结束 · exit_code: 1','全文保存在：test-demo.log','status: completed\nexit_code: 1\n…省略前面的长日志…\nFAIL retry.spec.ts\nexpected 5, received 3\ntruncated: true','日志太长，只返回片段与全文引用。进程已经结束，但这次测试失败；completed 不等于成功。'],['按引用检查失败位置','只补读相关范围：test-demo.log','读取失败断言附近内容：\nretry.spec.ts:42\n配置值仍是 3，需要继续排查。','工具结果给下一步判断提供证据。真正完成任务，需要修改正确并通过相应验证，而不只是收到一条命令结果。']];
  function stop(){if(timer)clearInterval(timer);timer=null;}
  function paint(){var s=states[phase];root.querySelector('.tool-process').textContent=s[0];root.querySelector('.tool-logfile').textContent=s[1];root.querySelector('.tool-shell-output').textContent=s[2];explain.textContent=s[3];root.querySelector('.demo-count').textContent=(phase+1)+' / 4';root.querySelector('[data-shell=prev]').disabled=phase===0;root.querySelector('[data-shell=next]').disabled=phase===3;root.querySelector('[data-shell=play]').textContent=timer?'暂停':phase===3?'重播动画':'播放动画';root.querySelector('[data-shell=play]').setAttribute('aria-pressed',String(!!timer));root.querySelectorAll('.tool-stage-row span').forEach(function(el,i){el.classList.toggle('stage-active',i===Math.min(phase,2));});}
  root.querySelectorAll('[data-shell]').forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.shell;if(a==='play'){if(timer)stop();else{if(phase===3)phase=0;timer=setInterval(function(){phase++;if(phase>=3){phase=3;stop();}paint();},3000);}}else{stop();phase=a==='reset'?0:Math.max(0,Math.min(3,phase+(a==='next'?1:-1)));}paint();});});
  document.addEventListener('visibilitychange',function(){if(document.hidden){stop();paint();}});window.addEventListener('pagehide',stop);
  if('IntersectionObserver'in window)new IntersectionObserver(function(entries){if(!entries[0].isIntersecting){stop();paint();}},{threshold:0}).observe(root);paint();
 }
});
})();
