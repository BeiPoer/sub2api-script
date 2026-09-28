import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
let JSDOM;
try { ({ JSDOM } = createRequire(import.meta.url)('jsdom')); }
catch { ({ JSDOM } = createRequire(new URL('../../../sub2api/frontend/package.json', import.meta.url))('jsdom')); }
const script = await readFile(new URL('../sub2api-wecom.user.js', import.meta.url), 'utf8');
const fixture = `<div id="app"><div class="app-layout"><aside class="sidebar w-64"><div class="sidebar-header"><span class="sidebar-brand-title">Test Workspace</span></div><nav class="sidebar-nav"><div class="sidebar-section"><a class="sidebar-link" href="/admin/dashboard">仪表盘</a><a class="sidebar-link" href="/admin/users">用户管理</a><a class="sidebar-link" href="/admin/accounts">账号管理</a><button class="sidebar-link" id="channels">渠道管理</button><a class="sidebar-link" href="/admin/settings">系统设置</a></div><div class="sidebar-section"><a class="sidebar-link" href="/profile">个人资料</a></div></nav><div class="mt-auto"><button id="native-theme">深色模式</button></div></aside><div><header><button><div class="text-left"><div class="text-sm">管理员</div></div></button></header><main><input id="original-input" value="draft"><button id="business-button">保存</button></main></div></div></div>`;
const settle = async (window) => { await new Promise(r => window.setTimeout(r, 55)); };
function boot(path='/admin/accounts', html=fixture, stored=null, avatarSeed=null) {
  const dom = new JSDOM(`<!doctype html><html data-skin="editorial"><body>${html}</body></html>`, { url:`https://example.test${path}`,runScripts:'outside-only',pretendToBeVisual:true });
  const w = dom.window; let menu;
  w.HTMLDialogElement.prototype.showModal = function(){ this.open=true; };
  w.HTMLDialogElement.prototype.close = function(){ this.open=false; this.dispatchEvent(new w.Event('close')); };
  w.GM_registerMenuCommand=(_,fn)=>menu=fn;
  if(stored)w.localStorage.setItem('sub2api-wecom-v1',stored);
  if(avatarSeed)w.localStorage.setItem('sub2api-wecom-avatar-seed-v1',avatarSeed);
  const close = dom.window.close.bind(dom.window);
  dom.window.close = () => { w.dispatchEvent(new w.Event('pagehide')); close(); };
  w.eval(script);
  return {dom,w,d:w.document,toggle:()=>menu()};
}
test('admin-only activation, existing skin restoration, SPA return, no duplicated shell', async()=>{
  const {w,d,dom}=boot();try {
    assert(d.documentElement.classList.contains('s2wc'));assert(!d.documentElement.hasAttribute('data-skin'));
    const input=d.querySelector('#original-input');input.value='unsaved changes';
    w.history.pushState({},'','/profile');d.querySelector('header').append('profile');await settle(w);
    assert(!d.documentElement.classList.contains('s2wc'));assert.equal(d.documentElement.dataset.skin,'editorial');assert.equal(input.value,'unsaved changes');
    w.history.pushState({},'','/admin/users');d.querySelector('header').append('users');await settle(w);
    assert(d.documentElement.classList.contains('s2wc'));assert.equal(d.querySelectorAll('#s2wc-shell').length,1);
    w.eval(script);assert.equal(d.querySelectorAll('#s2wc-shell').length,1);
  } finally{dom.window.close();}
});
test('foreign pages and user pages are untouched',()=>{
  for(const [path,html] of [['/admin/users','<div id="app"><aside>Other product</aside></div>'],['/dashboard',fixture],['/login',fixture]]){
    const {d,dom}=boot(path,html);try{assert(!d.documentElement.classList.contains('s2wc'));assert(!d.querySelector('#s2wc-shell'));assert.equal(d.documentElement.dataset.skin,'editorial');}finally{dom.window.close();}
  }
});
test('category filtering preserves native elements, event handlers and form state',async()=>{
  const {w,d,dom}=boot();try{
    const native=d.querySelector('[href="/admin/accounts"]');let clicks=0;native.addEventListener('click',e=>{e.preventDefault();clicks++;});
    d.querySelector('[data-category="services"]').click();
    assert(!native.classList.contains('s2wc-filtered'));assert(d.querySelector('[href="/admin/users"]').classList.contains('s2wc-filtered'));
    d.querySelector('.s2wc-search-trigger').click();const input=d.querySelector('#s2wc-palette input');input.value='账号';input.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.s2wc-result').length,1);d.querySelector('.s2wc-result').click();
    assert.equal(clicks,1);assert(!d.querySelector('#s2wc-palette').open);assert.equal(d.querySelector('#original-input').value,'draft');
  }finally{dom.window.close();}
});
test('collapsed groups remain searchable and use the original expansion handler',()=>{
  const {w,d,dom}=boot();try{
    let expanded=0;d.querySelector('#channels').onclick=()=>expanded++;
    d.querySelector('.s2wc-search-trigger').click();const input=d.querySelector('#s2wc-palette input');input.value='渠道';input.dispatchEvent(new w.Event('input'));d.querySelector('.s2wc-result').click();assert.equal(expanded,1);
    assert(!d.querySelector('a[href="/admin/channels/nonexistent"]'));
  }finally{dom.window.close();}
});
test('safe text rendering, empty search, keyboard command, native dark toggle',()=>{
  const {w,d,dom}=boot();try{
    const label=d.querySelector('[href="/admin/users"]');label.textContent='<img src=x onerror=alert(1)>';
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));assert(d.querySelector('#s2wc-palette').open);assert(!d.querySelector('#s2wc-palette img'));
    const input=d.querySelector('#s2wc-palette input');input.value='nonexistent';input.dispatchEvent(new w.Event('input'));assert(d.querySelector('.s2wc-search-empty'));
    d.querySelector('#native-theme').onclick=()=>d.documentElement.classList.toggle('dark');d.querySelector('.s2wc-rail-bottom button').click();assert(d.documentElement.classList.contains('dark'));
  }finally{dom.window.close();}
});
test('disable/enable is reversible and preferences persist',()=>{
  const {w,d,dom,toggle}=boot();try{
    d.querySelector('.s2wc-rail-bottom button:nth-child(2)').click();assert(d.documentElement.classList.contains('s2wc-compact'));
    d.querySelector('.s2wc-title-actions button').click();assert(d.documentElement.classList.contains('s2wc-panel-hidden'));
    toggle();assert(!d.documentElement.classList.contains('s2wc'));assert.equal(d.documentElement.dataset.skin,'editorial');
    assert.equal(JSON.parse(w.localStorage.getItem('sub2api-wecom-v1')).enabled,false);
    toggle();assert(d.documentElement.classList.contains('s2wc'));assert(d.documentElement.classList.contains('s2wc-compact'));
  }finally{dom.window.close();}
});
test('malformed preferences recover, dynamic Vue remount works, observers settle',async()=>{
  const {w,d,dom}=boot('/admin/accounts',fixture,'not json');try{
    d.querySelector('#app').outerHTML=fixture;await settle(w);assert(d.querySelector('header').classList.contains('s2wc-native-header'));
    let writes=0;const monitor=new w.MutationObserver(r=>writes+=r.length);monitor.observe(d.documentElement,{attributes:true,subtree:true,childList:true});await settle(w);monitor.disconnect();assert.equal(writes,0,'idle must not cause mutation/render loops');
  }finally{dom.window.close();}
});

