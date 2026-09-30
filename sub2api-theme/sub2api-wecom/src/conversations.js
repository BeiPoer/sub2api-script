/* Read the public rendered DOM; keep Vue's nodes and event handlers intact. */
function createConversationUI({ shell, icon, button, getContext, refresh }) {
  const root = document.documentElement;
  const avatar = createAvatarRenderer();
  let selected = '', currentPath = '', currentFingerprint = '', listFingerprint = '';
  let pageQuery='', blocks=[], nativeFiltered=new Set(), bulkGuards=new Map();
  let records = [], routes = [], notes = new Map(), draftByThread = new Map(), nativeOrigin, priorAria = new Map(), pendingModal, modalTimer;
  let nativeTools;
  let cancelAccountTest;
  const accountPage=()=>/^\/admin\/accounts\/?$/.test(location.pathname);
  const moreAction=name=>/^(更多(?:操作)?|more(?: actions?)?)$/i.test(name);
  const testAction=name=>/^(测试(?:连接)?|test(?: connection)?)$/i.test(name);
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const node = (tag, cls, value) => { const e = document.createElement(tag); e.className = cls; if (value !== undefined) e.textContent = value; return e; };
  const labelOf = e => e.getAttribute('aria-label') || e.getAttribute('title') || text(e);
  const linkPath = el => el.hasAttribute('href') ? new URL(el.getAttribute('href'), location.href).pathname : '';
  const sidebarItems = () => [...getContext().sidebar.querySelectorAll('.sidebar-nav a[href], .sidebar-nav button.sidebar-link')];
  const mobileFields = row => [...row.querySelectorAll('[data-field]')].map(e => ({key:e.dataset.field,label:text(e.firstElementChild),value:text(e.lastElementChild)}));
  function plainValue(el) {
    const copy=el.cloneNode(true);
    copy.querySelectorAll('button').forEach(e=>e.replaceWith(document.createTextNode(text(e)+' ')));
    copy.querySelectorAll('svg,input,select,textarea,canvas,.s2wc-chart-hidden,[role="tooltip"],.sr-only').forEach(e=>e.remove());
    copy.querySelectorAll('span,div,p,small,br,li').forEach(e=>e.append(document.createTextNode(' ')));
    return text(copy);
  }
  function readRecords(main) {
    main=nativeTools.recordRoot()||main;
    const result=[];
    for (const table of main.querySelectorAll('table')) {
      if(!nativeTools.active(table)||nativeTools.hasChart(table))continue;
      const headers=[...table.querySelectorAll('thead th')].map(text);
      for (const row of table.querySelectorAll('tbody tr:not([aria-hidden="true"])')) {
        const cells=[...row.querySelectorAll(':scope > td')];
        if (cells.length < 2 || cells.some(c=>c.colSpan>1) || row.querySelector('.animate-pulse')) continue;
        const fields=cells.map((c,i)=>({key:c.dataset.field || '',label:headers[i] || '',value:plainValue(c)})).filter(f=>f.label && f.value && !/^(操作|actions?)$/i.test(f.label));
        addRecord(row,fields,result);
      }
    }
    // DataTable.vue uses labelled cards below 1024px instead of a table.
    if (!result.length) {
      const rows=new Set([...main.querySelectorAll('[data-field]')].filter(e=>nativeTools.active(e)&&!nativeTools.hasChart(e)).map(e=>e.parentElement.parentElement));
      for (const row of rows) { const fields=mobileFields(row); if(fields.length>1) addRecord(row,fields,result); }
    }
    return result;
  }
  function addRecord(row,fields,result) {
    const named=fields.find(f=>/^(名称|账号名称|用户名|用户名称|姓名|name|username)$/i.test(f.label)) || fields.find(f=>/邮箱|email/i.test(f.label)) || fields.find(f=>!/^(id|账号id|用户id|选择)$/i.test(f.label));
    const name=(named?.value || `记录 ${result.length+1}`).slice(0,100);
    const id=row.dataset.rowKey||fields.find(f=>/^(id|记录id|账号id|用户id|请求id)$/i.test(f.label))?.value||fields.find(f=>/^(时间|time|created at)$/i.test(f.label))?.value;
    const key=`record:${location.pathname}:${id || name}:${result.filter(r=>r.name===name).length}`;
    result.push({key,name,row,fields,group:false,summary:fields.filter(f=>f!==named).slice(0,3).map(f=>f.value).join(' · ')});
  }
  function readBlocks(main) {
    const monitorPage=/^\/monitor\/?$/.test(location.pathname);
    if(monitorPage){
      const summary=main.querySelector('section.py-3');
      const channelCards=[...main.querySelectorAll('.grid button.group')];
      const monitorBlocks=[...(summary?[summary]:[]),...channelCards].map((e,i)=>{
        const copy=e.cloneNode(true);
        const timeline=copy.querySelector('[class*="items-end"][class*="h-5"]');
        if(timeline){
          const marks=[...timeline.children].filter(bar=>bar.title).map(bar=>bar.classList.contains('bg-emerald-500')?'✔':bar.classList.contains('bg-amber-500')?'⭕':bar.classList.contains('bg-red-500')?'×':'');
          timeline.textContent=marks.join('');
        }
        for(const badge of copy.querySelectorAll('[class*="bg-emerald-100"],[class*="bg-amber-100"],[class*="bg-red-100"]')){
          badge.textContent=badge.classList.contains('bg-emerald-100')?'✔':badge.classList.contains('bg-amber-100')?'⭕':'×';
        }
        return {key:`monitor:${i}`,name:e===summary?'渠道状态':text(e.querySelector('strong,[class*="font-semibold"]'))||`渠道 ${i}`,body:(copy.innerText||plainValue(copy)).trim().slice(0,2000),source:e};
      }).filter(e=>e.body);
      if(monitorBlocks.length)return monitorBlocks;
    }
    let cards=[...main.querySelectorAll('.card, .glass-card, .card-glass')].filter(e=>!e.closest('.table-page-layout') && !e.parentElement.closest('.card,.glass-card,.card-glass'));
    if(!cards.length)cards=[...main.querySelectorAll('[role="list"] > [role="listitem"],ul > li,.grid > article')].filter(e=>!e.closest('nav,table,[role="dialog"]'));
    if(!cards.length && !main.querySelector('table,[data-field],.table-page-layout')) cards=[...main.children];
    return cards.filter(e=>nativeTools.active(e)&&!nativeTools.hasChart(e)&&!e.querySelector('table,[data-field],input,select,textarea,.select-trigger')).map((e,i)=>({key:`block:${i}`,name:text(e.querySelector('h2,h3,h4,p,strong,[class*="font-semibold"]')) || `信息 ${i+1}`,body:plainValue(e).slice(0,2000),source:e})).filter(e=>e.body);
  }
  const list=node('section','s2wc-im-list'); list.setAttribute('aria-label','会话列表');
  list.innerHTML=`<div class="s2wc-im-list-head"><label class="s2wc-im-search">${icon('search')}<input type="search" aria-label="搜索菜单" placeholder="搜索菜单"></label><button class="s2wc-im-add" type="button" aria-label="打开应用目录">＋</button></div><div class="s2wc-im-list-caption">应用会话</div><div class="s2wc-im-conversations" role="list"></div><div class="s2wc-im-list-foot"></div>`;
  const chat=node('section','s2wc-im-chat');chat.setAttribute('aria-label','会话内容');
  chat.innerHTML=`<header class="s2wc-im-chat-head"><button class="s2wc-im-back" type="button" aria-label="返回会话列表">‹</button><div class="s2wc-im-heading"><div class="s2wc-im-title-row"><h1></h1><span class="s2wc-im-count"></span></div><p></p></div><div class="s2wc-im-chat-actions"></div></header><div class="s2wc-im-stream" tabindex="0" aria-label="管理信息对话流"></div><form class="s2wc-im-composer"><div class="s2wc-im-tools"></div><textarea aria-label="本地会话备注" placeholder="输入本地备注…"></textarea><div class="s2wc-im-compose-footer"><span>备注仅保留在当前页面，不会发送给任何人</span><button type="submit" disabled>发送<span> ↵</span></button></div></form>`;
  const nativeBar=node('div','s2wc-im-native-bar');nativeBar.append(node('strong','','详细操作'));
  nativeBar.append(button('返回会话','close',closeNative,'s2wc-im-tool'));
  shell.append(list,chat,nativeBar);
  const pageSearch=createPageSearch('当前列表搜索');
  const nativeSearch=createPageSearch('原页面列表搜索');
  chat.querySelector('.s2wc-im-chat-head').after(pageSearch);
  nativeBar.insertBefore(nativeSearch,nativeBar.lastElementChild);
  const listBody=list.querySelector('.s2wc-im-conversations'), stream=chat.querySelector('.s2wc-im-stream'), input=list.querySelector('input'), composer=chat.querySelector('textarea'), send=chat.querySelector('[type="submit"]');
  listBody.setAttribute('role','navigation'); listBody.setAttribute('aria-label','菜单会话');
  nativeTools=createNativeTools({shell,chat,bar:nativeBar,getContext,button,beforeAction:()=>{if(selected)choose('');if(pageQuery)setPageQuery('');}});
  nativeTools.attachSearch(pageSearch);
  const normalize=value=>value.normalize('NFKC').toLocaleLowerCase();
  const matchesQuery=(value,query)=>normalize(query).split(/\s+/).filter(Boolean).every(word=>normalize(value).includes(word));
  const recordText=r=>[r.name,...r.fields.map(f=>`${f.label} ${f.value}`)].join(' ');
  function isRecordView(){
    const area=nativeTools.recordRoot();
    return !!area&&(!!area.querySelector('.table-page-layout,[data-testid="usage-detail-tab"],[data-field]')||[...area.querySelectorAll('table')].some(t=>nativeTools.active(t)&&!nativeTools.hasChart(t)));
  }
  function createPageSearch(label){
    const form=node('form','s2wc-im-page-search');form.setAttribute('role','search');form.setAttribute('aria-label',label);
    form.innerHTML=`<label>${icon('search')}<input type="search" placeholder="搜索当前列表：名称、ID、邮箱…" autocomplete="off"><button type="button" class="s2wc-im-search-clear" aria-label="清空列表搜索">×</button></label><span class="s2wc-im-search-count" role="status" aria-live="polite"></span><button type="button" class="s2wc-im-native-search-link" title="使用原页面的搜索功能，范围由原页面决定">原页搜索</button>`;
    const field=form.querySelector('input');field.setAttribute('aria-label',label);
    field.addEventListener('input',()=>setPageQuery(field.value));
    field.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setPageQuery('');}});
    form.querySelector('.s2wc-im-search-clear').onclick=()=>{setPageQuery('');field.focus();};
    form.querySelector('.s2wc-im-native-search-link').onclick=()=>{
      const target=findNativeSearch();if(!target)return;
      const value=pageQuery;setPageQuery('');openNative(target);target.focus();
      if(value){
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
        if(setter)setter.call(target,value);else target.value=value;
        target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));
        target.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}));
      }
    };
    form.onsubmit=e=>{e.preventDefault();setPageQuery(field.value);};
    return form;
  }
  function findNativeSearch(){
    return [...getContext().main.querySelectorAll('input')].find(e=>{
      if(e.disabled||e.readOnly||!['text','search'].includes(e.type)||e.closest('table,[data-field],[role="dialog"],.hidden,[hidden]'))return false;
      return e.type==='search'||/搜索|search|关键词|关键字/i.test([e.placeholder,e.getAttribute('aria-label'),e.name].join(' '));
    });
  }
  function setPageQuery(value){
    if(selected&&value.trim()){draftByThread.set(currentThread(),composer.value);selected='';composer.value=draftByThread.get(currentThread())||'';send.disabled=!composer.value.trim();}
    pageQuery=value;currentFingerprint='';listFingerprint='';update();
  }
  function clearBulkGuards(){
    for(const [el,aria] of bulkGuards){el.classList.remove('s2wc-search-bulk-guard');if(aria===null)el.removeAttribute('aria-disabled');else el.setAttribute('aria-disabled',aria);}
    bulkGuards.clear();
  }
  function clearNativeFiltering(){for(const el of nativeFiltered)el.classList.remove('s2wc-search-filtered');nativeFiltered.clear();clearBulkGuards();}
  for(const name of ['click','keydown'])document.addEventListener(name,e=>{
    if(name==='keydown'&&!['Enter',' '].includes(e.key))return;
    if(e.target.closest?.('.s2wc-search-bulk-guard')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  function syncPageSearch(){
    const dataset=isRecordView()?records:blocks;
    const match=r=>matchesQuery(r.fields?recordText(r):`${r.name} ${r.body}`,pageQuery);
    const count=dataset.filter(match).length;
    for(const form of [pageSearch,nativeSearch]){
      const field=form.querySelector('input');if(field.value!==pageQuery)field.value=pageQuery;
      const info=`已加载 ${count} / ${dataset.length} 项`;
      const status=form.querySelector('.s2wc-im-search-count');if(status.textContent!==info)status.textContent=info;
      const clear=form.querySelector('.s2wc-im-search-clear');clear.hidden=!pageQuery;
      form.querySelector('.s2wc-im-native-search-link').hidden=!findNativeSearch();
    }
    const hidden=new Set(pageQuery.trim()?dataset.filter(r=>!match(r)).map(r=>r.row||r.source):[]);
    for(const el of nativeFiltered)if(!hidden.has(el))el.classList.remove('s2wc-search-filtered');
    for(const el of hidden)if(!el.classList.contains('s2wc-search-filtered'))el.classList.add('s2wc-search-filtered');
    nativeFiltered=hidden;
    // Visual DOM filtering cannot redefine Vue's backend-wide selection model.
    // Keep individual editing available; prevent bulk actions on invisible records.
    const guards=new Set(hidden.size?[...getContext().main.querySelectorAll('table input[type="checkbox"],[data-test="select-row"],[data-test="select-all-mobile"],button')].filter(e=>e.tagName==='INPUT'||/批量|全选|bulk|batch|select all/i.test(labelOf(e))):[]);
    for(const [el,aria] of bulkGuards)if(!guards.has(el)){el.classList.remove('s2wc-search-bulk-guard');if(aria===null)el.removeAttribute('aria-disabled');else el.setAttribute('aria-disabled',aria);bulkGuards.delete(el);}
    for(const el of guards){if(!bulkGuards.has(el))bulkGuards.set(el,el.getAttribute('aria-disabled'));if(!el.classList.contains('s2wc-search-bulk-guard'))el.classList.add('s2wc-search-bulk-guard');if(el.getAttribute('aria-disabled')!=='true')el.setAttribute('aria-disabled','true');}
    nativeSearch.title=guards.size?'本地筛选期间，批量操作需先清空搜索或使用原页搜索。':'';
    const status=nativeSearch.querySelector('.s2wc-im-search-count');
    const info=`已加载 ${count} / ${dataset.length} 项${guards.size?' · 批量操作需清空搜索':''}`;
    if(status.textContent!==info)status.textContent=info;
  }
  function currentThread(){return selected || `group:${location.pathname}`;}
  function choose(key) {
    draftByThread.set(currentThread(),composer.value);selected=key;
    composer.value=draftByThread.get(currentThread())||'';send.disabled=!composer.value.trim();
    root.classList.add('s2wc-im-topic-open'); currentFingerprint=''; update();
  }
  function openNative(source) {
    nativeOrigin=document.activeElement;
    nativeTools.open(source,records.some(r=>r.row===source));
  }
  function closeNative(){nativeTools.clearFocus();root.classList.remove('s2wc-native-open');if(!nativeTools.hasInline())getContext().frame?.setAttribute('aria-hidden','true');nativeTools.refreshLayout();if(nativeOrigin?.isConnected)nativeOrigin.focus();}
  function invoke(source,{modal=false}={}) {
    if(!source?.isConnected || source.disabled)return;
    clearTimeout(modalTimer);pendingModal=null;
    if(!modal)openNative(source);
    else pendingModal={source,autoOpened:false};
    source.click();
    if(modal) modalTimer=setTimeout(()=>{if(pendingModal){pendingModal.autoOpened=true;openNative(source);}},1500);
  }
  chat.querySelector('.s2wc-im-back').onclick=()=>root.classList.remove('s2wc-im-topic-open');
  const actions=chat.querySelector('.s2wc-im-chat-actions');
  actions.append(button('会话内查找','search',()=>{pageSearch.querySelector('input').focus();pageSearch.querySelector('input').select();},'s2wc-im-tool'));
  actions.append(button('显示工具栏','panel',()=>openNative(),'s2wc-im-tool'));
  list.querySelector('.s2wc-im-add').onclick=()=>{input.value='';listFingerprint='';update();input.focus();};
  input.oninput=()=>{listFingerprint='';renderList();};
  composer.oninput=()=>{send.disabled=!composer.value.trim();draftByThread.set(currentThread(),composer.value);};
  composer.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();chat.querySelector('.s2wc-im-composer').requestSubmit();}};
  chat.querySelector('.s2wc-im-composer').onsubmit=e=>{
    e.preventDefault();const value=composer.value.trim();if(!value)return;
    if(value.startsWith('/查找 ')){setPageQuery(value.slice(4).trim());}
    else {const key=currentThread();if(!notes.has(key))notes.set(key,[]);notes.get(key).push({body:value,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});currentFingerprint='';}
    composer.value='';draftByThread.set(currentThread(),'');send.disabled=true;update();stream.scrollTop=stream.scrollHeight;
  };
  function renderList() {
    const {category}=getContext(); const query=input.value.trim().toLowerCase();
    // Navigation is exclusively sourced from the native sidebar, never business rows.
    // Keep the native menu order and keep data search independent from menu search.
    const visible=routes.filter(r=>(category==='all'||r.kind===category)&&matchesQuery(`${r.name} ${r.path}`,query));
    const fingerprint=JSON.stringify([location.pathname,query,category,visible.map(r=>[r.key,r.name,r.summary])]);
    if(fingerprint===listFingerprint)return;listFingerprint=fingerprint;
    const scroll=listBody.scrollTop;listBody.replaceChildren();
    for(const r of visible){
      const b=node('button','s2wc-im-conv');b.type='button';b.dataset.key=r.key;b.setAttribute('aria-label',`群聊：${r.name}`);
      const isActive=r.path===location.pathname;
      b.classList.toggle('is-active',!!isActive);if(isActive)b.setAttribute('aria-current','true');
      b.append(avatar(r.name,r.groupAvatar,'',r.key));
      const info=node('span','s2wc-im-conv-info'),top=node('span','s2wc-im-conv-top');
      top.append(node('span','s2wc-im-conv-name',r.name),node('small','s2wc-im-conv-time',r.group?'群聊':''));
      info.append(top,node('span','s2wc-im-conv-summary',r.summary||'点击查看管理信息'));b.append(info);
      b.onclick=()=>{
        const source=sidebarItems().find(e=>r.path?linkPath(e)===r.path:text(e)+'群'===r.name);if(!source)return;
        if(source.tagName==='BUTTON'){source.click();refresh();}
        else if(r.path===location.pathname)choose('');
        else{draftByThread.set(currentThread(),composer.value);root.classList.add('s2wc-im-topic-open');source.click();}
      };
      listBody.append(b);
    }
    if(!visible.length)listBody.append(node('p','s2wc-im-empty','没有找到菜单项'));
    listBody.scrollTop=scroll;
    list.querySelector('.s2wc-im-list-foot').textContent=`${visible.length} 个菜单会话`;
  }
  function message(name,body,{mine=false,group=false,identity=name}={}){
    const row=node('article',`s2wc-im-message ${mine?'is-mine':''}`),content=node('div','s2wc-im-message-content');
    row.append(avatar(name,group,'is-message',identity));content.append(node('div','s2wc-im-sender',name));
    const bubble=node('div','s2wc-im-bubble');if(typeof body==='string')bubble.textContent=body;else bubble.append(body);
    content.append(bubble);row.append(content);return {row,content,bubble};
  }
  function actionsFor(record){return [...record.row.querySelectorAll('button,a')].filter(b=>labelOf(b)&&!/复制|copy/i.test(labelOf(b)));}
  function clickAccountMenu(source,anchor){
    if(!source?.isConnected||source.disabled||source.getAttribute('aria-disabled')==='true')return;
    // The native menu reads currentTarget's rectangle synchronously. Anchor it to
    // the visible action without moving/replacing its Vue-owned trigger.
    const rect=anchor.getBoundingClientRect(),style=source.getAttribute('style');
    try{
      for(const [key,value] of Object.entries({position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,margin:'0',transform:'none'}))source.style.setProperty(key,value,'important');
      source.click();
    }finally{if(style===null)source.removeAttribute('style');else source.setAttribute('style',style);}
  }
  function testAccount(key,anchor){
    cancelAccountTest?.();
    const record=records.find(r=>r.key===key),trigger=record&&actionsFor(record).find(b=>moreAction(labelOf(b)));
    if(!trigger||trigger.disabled||trigger.getAttribute('aria-disabled')==='true')return;
    // Close any previous account menu before waiting for this account's menu.
    const previous=new Set(document.querySelectorAll('.action-menu-content'));
    if(previous.size)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    const status=node('span','s2wc-account-test-status','正在打开测试…');status.setAttribute('role','status');anchor.after(status);
    const path=location.pathname;
    let timer,done=false;
    const finish=()=>{done=true;observer.disconnect();clearTimeout(timer);anchor.disabled=false;if(cancelAccountTest===finish)cancelAccountTest=null;status.textContent='';};
    const inspect=()=>{
      if(done)return;
      if(path!==location.pathname||!trigger.isConnected||!root.classList.contains('s2wc')){finish();return;}
      const menu=[...document.querySelectorAll('.action-menu-content')].find(e=>!previous.has(e)&&!e.hidden&&getComputedStyle(e).display!=='none');
      const target=menu&&[...menu.querySelectorAll('button')].find(b=>testAction(labelOf(b)));
      if(!target)return;
      const disabled=target.disabled||target.getAttribute('aria-disabled')==='true';
      finish();
      if(disabled){status.textContent='当前账号暂不可测试';return;}
      target.click();refresh();
    };
    const observer=new MutationObserver(inspect);cancelAccountTest=finish;anchor.disabled=true;
    observer.observe(document.body,{childList:true,subtree:true});
    timer=setTimeout(()=>{finish();status.textContent='未找到测试入口，请从“更多”菜单选择测试连接';},1500);
    queueMicrotask(()=>{if(!done){clickAccountMenu(trigger,anchor);queueMicrotask(inspect);}});
  }
  function renderChat(title,blocks) {
    const recordView=isRecordView();
    const picked=records.find(r=>r.key===selected); const ownNotes=notes.get(currentThread())||[];
    const visible=(picked?[picked]:records).filter(r=>matchesQuery(recordText(r),pageQuery));
    const visibleBlocks=blocks.filter(b=>matchesQuery(`${b.name} ${b.body}`,pageQuery));
    const visibleNotes=ownNotes.filter(n=>matchesQuery(n.body,pageQuery));
    const fingerprint=JSON.stringify([location.pathname,selected,title,pageQuery,recordView,visible.map(r=>[r.key,r.fields,r.row.querySelector('input[type="checkbox"]')?.checked,actionsFor(r).map(b=>[labelOf(b),b.disabled,b.getAttribute('aria-checked'),b.getAttribute('aria-pressed')])]),visibleBlocks.map(b=>b.body),visibleNotes]);
    if(fingerprint===currentFingerprint)return;
    const previousScroll=stream.scrollTop;const changed=chat.dataset.thread!==currentThread();chat.dataset.thread=currentThread();currentFingerprint=fingerprint;
    chat.querySelector('h1').textContent=picked?picked.name:`${title}群`;
    chat.querySelector('.s2wc-im-count').textContent=picked?'':`（${recordView?records.length:blocks.length}）`;
    chat.querySelector('.s2wc-im-heading p').textContent=picked?`${title} · 联系人资料`:`${title} · 当前页面信息`;
    stream.replaceChildren();
    if(recordView&&visibleBlocks.length&&!picked){
      const summary=node('details','s2wc-stat-summary');summary.append(node('summary','','会话摘要'));
      for(const b of visibleBlocks)summary.append(node('p','',b.body));stream.append(summary);
    }
    if(visible.length){
      for(const r of visible){
        const details=node('div','s2wc-im-record');
        const primary=r.fields.filter(f=>!/名称|username|^name$/i.test(f.label));
        const priorities=/\/usage(?:\/|$)/.test(location.pathname)?['模型','Token','费用','延迟','时间','用户','状态码','响应内容','类型']:[];
        const ordered=priorities.length?[...primary].sort((a,b)=>(priorities.indexOf(a.label)<0?99:priorities.indexOf(a.label))-(priorities.indexOf(b.label)<0?99:priorities.indexOf(b.label))):primary;
        const showFields=picked||accountPage()?primary:ordered.slice(0,5);
        const fields=node('dl','s2wc-im-fields');
        for(const f of showFields){const pair=node('div','s2wc-im-field');pair.append(node('dt','',f.label),node('dd','',f.value));fields.append(pair);}
        details.append(fields);
        const msg=message(r.name,details,{identity:r.key}); const tools=node('div','s2wc-im-message-actions');
        const nativeCheck=r.row.querySelector('input[type="checkbox"]');
        if(nativeCheck){
          const control=node('label','s2wc-record-selector');const check=document.createElement('input');check.type='checkbox';check.checked=nativeCheck.checked;check.disabled=nativeCheck.disabled||nativeCheck.classList.contains('s2wc-search-bulk-guard');check.setAttribute('aria-label',`选择记录：${r.name}`);
          check.onchange=()=>{const live=records.find(item=>item.key===r.key)?.row.querySelector('input[type="checkbox"]');if(live&&!live.disabled&&!live.classList.contains('s2wc-search-bulk-guard'))live.click();refresh();};control.append(check,document.createTextNode('选择'));tools.append(control);
        }
        if(!picked&&!accountPage()){const more=button('查看资料','users',()=>choose(r.key),'s2wc-im-inline');tools.append(more);}
        const offered=new Set();
        for(const action of actionsFor(r)){
          const name=labelOf(action);if(offered.has(name)||name.length>60||(!accountPage()&&moreAction(name)))continue;offered.add(name);
          const actionButton=button(name,/删除|delete|移除|撤销/i.test(name)?'close':'settings',()=>{
            const live=records.find(item=>item.key===r.key);if(!live)return;
            const target=actionsFor(live).find(b=>labelOf(b)===name);if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
            if(accountPage()){
              if(moreAction(name))clickAccountMenu(target,actionButton);
              else target.click();
              refresh();return;
            }
            // Open the original record surface for inline menus, links, and switches.
            if(/编辑|edit|详情|detail|查看|测试|test/i.test(name))invoke(target,{modal:true});
            else{openNative(live.row);target.click();}
          },`s2wc-im-inline${/删除|delete|移除|撤销/i.test(name)?' s2wc-row-action-danger':''}`);
          actionButton.disabled=action.disabled||action.getAttribute('aria-disabled')==='true';tools.append(actionButton);
        }
        if(accountPage()){
          const menu=actionsFor(r).find(b=>moreAction(labelOf(b)));
          if(menu&&!actionsFor(r).some(b=>testAction(labelOf(b)))){
            const test=button('测试','play',()=>testAccount(r.key,test),'s2wc-im-inline');test.disabled=menu.disabled||menu.getAttribute('aria-disabled')==='true';tools.prepend(test);
          }
        }else tools.append(button('更多操作','chevron',()=>openNative(records.find(item=>item.key===r.key)?.row),'s2wc-im-inline'));
        msg.content.append(tools);stream.append(msg.row);
      }
    }else if(visibleBlocks.length && !recordView){
      for(const b of visibleBlocks){const msg=message(b.name,b.body);if(b.source.matches('button,a,input,select,textarea')||b.source.querySelector('button,input,select,textarea,a'))msg.content.append(button('打开操作','panel',()=>openNative(b.source),'s2wc-im-inline'));stream.append(msg.row);}
    }else if(pageQuery.trim()){
      stream.append(node('p','s2wc-im-empty','当前已加载内容中没有匹配项。可清空搜索，或通过原页搜索、分页查找其他数据。'));
    }else if(recordView){
      const loading=nativeTools.recordRoot().querySelector('.animate-pulse,.animate-spin,[aria-busy="true"]');
      stream.append(node('p','s2wc-im-empty',loading?'正在读取记录…':'当前筛选条件下暂无记录'));
    }else {
      const main=getContext().main;
      const status=plainValue(main).slice(0,350);
      stream.append(message(title,status || '正在读取当前页面的信息…',{group:true,identity:`group:${location.pathname}`}).row);
    }
    for(const note of visibleNotes){const msg=message(getContext().user||'我',note.body,{mine:true,identity:'self'});msg.content.append(node('div','s2wc-im-note-meta',`${note.time} · 本地备注`));stream.append(msg.row);}
    const tools=chat.querySelector('.s2wc-im-tools');tools.replaceChildren();
    tools.append(button('显示工具栏','settings',()=>openNative(),'s2wc-im-tool'));
    const create=[...getContext().main.querySelectorAll('button')].find(b=>/添加|创建|新建|add |create /i.test(labelOf(b))&&!b.closest('tbody,[data-field]'));
    if(create)tools.append(button(labelOf(create),'users',()=>invoke([...getContext().main.querySelectorAll('button')].find(b=>labelOf(b)===labelOf(create)&&!b.closest('tbody,[data-field]')),{modal:true}),'s2wc-im-tool'));
    const refreshButton=[...getContext().main.querySelectorAll('button')].find(b=>/^(刷新|refresh)$/i.test(labelOf(b)));
    if(refreshButton)tools.append(button('刷新','restore',()=>[...getContext().main.querySelectorAll('button')].find(b=>/^(刷新|refresh)$/i.test(labelOf(b)))?.click(),'s2wc-im-tool'));
    const hint=node('span','s2wc-im-composer-target',picked?`当前联系人：${picked.name}`:`当前群聊：${title}`);tools.append(hint);
    if(changed)stream.scrollTop=0;else stream.scrollTop=previousScroll;
  }
  function update(){
    const {sidebar,header,frame,main,category,user,classify}=getContext();
    if(!main)return;
    nativeTools.scanCharts(main);
    const selfAvatar=shell.querySelector('.s2wc-avatar');
    if(selfAvatar&&!selfAvatar.querySelector('img'))selfAvatar.replaceChildren(...avatar(user||'我',false,'','self').childNodes);
    if(pendingModal){
      const dialog=[...document.querySelectorAll('[role="dialog"],dialog[open]')].find(e=>!e.closest('#s2wc-shell')&&e.id!=='s2wc-palette'&&getComputedStyle(e).display!=='none');
      if(dialog){clearTimeout(modalTimer);if(pendingModal.autoOpened){root.classList.remove('s2wc-native-open');frame.setAttribute('aria-hidden','true');}pendingModal=null;}
    }
    if(!priorAria.has(frame))priorAria.set(frame,frame.getAttribute('aria-hidden'));
    if(!root.classList.contains('s2wc-native-open')&&frame.getAttribute('aria-hidden')!=='true')frame.setAttribute('aria-hidden','true');
    if(currentPath!==location.pathname){nativeTools.clearFocus();clearNativeFiltering();pageQuery='';currentPath=location.pathname;selected='';currentFingerprint='';listFingerprint='';composer.value=draftByThread.get(currentThread())||'';send.disabled=!composer.value.trim();input.value='';root.classList.remove('s2wc-native-open');}
    const title=text(header.querySelector('h1'))||text(sidebar.querySelector('.sidebar-link-active'))||'管理工作台';
    records=readRecords(main).map(r=>({...r,kind:classify(location.pathname)}));
    nativeTools.sync(records);
    blocks=readBlocks(main);
    if(selected&&!records.some(r=>r.key===selected))selected='';
    routes=sidebarItems().map((source,index)=>{const path=linkPath(source),name=text(source);return {key:`group:${path||name}`,name:`${name}群`,summary:`${name} · ${source.tagName==='BUTTON'?'展开子菜单':path===location.pathname?'当前会话':'点击进入'}`,source,path,group:true,groupAvatar:index%3!==1,kind:path?classify(path):/渠道|channel/i.test(name)?'services':'finance'};});
    syncPageSearch();renderList();renderChat(title,blocks);
  }
  function deactivate(){
    cancelAccountTest?.();
    nativeTools.restore();
    clearNativeFiltering();
    clearTimeout(modalTimer);pendingModal=null;
    root.classList.remove('s2wc-native-open','s2wc-im-topic-open');
    for(const [el,value] of priorAria){if(value===null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',value);}priorAria.clear();
  }
  // Native Vue mutations refresh the bridge. The new conversation DOM is ignored by its observer.
  return {update,deactivate,openNative};
}
