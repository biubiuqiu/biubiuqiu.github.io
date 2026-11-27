/* Progressive enhancement: the archive and all article anchors work without JS. */
(function () {
  'use strict';
  const messages = JSON.parse(document.getElementById('writing-messages').textContent);
  function countLabel(key, value) { return messages[key].replace('{n}', String(value)); }
  var toastTimer;
  function toast(text) { var box=document.querySelector('.writing-toast');if(!box)return;box.textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(function(){box.textContent='';},3500); }
  async function copy(text) {
    try {
      var focused=document.activeElement;var input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;opacity:0;left:-9999px';document.body.append(input);input.select();var done=document.execCommand('copy');input.remove();if(focused)focused.focus({preventScroll:true});if(done)return true;
      await Promise.race([navigator.clipboard.writeText(text),new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'));},2000);})]);return true;
    }
    catch (_) { toast(messages.manual_copy);return false; }
  }
  document.querySelectorAll('[data-copy-link]').forEach(function(b){b.addEventListener('click',async function(){if(await copy(document.querySelector('link[rel=canonical]').href))toast(messages.link_copied);});});
  var share=document.querySelector('[data-share]');
  if(share)share.addEventListener('click',async function(){var url=document.querySelector('link[rel=canonical]').href;try{if(navigator.share)await navigator.share({title:document.querySelector('h1').textContent,url:url});else if(await copy(url))toast(messages.share_copied);}catch(e){if(e.name!=='AbortError')toast(messages.share_failed);}});
  document.querySelectorAll('.article-body pre').forEach(function(pre){
    if(pre.closest('figure,.context-demo'))return;
    var code=pre.querySelector('code');if(!code)return;
    var bar=document.createElement('div');bar.className='code-toolbar';
    var label=document.createElement('span');var lang=(code.className.match(/language-([\w-]+)/)||[])[1];label.textContent=lang||'CODE';
    var button=document.createElement('button');button.type='button';button.textContent=messages.copy_code;button.setAttribute('aria-label',messages.copy_block);
    button.addEventListener('click',async function(){if(await copy(code.textContent)){button.textContent=messages.copied;toast(messages.code_copied);setTimeout(function(){button.textContent=messages.copy_code;},1800);}});
    bar.append(label,button);pre.before(bar);
  });
  // A handoff is scoped to one tab and consumed by the intended destination.
  const handoffKey = 'writing.archiveNavigation';
  function handoff(value) {
    try { sessionStorage.setItem(handoffKey, JSON.stringify(value)); } catch {}
  }
  function arriving() {
    try {
      const value = JSON.parse(sessionStorage.getItem(handoffKey));
      sessionStorage.removeItem(handoffKey);
      if (value?.to === location.href && value.from === document.referrer) return value;
    } catch {}
    return null;
  }
  const arrival = arriving();
  function ordinaryClick(e) {
    return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }
  var form=document.querySelector('.archive-filters');
  if(form){
    const cards = Array.from(document.querySelectorAll('.archive-card'));
    const tags = Array.from(document.querySelectorAll('.archive-card .post-tags a'));
    const result = document.querySelector('.archive-result');
    const empty = document.querySelector('.archive-empty');
    const clear = document.querySelector('.filter-clear');
    const toggle = form.querySelector('.filter-toggle');
    const count = toggle.querySelector('.filter-count');
    const optionPanel = document.getElementById(toggle.getAttribute('aria-controls'));
    const search = form.elements.q;
    const fields = ['q', 'category', 'tag'];
    var dropdowns=[];
    function customSelect(select) {
      var field=select.parentElement;
      var wrapper=document.createElement('div');wrapper.className='filter-select';
      var trigger=document.createElement('button');trigger.type='button';trigger.className='filter-trigger';
      trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
      var value=document.createElement('span');value.id=select.name+'-value';value.className='filter-value';
      var chevron=document.createElement('span');chevron.className='filter-chevron';chevron.setAttribute('aria-hidden','true');
      trigger.append(value,chevron);trigger.setAttribute('aria-labelledby',select.getAttribute('aria-labelledby')+' '+value.id);
      var menu=document.createElement('div');menu.id=select.name+'-options';menu.className='filter-options';menu.hidden=true;
      menu.setAttribute('role','listbox');menu.setAttribute('aria-labelledby',select.getAttribute('aria-labelledby'));
      trigger.setAttribute('aria-controls',menu.id);
      var options=Array.from(select.options);var active=0;var query='';var typedAt=0;
      var items=options.map(function(option,index){
        var item=document.createElement('div');item.className='filter-option';item.id=select.name+'-option-'+index;
        item.setAttribute('role','option');item.textContent=option.textContent;
        item.addEventListener('pointerdown',function(e){e.preventDefault();});
        item.addEventListener('pointermove', function(event) {
          if (event.pointerType === 'touch') return;
          menu.style.setProperty('--reflection-x', event.offsetX + 'px');
          if (active !== index) highlight(index, false);
        });
        item.addEventListener('click',function(){choose(index);});menu.append(item);return item;
      });
      function highlight(index,scroll) {
        menu.toggleAttribute('data-gliding', trigger.hasAttribute('aria-activedescendant') && active !== index);
        active=Math.max(0,Math.min(items.length-1,index));
        const row = items[active];
        menu.style.setProperty('--row-y', row.offsetTop + 'px');
        menu.style.setProperty('--row-height', row.offsetHeight + 'px');
        if (scroll) menu.style.removeProperty('--reflection-x');
        items.forEach(function(item,i){item.classList.toggle('is-active',i===active);});
        trigger.setAttribute('aria-activedescendant',items[active].id);
        if (scroll) {
          if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop;
          else if (row.offsetTop + row.offsetHeight > menu.scrollTop + menu.clientHeight) {
            menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight;
          }
        }
      }
      function sync() {
        if(select.selectedIndex<0)select.selectedIndex=0;
        value.textContent=options[Math.max(0,select.selectedIndex)].textContent;
        items.forEach(function(item,i){item.setAttribute('aria-selected',String(i===select.selectedIndex));});
        trigger.classList.toggle('has-value',Boolean(select.value));
      }
      function close() {
        menu.hidden=true;menu.removeAttribute('data-gliding');trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');wrapper.classList.remove('is-open');query='';
      }
      function open() {
        dropdowns.forEach(function(widget){widget.close();});menu.hidden=false;wrapper.classList.add('is-open');trigger.setAttribute('aria-expanded','true');
        fitMenu();
        highlight(Math.max(0,select.selectedIndex),true);
      }
      function fitMenu() {
        if (menu.hidden) return;
        const bounds = trigger.getBoundingClientRect();
        const below = document.documentElement.clientHeight - bounds.bottom;
        const above = below < Math.min(230, menu.scrollHeight + 12) && bounds.top > below;
        menu.classList.toggle('opens-above', above);
        menu.style.maxHeight = Math.max(44, Math.min(296, (above ? bounds.top : below) - 14)) + 'px';
      }
      window.addEventListener('resize', () => {
        if (!menu.hidden) { fitMenu(); highlight(active, true); }
      });
      function choose(index) {
        select.selectedIndex=index;sync();close();trigger.focus({preventScroll:true});select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      trigger.addEventListener('click',function(){if(menu.hidden)open();else close();});
      trigger.addEventListener('keydown',function(e){
        var key=e.key;
        if(key==='Tab'){close();return;}
        if(key==='Escape'){if(!menu.hidden){e.preventDefault();e.stopPropagation();close();}return;}
        if(key==='Enter'||key===' '){e.preventDefault();if(menu.hidden)open();else choose(active);return;}
        if(['ArrowDown','ArrowUp','Home','End'].includes(key)){
          e.preventDefault();var wasClosed=menu.hidden;if(wasClosed)open();
          if(key==='Home')highlight(0,true);else if(key==='End')highlight(items.length-1,true);
          else if(!wasClosed)highlight(active+(key==='ArrowDown'?1:-1),true);return;
        }
        if(key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
          e.preventDefault();if(menu.hidden)open();var now=Date.now();query=(now-typedAt>700?'':query)+key.toLocaleLowerCase();typedAt=now;
          var found=options.findIndex(function(option){return option.textContent.toLocaleLowerCase().startsWith(query);});
          if(found>=0)highlight(found,true);
        }
      });
      document.addEventListener('pointerdown',function(e){if(!wrapper.contains(e.target))close();});
      wrapper.addEventListener('focusout',function(e){if(!wrapper.contains(e.relatedTarget))close();});
      wrapper.append(trigger,menu);field.append(wrapper);select.hidden=true;
      sync();return {sync:sync,close:close};
    }
    form.querySelectorAll('select').forEach(function(select){dropdowns.push(customSelect(select));});
    function showOptions(open) {
      if (!open) dropdowns.forEach(widget => widget.close());
      optionPanel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', () => showOptions(optionPanel.hidden));
    form.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !optionPanel.hidden && event.target !== search) {
        event.preventDefault();
        showOptions(false);
        toggle.focus();
      }
    });
    function applyFilters(writeUrl) {
      dropdowns.forEach(widget => widget.sync());
      const query = search.value.trim().toLocaleLowerCase();
      const category = form.elements.category.value;
      const tag = form.elements.tag.value;
      const selected = [category, tag].filter(Boolean);
      tags.forEach(link => {
        const selectedTag = tag !== '' && new URL(link.href).searchParams.get('tag') === tag;
        link.classList.toggle('glass-control', selectedTag);
      });
      let total = 0;
      cards.forEach(card => {
        const matches = (!query || card.dataset.search.toLocaleLowerCase().includes(query)) &&
          (!category || card.dataset.category === category) &&
          (!tag || JSON.parse(card.dataset.tags).includes(tag));
        card.hidden = !matches;
        if (matches) total++;
      });
      const active = Boolean(query || selected.length);
      const message = (selected.length ? selected.join(' · ') + ' · ' : '') +
        (total === 1 ? messages[active ? 'single_match' : 'single_result'] : countLabel(active ? 'matches' : 'results', total));
      if (result.textContent !== message) result.textContent = message;
      count.hidden = !selected.length;
      count.textContent = selected.length ? String(selected.length) : '';
      toggle.classList.toggle('has-value', selected.length > 0);
      toggle.setAttribute('aria-label', selected.length ? countLabel('filter_count', selected.length) : messages.filters);
      clear.hidden = !active;
      empty.hidden = total !== 0;
      if (writeUrl) {
        const url = new URL(location.href);
        fields.forEach(name => {
          const value = form.elements[name].value.trim();
          if (value) url.searchParams.set(name, value);
          else url.searchParams.delete(name);
        });
        if (url.href !== location.href) history.replaceState(history.state, '', url);
      }
    }
    function readLocation() {
      const params = new URLSearchParams(location.search);
      fields.forEach(name => { form.elements[name].value = params.get(name) || ''; });
      applyFilters(false);
    }
    search.addEventListener('input', event => { if (!event.isComposing) applyFilters(true); });
    search.addEventListener('compositionend', () => applyFilters(true));
    form.addEventListener('change', () => applyFilters(true));
    form.addEventListener('submit', event => { event.preventDefault(); applyFilters(true); });
    form.addEventListener('reset', () => {
      showOptions(false);
      setTimeout(() => { applyFilters(true); search.focus(); }, 0);
    });
    readLocation();
    form.hidden = false;
    const grid = document.querySelector('.archive-grid');
    grid.addEventListener('click', event => {
      const link = event.target.closest('.archive-entry h2 a');
      if (!link || !ordinaryClick(event)) return;
      const bookmark = { url: location.href, article: link.href,
        offset: link.getBoundingClientRect().top, expanded: !optionPanel.hidden };
      history.replaceState({ ...history.state, archiveBookmark: bookmark }, '');
      handoff({ from: location.href, to: link.href, bookmark });
    });
    if (arrival?.bookmark) history.replaceState({ ...history.state, archiveBookmark: arrival.bookmark }, '');
    window.addEventListener('pageshow', () => {
      readLocation();
      const bookmark = history.state?.archiveBookmark;
      if (!bookmark || bookmark.url !== location.href) return;
      const link = [...grid.querySelectorAll('h2 a')].find(a => a.href === bookmark.article);
      if (!link || link.closest('.archive-card').hidden) return;
      showOptions(bookmark.expanded);
      requestAnimationFrame(() => {
        window.scrollBy({ top: link.getBoundingClientRect().top - bookmark.offset, behavior: 'instant' });
        link.focus({ preventScroll: true });
      });
    });
    window.addEventListener('popstate', readLocation);
  }
  var body=document.querySelector('.article-body');if(!body)return;
  const bookmark = arrival?.bookmark || history.state?.archiveOrigin;
  if (bookmark?.article === location.href.split('#')[0] && new URL(bookmark.url).origin === location.origin) {
    history.replaceState({ ...history.state, archiveOrigin: bookmark }, '');
    const archivePath = document.querySelector('.writing-index-link').getAttribute('href');
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.getAttribute('href') !== archivePath || link.hreflang) return;
      link.href = bookmark.url;
      link.addEventListener('click', event => {
        if (ordinaryClick(event)) handoff({ from: location.href.split('#')[0], to: link.href, bookmark });
      });
    });
  }
  var panel=document.querySelector('.toc-panel');var media=matchMedia('(max-width:900px)');
  function layout(){panel.open=!media.matches;panel.querySelector('summary').tabIndex=media.matches?0:-1;}layout();media.addEventListener('change',layout);
  var links=Array.from(document.querySelectorAll('.toc-content nav a'));var headings=links.map(function(a){return document.getElementById(decodeURIComponent(a.hash.slice(1)));});
  const track = document.querySelector('.reading-progress-track');
  const bar = track.querySelector('span');
  const remaining = document.querySelector('[data-remaining]');
  const minutes = Number(document.querySelector('[data-reading-minutes]').dataset.readingMinutes);
  track.hidden = false;
  var key='denis-reading:'+location.pathname;var resume=document.querySelector('.reading-resume');var saved=null;var ignoreSaved=false;var saveTime=0;var active=-1;var positions=[];var begin=0;var end=0;
  try{saved=JSON.parse(localStorage.getItem(key));}catch(_){}
  if(saved&&saved.id&&document.getElementById(saved.id)&&saved.percent>=5&&saved.percent<95&&!location.hash){
    resume.hidden=false;resume.querySelector('strong').textContent=saved.label||messages.saved_position;
    resume.querySelector('[data-resume]').addEventListener('click',function(){resume.hidden=true;location.hash=saved.id;});
    resume.querySelector('[data-dismiss-resume]').addEventListener('click',function(){resume.hidden=true;ignoreSaved=true;try{localStorage.removeItem(key);}catch(_){};});
  }
  function measure(){positions=headings.map(function(h){return h.getBoundingClientRect().top+window.scrollY;});begin=body.getBoundingClientRect().top+window.scrollY;end=begin+body.offsetHeight;update();}
  function update(){
    var marker=window.scrollY+Math.max(110,(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+(parseFloat(getComputedStyle(headings[0]).scrollMarginTop)||0)+8);var bottom=window.scrollY+window.innerHeight;var percent=bottom>=end?100:Math.round(Math.max(0,Math.min(1,(marker-begin)/Math.max(1,end-begin-window.innerHeight*.35)))*100);if(marker<begin)percent=0;
    var idx=0;for(var i=0;i<positions.length;i++){if(positions[i]<=marker)idx=i;else break;}
    if(bottom>=end)idx=positions.length-1;
    if(idx!==active&&links[idx]){
      links.forEach(function(a){a.removeAttribute('aria-current');});links[idx].setAttribute('aria-current','location');active=idx;
      var list=links[idx].closest('ol');var top=links[idx].offsetTop-list.offsetTop;if(top<list.scrollTop||top+links[idx].offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=Math.max(0,top-list.clientHeight/3);
    }
    track.setAttribute('aria-valuenow', String(percent));
    bar.style.transform='scaleX('+(percent/100)+')';remaining.textContent=percent===100?messages.finished:percent===0?countLabel('estimate', minutes):countLabel('remaining', Math.max(1,Math.ceil(minutes*(1-percent/100))));
    if(!ignoreSaved&&Date.now()-saveTime>800&&percent>=5){saveTime=Date.now();try{if(percent>=95)localStorage.removeItem(key);else if(headings[idx])localStorage.setItem(key,JSON.stringify({id:headings[idx].id,label:headings[idx].textContent.replace(/#$/,'').trim(),percent:percent}));}catch(_){};}
  }
  var ticking=false;window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){update();ticking=false;});}},{passive:true});window.addEventListener('resize',measure);window.addEventListener('load',measure);
  if(window.ResizeObserver)new ResizeObserver(measure).observe(body);
  links.forEach(function(a, index){
    a.addEventListener('click',function(){
      if (!media.matches) return;
      panel.open = false;
      headings[index].tabIndex = -1;
      headings[index].focus({preventScroll:true});
    });
  });
  measure();
})();