const tableFixture=fixture.replace('<main>',`<main><table><thead><tr><th>ID</th><th>名称</th><th>平台</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td>1</td><td>Alice</td><td>OpenAI</td><td>正常</td><td><button aria-label="编辑">编辑</button></td></tr><tr><td>2</td><td>Bob</td><td>Claude</td><td>正常</td><td><button aria-label="编辑">编辑</button></td></tr></tbody></table>`);
test('middle column contains only native menus; record details remain in the chat',()=>{
  const {d,dom}=boot('/admin/accounts',tableFixture);try{
    assert.equal(d.querySelectorAll('.s2wc-im-conv[aria-label^="联系人："]').length,0);
    assert.equal(d.querySelectorAll('.s2wc-im-conv').length,d.querySelectorAll('.sidebar-nav .sidebar-link').length);
    assert(d.querySelector('.s2wc-im-conv[aria-label="群聊：账号管理群"] .is-group'));
    assert.equal(d.querySelectorAll('.s2wc-im-message').length,2);
    d.querySelector('.s2wc-im-message-actions [aria-label="查看资料"]').click();
    assert.equal(d.querySelector('.s2wc-im-heading h1').textContent,'Alice');
    assert.equal(d.querySelectorAll('.s2wc-im-message').length,1);
    assert.match(d.querySelector('.s2wc-im-bubble').textContent,/OpenAI/);
    assert.equal(d.querySelector('main input').value,'draft');
    assert.equal(d.querySelector('.s2wc-im-conv[aria-current="true"]').getAttribute('aria-label'),'群聊：账号管理群');
    d.querySelector('.s2wc-im-conv[aria-label="群聊：账号管理群"]').click();assert.equal(d.querySelectorAll('.s2wc-im-message').length,2);
  }finally{dom.window.close();}
});
test('v2 native row remount retains working edit proxies and restores accessibility',async()=>{
  const {w,d,dom,toggle}=boot('/admin/accounts',tableFixture);try{
    const row=d.querySelector('tbody tr');row.outerHTML=row.outerHTML;await settle(w);
    let edits=0;d.querySelector('tbody tr button').onclick=()=>edits++;
    d.querySelector('.s2wc-im-message-actions button[aria-label="编辑"]').click();assert.equal(edits,1);
    assert.equal(w.getComputedStyle(d.querySelector('.s2wc-frame')).visibility,'hidden');
    toggle();assert.equal(d.querySelector('.s2wc-frame').getAttribute('aria-hidden'),null);
  }finally{dom.window.close();}
});
test('local notes never touch backend and menu search only matches menu names',()=>{
  const {w,d,dom}=boot('/admin/accounts',tableFixture);try{
    let requests=0;w.fetch=()=>{requests++;throw Error('No network permitted');};
    const entry=d.querySelector('.s2wc-im-composer textarea');entry.value='<img src=x> 本地备注';
    d.querySelector('.s2wc-im-composer').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(requests,0);assert.match(d.querySelector('.s2wc-im-message.is-mine').textContent,/本地备注/);assert(!d.querySelector('.s2wc-im-message.is-mine .s2wc-im-bubble img'));
    const query=d.querySelector('.s2wc-im-search input');query.value='Alice';query.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.s2wc-im-conv').length,0);
    query.value='账号';query.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.s2wc-im-conv').length,1);assert.match(d.querySelector('.s2wc-im-conv').textContent,/账号管理/);
  }finally{dom.window.close();}
});
test('mobile labelled cards stay in the chat and do not become menu items',()=>{
  const mobile=fixture.replace('<main>',`<main><div class="card"><div class="space-y-3"><div data-field="name"><span>名称</span><div>手机账号</div></div><div data-field="status"><span>状态</span><div>正常</div></div></div></div>`);
  const {d,dom}=boot('/admin/accounts',mobile);try{assert(!d.querySelector('.s2wc-im-conv[aria-label="联系人：手机账号"]'));assert.match(d.querySelector('.s2wc-im-bubble').textContent,/正常/);}finally{dom.window.close();}
});

