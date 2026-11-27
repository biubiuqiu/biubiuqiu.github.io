(function(){
'use strict';
document.querySelectorAll('[data-tool-lab]').forEach(function(root){
 root.querySelectorAll('[hidden]').forEach(function(e){e.hidden=false;});
 var explain=root.querySelector('.demo-explanation');
 if(root.dataset.toolLab==='read'){
  var pages={first:["1  export const config = {\n2    host: 'localhost',","Showing lines 1–2 of 6. Continue from line 3.","Check which lines you have read. The absence of retries in this excerpt says nothing about the rest of the file."],next:['3    retries: 3,\n4    timeout: 1000,',"Showing lines 3–4 of 6. Lines 5–6 remain.","The next read reveals retries. An explicit continuation point tells the model where to resume."],target:['2    host: \'localhost\',\n3    retries: 3,\n4    timeout: 1000,',"Requested range: lines 2–4 of 6.","When you know the location, read the surrounding lines. You can inspect retries without sending the entire file."]};
  function show(name){var p=pages[name];root.querySelector('.tool-read-result').textContent=p[0];root.querySelector('.tool-read-notice').textContent=p[1];explain.textContent=p[2];root.querySelectorAll('[data-read]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.read===name));});}
  root.querySelectorAll('[data-read]').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.read);});});show('first');
 }else if(root.dataset.toolLab==='edit'){
  var other=root.querySelector('input');
  function file(applied){root.querySelector('.tool-edit-file').textContent='const upload = { retries: '+(applied?5:other.checked?4:3)+' };\nconst download = { retries: 3 };';}
  function edit(unique){file(false);root.querySelector('.tool-edit-proposal').textContent=unique?'old: const upload = { retries: 3 };\nnew: const upload = { retries: 5 };':'old: retries: 3\nnew: retries: 5';
   if(unique&&other.checked){explain.textContent="Rejected: the code now says retries: 4. Read the current file, understand the intervening change, then decide what to edit.";root.dataset.result='error';}
   else if(!unique&&!other.checked){explain.textContent="Rejected: both upload and download match. Add enough context to identify the intended target.";root.dataset.result='error';}
   else if(!unique&&other.checked){root.querySelector('.tool-edit-file').textContent='const upload = { retries: 4 };\nconst download = { retries: 5 };';explain.textContent="The short fragment now matches only download. Replacement succeeds but changes the wrong setting. Uniqueness alone cannot establish intent.";root.dataset.result='error';}
   else{file(true);explain.textContent="Success: the old code matches only upload. It changes from 3 to 5 and download stays at 3. The check covers the fragment, not the entire file version.";root.dataset.result='ok';}
  }
  other.addEventListener('change',function(){file(false);root.querySelector('.tool-edit-proposal').textContent="Waiting for a new replacement.";explain.textContent=other.checked?"Someone changed upload to 4. Try the short fragment and the full old code to see how the outcomes differ.":"Original file restored. Try the short fragment, then add context.";delete root.dataset.result;});root.querySelectorAll('[data-edit]').forEach(function(b){b.addEventListener('click',function(){edit(b.dataset.edit==='unique');});});
 }else if(root.dataset.toolLab==='shell'){
  var phase=0,timer=null;
  var states=[["Test command has not started","Log artifact: not created yet","Waiting to run.","No run means no test verdict. A message saying “started” does not prove that tests passed."],["Test process running · job-demo-1","Appending logs to test-demo.log","status: running\njob_id: job-demo-1\noutput: Running tests…","The tool returns a running status so the model can work on independent tasks. Wait for the result before claiming success or starting another run."],["Test process exited · exit_code: 1","Full output saved in test-demo.log","status: completed\nexit_code: 1\n…earlier log output omitted…\nFAIL retry.spec.ts\nexpected 5, received 3\ntruncated: true","The tool returns an excerpt and a reference to the full log. The process finished, but this test failed; completed indicates termination, not success."],["Inspect the failure by reference","Read the relevant range in test-demo.log","Around the failing assertion:\nretry.spec.ts:42\nThe configured value is still 3. Investigate further.","The tool result informs the next decision. Finishing the task requires a correct fix and a passing verification run."]];
  function stop(){if(timer)clearInterval(timer);timer=null;}
  function paint(){var s=states[phase];root.querySelector('.tool-process').textContent=s[0];root.querySelector('.tool-logfile').textContent=s[1];root.querySelector('.tool-shell-output').textContent=s[2];explain.textContent=s[3];root.querySelector('.demo-count').textContent=(phase+1)+' / 4';root.querySelector('[data-shell=prev]').disabled=phase===0;root.querySelector('[data-shell=next]').disabled=phase===3;root.querySelector('[data-shell=play]').textContent=timer?"Pause":phase===3?"Replay":"Play";root.querySelector('[data-shell=play]').setAttribute('aria-pressed',String(!!timer));root.querySelectorAll('.tool-stage-row span').forEach(function(el,i){el.classList.toggle('stage-active',i===Math.min(phase,2));});}
  root.querySelectorAll('[data-shell]').forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.shell;if(a==='play'){if(timer)stop();else{if(phase===3)phase=0;timer=setInterval(function(){phase++;if(phase>=3){phase=3;stop();}paint();},3000);}}else{stop();phase=a==='reset'?0:Math.max(0,Math.min(3,phase+(a==='next'?1:-1)));}paint();});});
  document.addEventListener('visibilitychange',function(){if(document.hidden){stop();paint();}});window.addEventListener('pagehide',stop);
  if('IntersectionObserver'in window)new IntersectionObserver(function(entries){if(!entries[0].isIntersecting){stop();paint();}},{threshold:0}).observe(root);paint();
 }
});
})();
