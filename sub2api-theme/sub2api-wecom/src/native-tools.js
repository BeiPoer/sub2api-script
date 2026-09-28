/* Expose native controls without reparenting Vue nodes or replacing their state. */
function createNativeTools({shell,chat,bar,getContext,button,beforeAction}) {
  const root=document.documentElement;
  const markedCharts=new Set(), markedRows=new Set(), markedStatic=new Set(), focusPath=new Set();
  let focusRow=null, tabStamp='', pagerStamp='', selectionStamp='',sortStamp='';
  const toolbar=document.createElement('div');toolbar.className='s2wc-native-toolbar';
  const tabs=document.createElement('div');tabs.className='s2wc-native-tabs';tabs.setAttribute('aria-label','记录类型');
  const selectedInfo=document.createElement('span');selectedInfo.className='s2wc-native-selection';
  const sort=document.createElement('div');sort.className='s2wc-native-sort';
  chat.querySelector('.s2wc-im-chat-head').after(toolbar);
  const inline=createInlineToolbar({toolbar,tabs,sort,selectedInfo,getContext,active,beforeAction});
  const pager=document.createElement('div');pager.className='s2wc-native-pager';pager.setAttribute('aria-label','记录分页');
  chat.querySelector('.s2wc-im-composer').before(pager);
  const text=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
  const label=e=>e.getAttribute('aria-label')||e.title||text(e);
  function active(el){
    const main=getContext().main;
    for(let n=el;n&&n!==main;n=n.parentElement){
      if(n.hidden||n.style.display==='none')return false;
      if(n.classList.contains('hidden')&&getComputedStyle(n).display==='none')return false;
    }
    return !!el&&main?.contains(el);
  }
  function clearFocus(){for(const el of focusPath)el.classList.remove('s2wc-tool-path');focusPath.clear();focusRow?.classList.remove('s2wc-tool-focus');focusRow=null;root.classList.remove('s2wc-record-tools');}
  function open(source,record=false){
    if(!record&&(!source||inline.has(source))){clearFocus();root.classList.remove('s2wc-native-open');getContext().frame.removeAttribute('aria-hidden');inline.focus(source);return;}
    clearFocus();root.classList.add('s2wc-native-open');const {frame,main}=getContext();frame.removeAttribute('aria-hidden');
    inline.layout();
    if(record&&source?.isConnected){
      focusRow=source;source.classList.add('s2wc-tool-focus');root.classList.add('s2wc-record-tools');
      for(let p=source.parentElement;p&&main.contains(p);p=p.parentElement){p.classList.add('s2wc-tool-path');focusPath.add(p);}
      if(source.matches('tr')){
        const labels=[...source.closest('table').querySelectorAll('thead th')].map(text);
        [...source.cells].forEach((cell,i)=>cell.setAttribute('data-s2wc-label',labels[i]||''));
      }
    }
    const title=bar.querySelector('strong');if(title)title.textContent=record?'记录操作':'会话工具';
    bar.querySelector('button[aria-label="返回会话"]')?.focus();
    if(source&&!record)requestAnimationFrame(()=>source.isConnected&&source.scrollIntoView?.({block:'nearest'}));
  }
  function scanCharts(main){
    const next=new Set();
    for(const canvas of main.querySelectorAll('canvas,.recharts-wrapper,.echarts-container,[data-chart]')){
      const card=canvas.closest('.card,.glass-card,figure');
      if(/二维码|验证码|QR|captcha/i.test(text(card?.querySelector('h2,h3,h4'))))continue;
      next.add(card&&(!card.querySelector('table')||/趋势|分布|trend|distribution/i.test(text(card.querySelector('h2,h3,h4'))))?card:canvas);
    }
    // Identify empty/loading chart cards too, before the chart canvas exists.
    for(const card of main.querySelectorAll('.card')){
      const title=text(card.querySelector('h2,h3,h4'));
      if(/趋势|分布|曲线|饼图|trend|distribution|chart/i.test(title)&&!card.querySelector('[data-testid="usage-detail-tab"],input[type="date"],input[type="datetime-local"]'))next.add(card);
    }
    for(const old of markedCharts)if(!next.has(old)){old.classList.remove('s2wc-chart-hidden');markedCharts.delete(old);}
    for(const el of next){if(!el.classList.contains('s2wc-chart-hidden'))el.classList.add('s2wc-chart-hidden');markedCharts.add(el);}
  }
  function nativePagers(){
    const main=getContext().main;
    return [...main.querySelectorAll('nav[aria-label="Pagination"],nav[aria-label="分页"]')].map(nav=>{
      if(active(nav))return nav;
      const container=nav.parentElement?.parentElement;
      return container&&active(container)?[...container.children].find(part=>active(part)&&part.querySelector('button')&&/上一页|下一页|previous|next/i.test(text(part))):null;
    }).filter(Boolean);
  }
  function syncPager(){
    const nav=nativePagers()[0];
    const area=nav?.closest('.layout-section-fixed')||nav?.parentElement?.parentElement;
    const prev=nav&&[...nav.querySelectorAll('button')].find(b=>/上一页|previous|prev/i.test(label(b)));
    const next=nav&&[...nav.querySelectorAll('button')].find(b=>/下一页|next/i.test(label(b)));
    const summary=text(area?.querySelector('p'))||'记录分页';
    const sig=JSON.stringify([!!nav,summary,prev?.disabled,next?.disabled,text(nav)]);
    if(sig===pagerStamp)return;pagerStamp=sig;pager.replaceChildren();pager.hidden=!nav;if(!nav)return;
    function step(isNext){beforeAction();const live=nativePagers()[0];const target=live&&[...live.querySelectorAll('button')].find(b=>(isNext?/下一页|next/i:/上一页|previous|prev/i).test(label(b)));if(target&&!target.disabled)target.click();}
    const left=button('上一页','chevron',()=>step(false),'s2wc-page-button');left.disabled=!prev||prev.disabled;
    const right=button('下一页','chevron',()=>step(true),'s2wc-page-button');right.disabled=!next||next.disabled;
    const info=document.createElement('span');info.textContent=summary;info.className='s2wc-page-info';
    const size=button('每页 / 跳页','settings',()=>{beforeAction();const live=nativePagers()[0];open(live?.parentElement?.parentElement);},'s2wc-page-button');
    pager.append(left,info,right,size);
  }
  function syncTabs(){
    const main=getContext().main;
    const sources=[...main.querySelectorAll('[data-testid="usage-detail-tab"],[role="tab"]')].filter(active);
    const state=b=>b.getAttribute('aria-selected')==='true'||[...b.classList].some(c=>/^border-primary-\d+$/.test(c)||c==='active');
    const sig=JSON.stringify(sources.map(b=>[label(b),state(b),b.disabled]));if(sig===tabStamp)return;tabStamp=sig;tabs.replaceChildren();
    for(const source of sources){const name=label(source);const item=button(name,'grid',()=>{beforeAction();[...getContext().main.querySelectorAll('[data-testid="usage-detail-tab"],[role="tab"]')].find(b=>label(b)===name&&active(b))?.click();},'s2wc-native-tab');item.disabled=source.disabled;item.setAttribute('aria-pressed',String(state(source)));tabs.append(item);}
  }
  function sortHeaders(){return [...getContext().main.querySelectorAll('thead th[aria-sort]')].filter(e=>active(e)&&!e.closest('.s2wc-chart-hidden'));}
  function syncSort(){
    const headers=sortHeaders();const sig=JSON.stringify(headers.map(e=>[text(e),e.getAttribute('aria-sort')]));if(sig===sortStamp)return;sortStamp=sig;sort.replaceChildren();sort.hidden=!headers.length;if(!headers.length)return;
    const select=document.createElement('select');select.setAttribute('aria-label','排序字段');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='排序…';select.append(placeholder);
    for(const h of headers){const item=document.createElement('option');item.value=text(h);item.textContent=text(h);item.selected=['ascending','descending'].includes(h.getAttribute('aria-sort'));select.append(item);}
    select.onchange=()=>{beforeAction();sortHeaders().find(h=>text(h)===select.value)?.click();};sort.append(select);
    const current=headers.find(h=>['ascending','descending'].includes(h.getAttribute('aria-sort')));
    if(current){const name=text(current);const direction=button(current.getAttribute('aria-sort')==='ascending'?'升序':'降序','chevron',()=>{beforeAction();sortHeaders().find(h=>text(h)===name)?.click();},'s2wc-page-button');sort.append(direction);}
  }
  function sync(records){
    const {main}=getContext();if(!main)return;scanCharts(main);
    const liveRows=new Set(records.map(r=>r.row));
    for(const old of markedRows)if(!liveRows.has(old)){old.classList.remove('s2wc-tool-record');markedRows.delete(old);}
    for(const row of liveRows){if(!row.classList.contains('s2wc-tool-record'))row.classList.add('s2wc-tool-record');markedRows.add(row);}
    const staticCards=new Set([...main.querySelectorAll('.card')].filter(e=>!e.querySelector('button,input,select,textarea,a,table,[data-field]')&&!e.classList.contains('s2wc-tool-record')));
    for(const old of markedStatic)if(!staticCards.has(old)){old.classList.remove('s2wc-tools-static');markedStatic.delete(old);}
    for(const el of staticCards){if(!el.classList.contains('s2wc-tools-static'))el.classList.add('s2wc-tools-static');markedStatic.add(el);}
    if(focusRow&&!main.contains(focusRow))clearFocus();
    syncTabs();syncPager();syncSort();inline.sync();
    if(inline.hasControls())getContext().frame.removeAttribute('aria-hidden');
    const checked=records.filter(r=>r.row.querySelector('input[type="checkbox"]:checked')).length;
    const value=checked?`已选 ${checked} 项`:'';if(value!==selectionStamp){selectionStamp=value;selectedInfo.textContent=value;}
  }
  function restore(){inline.restore();clearFocus();for(const set of [markedCharts,markedRows,markedStatic]){for(const e of set)e.classList.remove('s2wc-chart-hidden','s2wc-tool-record','s2wc-tools-static');set.clear();}}
  function recordRoot(){const main=getContext().main;return main.querySelector('[data-testid="usage-detail-tab"]')?.closest('.card')||main;}
  return {sync,open,restore,clearFocus,active,scanCharts,recordRoot,attachSearch:inline.attachSearch,refreshLayout:inline.schedule,hasInline:inline.hasControls,hasChart:e=>e.matches('.s2wc-chart-hidden')||!!e.closest('.s2wc-chart-hidden')};
}