test('v2 delayed native dialogs open over the chat without exposing the table',async()=>{
  const {w,d,dom}=boot('/admin/accounts',tableFixture);try{
    d.querySelector('tbody tr button').onclick=()=>w.setTimeout(()=>{
      const dialog=d.createElement('div');dialog.setAttribute('role','dialog');dialog.textContent='编辑 Alice';d.body.append(dialog);
    },15);
    d.querySelector('.s2wc-im-message-actions button[aria-label="编辑"]').click();
    await settle(w);assert(d.querySelector('[role="dialog"]'));assert(!d.documentElement.classList.contains('s2wc-native-open'));
    assert.equal(w.getComputedStyle(d.querySelector('.s2wc-frame')).visibility,'hidden');
  }finally{dom.window.close();}
});

test('record avatars and menu group avatars remain stable across detail switches and reloads',()=>{
  const first=boot('/admin/accounts',tableFixture);
  let savedSeed,src;
  try{
    const {w,d}=first;
    src=d.querySelector('.s2wc-im-message .is-message img').src;
    assert.match(src,/^data:image\/(jpeg|png);base64,/);
    assert.equal(d.querySelector('.s2wc-im-message .is-message img').src,src);
    const group=[...d.querySelectorAll('.s2wc-im-conv[aria-label="群聊：账号管理群"] img')];
    assert.equal(group.length,9);assert.equal(new Set(group.map(e=>e.src)).size,9);
    savedSeed=w.localStorage.getItem('sub2api-wecom-avatar-seed-v1');assert(savedSeed);
    d.querySelector('.s2wc-im-message-actions [aria-label="查看资料"]').click();
    assert.equal(d.querySelector('.s2wc-im-message .is-message img').src,src);
  }finally{first.dom.window.close();}
  const second=boot('/admin/accounts',tableFixture,null,savedSeed);
  try{assert.equal(second.d.querySelector('.s2wc-im-message .is-message img').src,src);}finally{second.dom.window.close();}
});

