/* Progressive enhancement: the archive and all article anchors work without JS. */
(function () {
  'use strict';
  var toastTimer;
  function toast(text) { var box=document.querySelector('.writing-toast');if(!box)return;box.textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(function(){box.textContent='';},3500); }
  async function copy(text) {
    try {
      var focused=document.activeElement;var input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;opacity:0;left:-9999px';document.body.append(input);input.select();var done=document.execCommand('copy');input.remove();if(focused)focused.focus({preventScroll:true});if(done)return true;
      await Promise.race([navigator.clipboard.writeText(text),new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'));},2000);})]);return true;
    }
    catch (_) { toast('浏览器未允许复制，请手动选中复制。');return false; }
  }
  document.querySelectorAll('[data-copy-link]').forEach(function(b){b.addEventListener('click',async function(){if(await copy(document.querySelector('link[rel=canonical]').href))toast('文章链接已复制');});});
  var share=document.querySelector('[data-share]');
  if(share)share.addEventListener('click',async function(){var url=document.querySelector('link[rel=canonical]').href;try{if(navigator.share)await navigator.share({title:document.querySelector('h1').textContent,url:url});else if(await copy(url))toast('文章链接已复制，可以分享了');}catch(e){if(e.name!=='AbortError')toast('暂时无法分享，请使用复制文章链接。');}});
  document.querySelectorAll('.article-body pre').forEach(function(pre){
    if(pre.closest('figure,.context-demo'))return;
    var code=pre.querySelector('code');if(!code)return;
    var bar=document.createElement('div');bar.className='code-toolbar';
    var label=document.createElement('span');var lang=(code.className.match(/language-([\w-]+)/)||[])[1];label.textContent=lang||'CODE';
    var button=document.createElement('button');button.type='button';button.textContent='复制代码';button.setAttribute('aria-label','复制代码块');
    button.addEventListener('click',async function(){if(await copy(code.textContent)){button.textContent='已复制 ✓';toast('代码已复制');setTimeout(function(){button.textContent='复制代码';},1800);}});
    bar.append(label,button);pre.before(bar);
  });
  var form=document.querySelector('.archive-filters');
  if(form){
    form.hidden=false;var cards=Array.from(document.querySelectorAll('.archive-card'));var result=document.querySelector('.archive-result');var empty=document.querySelector('.archive-empty');
    var params=new URLSearchParams(location.search);['q','category','tag'].forEach(function(key){if(params.has(key))form.elements[key].value=params.get(key);});
    function filter(update){var q=form.elements.q.value.trim().toLocaleLowerCase();var category=form.elements.category.value;var tag=form.elements.tag.value;var total=0;
      cards.forEach(function(card){var matches=(!q||card.dataset.search.toLocaleLowerCase().includes(q))&&(!category||card.dataset.category===category)&&(!tag||JSON.parse(card.dataset.tags).includes(tag));card.hidden=!matches;if(matches)total++;});
      result.textContent=total===cards.length?'共 '+total+' 篇文章':'找到 '+total+' / '+cards.length+' 篇文章';empty.hidden=total!==0;
      if(update){var ps=new URLSearchParams();if(q)ps.set('q',form.elements.q.value.trim());if(category)ps.set('category',category);if(tag)ps.set('tag',tag);history.replaceState(null,'',location.pathname+(ps.size?'?'+ps.toString():''));}
    }
    form.addEventListener('submit',function(e){e.preventDefault();filter(true);});form.addEventListener('input',function(){filter(true);});form.addEventListener('change',function(){filter(true);});form.addEventListener('reset',function(){setTimeout(function(){filter(true);},0);});filter(false);
  }
  var body=document.querySelector('.article-body');if(!body)return;
  var panel=document.querySelector('.toc-panel');var media=matchMedia('(max-width:900px)');
  function layout(){panel.open=!media.matches;panel.querySelector('summary').tabIndex=media.matches?0:-1;}layout();media.addEventListener('change',layout);
  var links=Array.from(document.querySelectorAll('.toc-content nav a'));var headings=links.map(function(a){return document.getElementById(decodeURIComponent(a.hash.slice(1)));});
  var progress=document.querySelector('.reading-status progress');var progressText=document.querySelector('[data-progress-text]');var mobileProgress=document.querySelector('.toc-mobile-progress');var remaining=document.querySelector('[data-remaining]');var bar=document.querySelector('.reading-progress-track span');var current=document.querySelector('.toc-current');var minutes=Number(document.querySelector('[data-reading-minutes]').dataset.readingMinutes);
  var key='denis-reading:'+location.pathname;var resume=document.querySelector('.reading-resume');var saved=null;var ignoreSaved=false;var saveTime=0;var active=-1;var positions=[];var begin=0;var end=0;
  try{saved=JSON.parse(localStorage.getItem(key));}catch(_){}
  if(saved&&saved.id&&document.getElementById(saved.id)&&saved.percent>=5&&saved.percent<95&&!location.hash){
    resume.hidden=false;resume.querySelector('strong').textContent=saved.label||'上次的位置';
    resume.querySelector('[data-resume]').addEventListener('click',function(){var h=document.getElementById(saved.id);if(h){location.hash=saved.id;h.scrollIntoView({behavior:'smooth',block:'start'});}resume.hidden=true;});
    resume.querySelector('[data-dismiss-resume]').addEventListener('click',function(){resume.hidden=true;ignoreSaved=true;try{localStorage.removeItem(key);}catch(_){};});
  }
  function measure(){positions=headings.map(function(h){return h.getBoundingClientRect().top+window.scrollY;});begin=body.getBoundingClientRect().top+window.scrollY;end=begin+body.offsetHeight;update();}
  function update(){
    var marker=window.scrollY+Math.max(110,(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+(parseFloat(getComputedStyle(headings[0]).scrollMarginTop)||0)+8);var bottom=window.scrollY+window.innerHeight;var percent=bottom>=end?100:Math.round(Math.max(0,Math.min(1,(marker-begin)/Math.max(1,end-begin-window.innerHeight*.35)))*100);if(marker<begin)percent=0;
    var idx=0;for(var i=0;i<positions.length;i++){if(positions[i]<=marker)idx=i;else break;}
    if(bottom>=end)idx=positions.length-1;
    if(idx!==active&&links[idx]){
      links.forEach(function(a){a.removeAttribute('aria-current');});links[idx].setAttribute('aria-current','location');active=idx;current.textContent='正在阅读 · '+headings[idx].textContent.replace(/#$/,'').trim();
      var list=links[idx].closest('ol');var top=links[idx].offsetTop-list.offsetTop;if(top<list.scrollTop||top+links[idx].offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=Math.max(0,top-list.clientHeight/3);
    }
    progress.value=percent;progressText.textContent=percent+'%';mobileProgress.textContent=percent+'%';bar.style.transform='scaleX('+(percent/100)+')';remaining.textContent=percent===100?'正文已读完':percent===0?'预计 '+minutes+' 分钟':'预计剩余 '+Math.max(1,Math.ceil(minutes*(1-percent/100)))+' 分钟';
    if(!ignoreSaved&&Date.now()-saveTime>800&&percent>=5){saveTime=Date.now();try{if(percent>=95)localStorage.removeItem(key);else if(headings[idx])localStorage.setItem(key,JSON.stringify({id:headings[idx].id,label:headings[idx].textContent.replace(/#$/,'').trim(),percent:percent}));}catch(_){};}
  }
  var ticking=false;window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){update();ticking=false;});}},{passive:true});window.addEventListener('resize',measure);window.addEventListener('load',measure);
  if(window.ResizeObserver)new ResizeObserver(measure).observe(body);
  links.forEach(function(a){a.addEventListener('click',function(){if(media.matches)panel.open=false;});});
  measure();
})();