const searchableFixture=tableFixture.replace('<th>操作</th>','<th>备注</th><th>操作</th>').replace('<td>OpenAI</td>','<td>OpenAI</td>').replace('<td>正常</td><td><button aria-label="编辑">编辑</button></td></tr>','<td>正常</td><td>Invoice-987 finance@example.test</td><td><button aria-label="编辑">编辑</button></td></tr>');
test('generic page search matches all fields, syncs native rows, survives updates, and restores on clear/disable',async()=>{
  const {w,d,dom,toggle}=boot('/admin/accounts',searchableFixture);try{
    const input=d.querySelector('input[aria-label="当前列表搜索"]');
    input.value='INVOICE-987 FINANCE@';input.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.s2wc-im-message').length,1);
    assert.match(d.querySelector('.s2wc-im-message').textContent,/Alice/);
    assert.equal(d.querySelectorAll('tbody tr.s2wc-search-filtered').length,1);
    assert.equal(d.querySelector('input[aria-label="原页面列表搜索"]').value,input.value);
    assert.match(d.querySelector('.s2wc-im-search-count').textContent,/1 \/ 2/);
    const body=d.querySelector('tbody');body.innerHTML=body.innerHTML;await settle(w);
    assert.equal(d.querySelectorAll('tbody tr.s2wc-search-filtered').length,1);
    input.value='does-not-exist';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.s2wc-im-message').length,0);assert.match(d.querySelector('.s2wc-im-stream').textContent,/没有匹配项/);
    input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(d.querySelectorAll('.s2wc-im-message').length,2);assert.equal(d.querySelectorAll('.s2wc-search-filtered').length,0);
    input.value='Alice';input.dispatchEvent(new w.Event('input'));toggle();assert.equal(d.querySelectorAll('.s2wc-search-filtered').length,0);
  }finally{dom.window.close();}
});

test('card lists without native search gain text search and do not modify their controls',()=>{
  const cards=fixture.replace('<main>',`<main><div class="grid"><article class="card"><h3>Alpha plugin</h3><p>关键词 sparrow-only</p><button id="card-edit">编辑</button></article><article class="card"><h3>Beta plugin</h3><p>关键词 robin-only</p></article></div>`);
  const {w,d,dom}=boot('/admin/plugins',cards);try{
    const edit=d.querySelector('#card-edit');const input=d.querySelector('input[aria-label="当前列表搜索"]');
    assert(d.querySelector('.s2wc-im-native-search-link').hidden);
    input.value='SPARROW';input.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.s2wc-im-message').length,1);assert.match(d.querySelector('.s2wc-im-message').textContent,/Alpha/);
    assert.equal(d.querySelectorAll('article.card.s2wc-search-filtered').length,1);assert.equal(d.querySelector('#card-edit'),edit);
  }finally{dom.window.close();}
});

test('data search matches mobile fields without adding them to menu search',()=>{
  const fields=`<main><div class="card"><div><div data-field="name"><span>名称</span><div>Mobile record</div></div><div data-field="email"><span>邮箱</span><div>mobile@example.test</div></div></div></div>`;
  const {w,d,dom}=boot('/admin/users',fixture.replace('<main>',fields));try{
    const input=d.querySelector('input[aria-label="当前列表搜索"]');input.value='MOBILE@EXAMPLE';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.s2wc-im-message').length,1);
    input.value='nothing';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.s2wc-im-message').length,0);assert(d.querySelector('main .card.s2wc-search-filtered'));
  }finally{dom.window.close();}
  const all=boot('/admin/accounts',searchableFixture);try{
    const input=all.d.querySelector('.s2wc-im-search input');input.value='invoice-987';input.dispatchEvent(new all.w.Event('input'));assert.equal(all.d.querySelectorAll('.s2wc-im-conv').length,0);
  }finally{all.dom.window.close();}
});

test('native search forwards only after explicit action; route changes clear local search',async()=>{
  const {w,d,dom}=boot('/admin/accounts',tableFixture.replace('<main>','<main><input id="server-search" placeholder="搜索账号">'));try{
    let nativeEvents=0;d.querySelector('#server-search').addEventListener('input',()=>nativeEvents++);
    const input=d.querySelector('input[aria-label="当前列表搜索"]');input.value='Alice';input.dispatchEvent(new w.Event('input'));assert.equal(nativeEvents,0);
    d.querySelector('.s2wc-im-page-search .s2wc-im-native-search-link').click();assert.equal(nativeEvents,1);assert.equal(d.querySelector('#server-search').value,'Alice');assert(!d.documentElement.classList.contains('s2wc-native-open'));assert(d.documentElement.classList.contains('s2wc-toolbar-revealed'));
    input.value='Bob';input.dispatchEvent(new w.Event('input'));w.history.pushState({},'','/admin/users');d.querySelector('header').append('route update');await settle(w);assert.equal(input.value,'');assert.equal(d.querySelectorAll('.s2wc-search-filtered').length,0);
  }finally{dom.window.close();}
});

test('native local filtering does not allow bulk actions to affect hidden rows',()=>{
  const {w,d,dom}=boot('/admin/accounts',tableFixture.replace('<main>','<main><button id="bulk">批量更新</button>'));try{
    let writes=0;const bulk=d.querySelector('#bulk');bulk.onclick=()=>writes++;
    const input=d.querySelector('input[aria-label="当前列表搜索"]');input.value='Alice';input.dispatchEvent(new w.Event('input'));
    bulk.click();assert.equal(writes,0);assert.equal(bulk.getAttribute('aria-disabled'),'true');
    input.value='';input.dispatchEvent(new w.Event('input'));bulk.click();assert.equal(writes,1);assert.equal(bulk.getAttribute('aria-disabled'),null);
  }finally{dom.window.close();}
});

test('dashboard model rows never enter middle navigation, including refresh and data filtering',async()=>{
  const dashboard=tableFixture.replace('Alice','gpt-6-sol').replace('Bob','grok-4.6');
  const {w,d,dom}=boot('/admin/dashboard',dashboard);try{
    const expected=[...d.querySelectorAll('.sidebar-nav .sidebar-link')].map(e=>e.textContent+'群');
    const menuNames=()=>[...d.querySelectorAll('.s2wc-im-conv-name')].map(e=>e.textContent);
    assert.deepEqual(menuNames(),expected);
    assert(!/gpt-6-sol|grok-4.6/.test(d.querySelector('.s2wc-im-list').textContent));
    assert.match(d.querySelector('.s2wc-im-stream').textContent,/gpt-6-sol/);
    const search=d.querySelector('input[aria-label="当前列表搜索"]');search.value='grok';search.dispatchEvent(new w.Event('input'));
    assert.deepEqual(menuNames(),expected);assert.equal(d.querySelectorAll('.s2wc-im-message').length,1);
    d.querySelector('tbody').insertAdjacentHTML('beforeend','<tr><td>3</td><td>new-model</td><td>OpenAI</td><td>正常</td><td></td></tr>');await settle(w);
    assert.deepEqual(menuNames(),expected);assert(!d.querySelector('[data-mode="record"]'));
  }finally{dom.window.close();}
});

const nativeTable=tableFixture.match(/<table>[\s\S]*?<\/table>/)[0];
const toolFixture=fixture.replace('<main>',`<main><div class="card"><h3>请求趋势</h3><canvas></canvas></div><div class="card"><h3>模型分布</h3>${nativeTable}</div><div class="card"><h3>总请求数</h3><p>43</p></div><div class="card" id="detail-card"><div><button data-testid="usage-detail-tab" class="border-primary-500">用量明细</button><button data-testid="usage-detail-tab">错误请求</button></div><div id="real-filters"><label>用户<input id="real-user" placeholder="搜索用户"></label><select id="real-model"><option>全部</option><option>OpenAI</option></select><button id="real-export">导出 Excel</button><button id="real-reset">重置</button></div><div id="usage-section">${nativeTable}</div><div id="error-section" style="display:none">${nativeTable.replace('Alice','Error row').replace('Bob','Second error')}</div><div id="real-pagination"><div><p id="page-status">显示 1 至 2 共 4 条结果</p><nav aria-label="Pagination"><button aria-label="上一页" disabled>上一页</button><button aria-label="下一页">下一页</button></nav></div></div></div>`);

test('native filters and export nodes stay in the Vue tree with their state and handlers',()=>{
  const {w,d,dom}=boot('/admin/usage',toolFixture);try{
    const input=d.querySelector('#real-user'),container=input.parentElement;let exports=0;d.querySelector('#real-export').onclick=()=>exports++;
    input.value='draft@example.test';d.querySelector('.s2wc-im-chat-actions [aria-label="显示工具栏"]').click();
    assert(!d.documentElement.classList.contains('s2wc-native-open'));assert(!d.querySelector('.s2wc-tools-entry'));assert.equal(d.querySelector('#real-user'),input);assert.equal(input.parentElement,container);assert.equal(input.value,'draft@example.test');
    d.querySelector('#real-export').click();assert.equal(exports,1);assert.equal(input.value,'draft@example.test');
    assert.equal(d.querySelectorAll('.s2wc-im-message').length,2,'chart tables and inactive tab tables must not become messages');
    assert.match(d.querySelector('.s2wc-stat-summary').textContent,/43/);
  }finally{dom.window.close();}
});

test('chat paging and record tabs call native handlers and follow disabled state',async()=>{
  const {w,d,dom}=boot('/admin/usage',toolFixture);try{
    const next=d.querySelector('#real-pagination [aria-label="下一页"]');let pages=0;
    next.onclick=()=>{pages++;next.disabled=true;d.querySelector('#page-status').textContent='显示 3 至 4 共 4 条结果';};
    d.querySelector('.s2wc-native-pager [aria-label="下一页"]').click();await settle(w);assert.equal(pages,1);assert(d.querySelector('.s2wc-native-pager [aria-label="下一页"]').disabled);
    const error=d.querySelectorAll('[data-testid="usage-detail-tab"]')[1];error.onclick=()=>{d.querySelector('#usage-section').style.display='none';d.querySelector('#error-section').style.display='';error.classList.add('border-primary-500');};
    d.querySelector('.s2wc-native-tab[aria-label="错误请求"]').click();await settle(w);assert.match(d.querySelector('.s2wc-im-stream').textContent,/Error row/);assert(!d.querySelector('.s2wc-im-stream').textContent.includes('Alice'));
  }finally{dom.window.close();}
});

test('record selection and field actions retain native handlers',async()=>{
  const data=tableFixture.replace('<td>1</td>','<td><input type="checkbox" id="original-check">1</td>').replace('<td>Alice</td>','<td><button title="查看用户详情" id="original-user">Alice</button></td>');
  const {w,d,dom}=boot('/admin/users',data);try{
    let selected=0,opened=0;d.querySelector('#original-check').onchange=()=>selected++;d.querySelector('#original-user').onclick=()=>opened++;
    assert.match(d.querySelector('.s2wc-im-bubble').textContent,/Alice/);
    const proxy=d.querySelector('.s2wc-record-selector input');proxy.click();await settle(w);assert.equal(selected,1);assert(d.querySelector('#original-check').checked);assert.match(d.querySelector('.s2wc-native-selection').textContent,/已选 1/);
    d.querySelector('.s2wc-im-message-actions [aria-label="查看用户详情"]').click();assert.equal(opened,1);
  }finally{dom.window.close();}
});

test('charts are hidden reversibly while date filters and numeric statistics remain',()=>{
  const html=toolFixture.replace('<main>','<main><div class="card" id="date-card"><input type="date" value="2026-09-28"></div><div class="card" id="qr-card"><h3>二维码</h3><canvas></canvas></div>');
  const {d,dom,toggle}=boot('/admin/usage',html);try{
    assert.equal(d.querySelectorAll('.s2wc-chart-hidden').length,2);assert(!d.querySelector('#date-card').classList.contains('s2wc-chart-hidden'));assert(!d.querySelector('#qr-card').classList.contains('s2wc-chart-hidden'));
    toggle();assert.equal(d.querySelectorAll('.s2wc-chart-hidden,.s2wc-tool-record,.s2wc-tools-static').length,0);
  }finally{dom.window.close();}
});

test('sort controls forward to sortable native headers and update state',async()=>{
  const {w,d,dom}=boot('/admin/accounts',tableFixture.replace('<th>名称</th>','<th aria-sort="ascending" id="name-sort">名称</th>'));try{
    let sorts=0;d.querySelector('#name-sort').onclick=()=>{sorts++;d.querySelector('#name-sort').setAttribute('aria-sort','descending');};
    d.querySelector('.s2wc-native-sort button').click();await settle(w);assert.equal(sorts,1);assert.match(d.querySelector('.s2wc-native-sort').textContent,/降序/);
  }finally{dom.window.close();}
});

test('an empty active record tab stays empty instead of showing chart data or inactive rows',async()=>{
  const {w,d,dom}=boot('/admin/usage',toolFixture);try{
    d.querySelector('#usage-section').style.display='none';d.querySelector('#error-section').style.display='';
    d.querySelector('#error-section').innerHTML='<table><thead><tr><th>错误</th></tr></thead><tbody><tr><td colspan="2">暂无记录</td></tr></tbody></table>';
    await settle(w);assert.equal(d.querySelectorAll('.s2wc-im-message').length,0);assert.equal(d.querySelector('.s2wc-im-count').textContent,'（0）');assert.match(d.querySelector('.s2wc-im-stream').textContent,/暂无记录/);
    assert.match(d.querySelector('.s2wc-stat-summary').textContent,/43/);
  }finally{dom.window.close();}
});

test('inline toolbar keeps its occupied height while pointer hover reveals and conceals content',async()=>{
  const {w,d,dom}=boot('/admin/usage',toolFixture);try{
    const toolbar=d.querySelector('.s2wc-native-toolbar'),tabs=d.querySelector('.s2wc-native-tabs');
    toolbar.getBoundingClientRect=()=>({left:400,right:1200,top:120,bottom:168,width:800,height:48});
    const height=w.getComputedStyle(toolbar).height;assert.equal(height,'48px');assert.equal(w.getComputedStyle(tabs).opacity,'0');
    d.dispatchEvent(new w.MouseEvent('pointermove',{clientX:600,clientY:140,bubbles:true}));assert.equal(w.getComputedStyle(tabs).opacity,'1');assert.equal(w.getComputedStyle(toolbar).height,height);
    d.dispatchEvent(new w.MouseEvent('pointermove',{clientX:600,clientY:300,bubbles:true}));assert.equal(w.getComputedStyle(tabs).opacity,'0');assert.equal(w.getComputedStyle(toolbar).height,height);
    assert.equal(d.querySelector('.s2wc-toolbar-local-search').closest('.s2wc-native-toolbar'),toolbar);assert(!d.querySelector('.s2wc-tools-entry'));
  }finally{dom.window.close();}
});

test('native inline inputs keep state, keyboard access, parent identity and original styles on disable',async()=>{
  const {w,d,dom,toggle}=boot('/admin/usage',toolFixture);try{
    const field=d.querySelector('#real-user'),parent=field.parentElement,originalStyle=parent.getAttribute('style');
    field.value='draft@inline.test';field.focus();await settle(w);
    assert(d.documentElement.classList.contains('s2wc-toolbar-revealed'));assert(!d.documentElement.classList.contains('s2wc-native-open'));assert.equal(field.parentElement,parent);assert.equal(field.value,'draft@inline.test');
    toggle();assert.equal(field.parentElement,parent);assert.equal(field.value,'draft@inline.test');assert.equal(parent.getAttribute('style')||null,originalStyle||null);assert.equal(d.querySelectorAll('.s2wc-docked-control,.s2wc-native-control-slot').length,0);
  }finally{dom.window.close();}
});

test('opening a native date dropdown does not add its internal fields to the toolbar',async()=>{
  const dateFixture=toolFixture.replace('<main>','<main><div id="date-picker"><button class="date-picker-trigger">近24小时</button></div>');
  const {w,d,dom}=boot('/admin/usage',dateFixture);try{
    const count=d.querySelectorAll('.s2wc-native-control-slot').length;
    d.querySelector('#date-picker').insertAdjacentHTML('beforeend','<div class="date-picker-dropdown"><label>开始日期<input type="date"></label><button>应用</button></div>');await settle(w);
    assert.equal(d.querySelectorAll('.s2wc-native-control-slot').length,count);assert(d.documentElement.classList.contains('s2wc-toolbar-revealed'));assert(!d.documentElement.classList.contains('s2wc-native-open'));
  }finally{dom.window.close();}
});
