/* Bundled after THEME_CSS. No API calls, credentials, Vue internals or remote dependencies. */
if (document.getElementById('app') && !document.getElementById('s2wc-style')) {
  const ROOT = document.documentElement;
  const KEY = 'sub2api-wecom-v1';
  const groups = [
    ['all', '工作台', 'grid'],
    ['people', '通讯录', 'users'],
    ['services', '服务管理', 'server'],
    ['finance', '财务管理', 'wallet'],
    ['insights', '数据中心', 'chart'],
    ['system', '管理工具', 'settings'],
  ];
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
    wallet: '<path d="M20 7V4H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V6m18 6h-6v4h6"/>',
    chart: '<path d="M4 3v18h17M8 16v-5m5 5V6m5 10v-8"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    compact: '<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>',
    restore: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  };
  paths.play = '<path d="m8 5 11 7-11 7z"/>';
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
  let prefs = { enabled: true, compact: false, panel: true };
  try { const p = JSON.parse(localStorage.getItem(KEY)); for (const k of Object.keys(prefs)) if (typeof p?.[k] === 'boolean') prefs[k] = p[k]; } catch { /* Storage may be unavailable. */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* Session-only fallback. */ } };
  const style = document.createElement('style');
  style.id = 's2wc-style'; style.textContent = `${THEME_CSS}\n.s2wc-im-message{width:min(92%,760px);max-width:760px}.s2wc-im-message-content{flex:1;min-width:0}.s2wc-im-bubble{border-radius:9px}.s2wc-im-fields{display:flex;flex-wrap:wrap;gap:5px 16px;max-width:620px}.s2wc-im-field{display:flex;gap:5px;min-width:0}.s2wc-im-field dt{white-space:nowrap}.s2wc-im-field dd{overflow-wrap:anywhere}`;
  (document.head || ROOT).append(style);
  let shell, palette, conversations, active = false, sidebar, header, frame, category = 'all', previousPath = '', signature = '';
  let priorSkin = null, skinCaptured = false, pending = false, searchOrigin, frameRequest = 0;
  const setClass = (el, name, value) => { if (el.classList.contains(name) !== value) el.classList.toggle(name, value); };
  const setText = (el, value) => { if (el && el.textContent !== value) el.textContent = value; };
  const classify = (href) => {
    const path = new URL(href, location.href).pathname;
    if (/^\/admin\/(users|groups)(\/|$)/.test(path) || /^\/profile(?:\/|$)/.test(path)) return 'people';
    if (/^\/admin\/(accounts|channels|proxies|plugins)(\/|$)/.test(path) || /^\/(keys|batch-image|image-generation|available-channels)(\/|$)/.test(path)) return 'services';
    if (/^\/admin\/(orders|subscriptions|redeem|promo-codes|affiliates)(\/|$)/.test(path) || /^\/(subscriptions|purchase|orders|redeem|affiliate|payment)(\/|$)/.test(path)) return 'finance';
    if (/^\/admin\/(dashboard|ops|usage|audit-logs)(\/|$)/.test(path) || /^\/(dashboard|usage|monitor)(\/|$)/.test(path)) return 'insights';
    return 'system';
  };
  const nativeLinks = () => [...(sidebar?.querySelectorAll('.sidebar-nav a[href]') || [])].filter(a => {
    const u = new URL(a.href, location.href);
    return u.origin === location.origin && !!a.textContent.trim();
  });
  function makeButton(label, glyph, handler, className = 's2wc-rail-item') {
    const b = document.createElement('button'); b.type = 'button'; b.className = className;
    b.innerHTML = `${icon(glyph)}<span></span>`; b.lastElementChild.textContent = label;
    b.title = label; b.setAttribute('aria-label', label); b.addEventListener('click', handler); return b;
  }
  function createShell() {
    shell = document.createElement('div'); shell.id = 's2wc-shell';
    shell.innerHTML = `<div class="s2wc-titlebar"><span class="s2wc-appmark">企</span><span class="s2wc-title-brand">企业微信</span><span class="s2wc-title-divider"></span><span class="s2wc-site-name">Sub2API</span><button type="button" class="s2wc-search-trigger" aria-label="搜索应用，Ctrl K">${icon('search')}<span>搜索应用、管理功能</span><kbd>Ctrl K</kbd></button><span class="s2wc-title-label">管理工作台</span><div class="s2wc-title-actions"></div></div><aside class="s2wc-rail" aria-label="企业微信工作台"><div class="s2wc-identity"><span class="s2wc-avatar">S</span><div><strong class="s2wc-user">管理员</strong><small>Sub2API 工作空间</small></div></div><div class="s2wc-org"><span class="s2wc-org-icon">S</span><span class="s2wc-site-name">Sub2API</span>${icon('chevron')}</div><nav class="s2wc-apps" aria-label="管理分类"></nav><div class="s2wc-rail-caption">应用与服务</div><div class="s2wc-workspace-note">连接团队与 AI<br><span>高效、安全、有序</span></div><div class="s2wc-rail-bottom"></div></aside>`;
    for (const [key, label, glyph] of groups) {
      const b = makeButton(label, glyph, () => { category = key; prefs.panel = true; save(); sync(); });
      b.dataset.category = key; shell.querySelector('.s2wc-apps').append(b);
    }
    const bottom = shell.querySelector('.s2wc-rail-bottom');
    bottom.append(makeButton('深浅外观', 'moon', () => sidebar?.querySelector(':scope > .mt-auto button')?.click()));
    bottom.append(makeButton('紧凑显示', 'compact', () => { prefs.compact = !prefs.compact; save(); sync(); }));
    bottom.append(makeButton('原始界面', 'restore', () => { prefs.enabled = false; save(); sync(); }));
    shell.querySelector('.s2wc-title-actions').append(makeButton('展开或收起应用列表', 'panel', () => { prefs.panel = !prefs.panel; save(); sync(); }, 's2wc-icon-button'));
    shell.querySelector('.s2wc-search-trigger').addEventListener('click', openSearch);
    // Two chat bubbles from the reference skin's WeCom icon (MIT attribution retained).
    shell.querySelector('.s2wc-appmark').innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="white" d="M8 27C8 17 17 10 28 10s20 7 20 17-9 17-20 17c-2 0-5 0-7-1l-10 6 3-10C10 36 8 32 8 27Z"/><path fill="#19c878" stroke="white" stroke-width="2.5" d="M32 38c0-8 7-14 15-14s15 6 15 14-7 14-15 14l-4-1-8 4 2-8c-3-2-5-5-5-9Z"/><circle cx="21" cy="26" r="2" fill="#4389f5"/><circle cx="33" cy="26" r="2" fill="#4389f5"/><circle cx="43" cy="37" r="1.7" fill="white"/><circle cx="52" cy="37" r="1.7" fill="white"/></svg>';
    document.body.append(shell);
    conversations = createConversationUI({ shell, icon, button: makeButton, refresh: schedule, getContext: () => ({ sidebar, header, frame, main: frame?.querySelector('main'), category, classify, user: shell.querySelector('.s2wc-user')?.textContent }) });
    palette = document.createElement('dialog'); palette.id = 's2wc-palette';
    palette.setAttribute('aria-label', '搜索应用');
    palette.innerHTML = `<div class="s2wc-search-head">${icon('search')}<input aria-label="搜索应用名称" placeholder="搜索应用名称…" autocomplete="off"><button type="button" aria-label="关闭搜索">${icon('close')}</button></div><div class="s2wc-search-results"></div><div class="s2wc-search-footer"><span>↑ ↓ 选择 · Enter 打开 · Esc 关闭</span><span>当前可用应用</span></div>`;
    palette.querySelector('input').addEventListener('input', renderSearch);
    palette.querySelector('button').addEventListener('click', () => palette.close());
    palette.addEventListener('click', e => { if (e.target === palette) { const r = palette.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) palette.close(); } });
    palette.addEventListener('close', () => searchOrigin?.isConnected && searchOrigin.focus());
    palette.addEventListener('keydown', e => {
      const buttons = [...palette.querySelectorAll('.s2wc-result')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!buttons.length) return;
        const i = buttons.indexOf(document.activeElement);
        buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
      } else if (e.key === 'Enter' && document.activeElement === palette.querySelector('input')) { e.preventDefault(); buttons[0]?.click(); }
    });
    document.body.append(palette);
  }
  function openSearch() {
    if (!active) return;
    searchOrigin = document.activeElement;
    palette.querySelector('input').value = ''; renderSearch();
    if (!palette.open) palette.showModal();
    palette.querySelector('input').focus();
  }
  function renderSearch() {
    const query = palette.querySelector('input').value.trim().toLocaleLowerCase();
    const results = palette.querySelector('.s2wc-search-results'); results.replaceChildren();
    // Includes group buttons so collapsed/feature-gated children are never fabricated.
    const candidates = [...sidebar.querySelectorAll('.sidebar-nav a[href], .sidebar-nav button.sidebar-link')];
    for (const item of candidates.filter(a => `${a.textContent} ${a.getAttribute('href') || ''}`.toLocaleLowerCase().includes(query))) {
      const b = makeButton(item.textContent.trim(), 'grid', () => {
        category = 'all'; prefs.panel = true; save(); palette.close(); sync(); item.click();
        if (item.tagName === 'BUTTON') schedule();
      }, 's2wc-result');
      const hint = document.createElement('small'); hint.textContent = item.tagName === 'BUTTON' ? '展开分组' : '打开应用'; b.append(hint); results.append(b);
    }
    if (!results.children.length) { const p = document.createElement('p'); p.className = 's2wc-search-empty'; p.textContent = '未找到应用，试试其他关键词'; results.append(p); }
  }
  function restore() {
    conversations?.deactivate();
    setClass(ROOT, 's2wc', false); setClass(ROOT, 's2wc-compact', false); setClass(ROOT, 's2wc-panel-hidden', false); setClass(ROOT, 's2wc-native-collapsed', false);
    if (skinCaptured) { if (priorSkin === null) ROOT.removeAttribute('data-skin'); else ROOT.setAttribute('data-skin', priorSkin); skinCaptured = false; }
    document.querySelectorAll('.s2wc-filtered').forEach(e => e.classList.remove('s2wc-filtered'));
    if (palette?.open) palette.close();
    if (shell) shell.hidden = true;
    active = false;
  }
  function sync() {
    pending = false;
    const layout = document.querySelector('#app .app-layout');
    const candidate = layout?.querySelector('aside.sidebar');
    // Sub2API shares this layout across admin and user routes.
    const matches = candidate?.querySelector('.sidebar-nav a[href], .sidebar-nav button.sidebar-link') && layout.querySelector('main') && layout.querySelector('header');
    if (!prefs.enabled || !matches) { restore(); return; }
    sidebar = candidate; header = layout.querySelector('header'); frame = header.parentElement;
    if (!shell) createShell();
    if (!skinCaptured) { priorSkin = ROOT.getAttribute('data-skin'); skinCaptured = true; }
    // Existing optional skins have layout pseudo-elements; suspend them only while active.
    if (ROOT.hasAttribute('data-skin')) { priorSkin = ROOT.getAttribute('data-skin'); ROOT.removeAttribute('data-skin'); }
    active = true; shell.hidden = false;
    setClass(ROOT, 's2wc', true); setClass(ROOT, 's2wc-compact', prefs.compact); setClass(ROOT, 's2wc-panel-hidden', !prefs.panel);
    setClass(ROOT, 's2wc-native-collapsed', sidebar.classList.contains('w-[72px]'));
    frame.classList.add('s2wc-frame'); header.classList.add('s2wc-native-header');
    if (previousPath !== location.pathname) { previousPath = location.pathname; category = 'all'; }
    const brand = sidebar.querySelector('.sidebar-brand-title')?.textContent.trim() || 'Sub2API';
    shell.querySelectorAll('.s2wc-site-name').forEach(e => setText(e, brand));
    const user = header.querySelector('button .text-left .text-sm')?.textContent.trim() || '管理员';
    setText(shell.querySelector('.s2wc-user'), user);
    for (const b of shell.querySelectorAll('[data-category]')) {
      setClass(b, 'is-active', b.dataset.category === category);
      b.setAttribute('aria-pressed', String(b.dataset.category === category));
    }
    const rows = [...sidebar.querySelectorAll('.sidebar-nav .sidebar-link')];
    for (const row of rows) {
      // Group buttons have no href. Match their visible child link or semantic label.
      let kind = row.hasAttribute('href') ? classify(row.getAttribute('href')) : null;
      if (!kind) {
        const label = row.textContent;
        kind = /渠道|channel/i.test(label) ? 'services' : /订单|支付|返佣|推广|order|payment|affiliate/i.test(label) ? 'finance' : 'system';
      }
      setClass(row, 's2wc-filtered', category !== 'all' && category !== kind);
    }
    sidebar.querySelectorAll('.sidebar-section').forEach(section => {
      setClass(section, 's2wc-filtered', !section.querySelector('.sidebar-link:not(.s2wc-filtered)'));
      section.querySelectorAll(':scope > div').forEach(wrap => {
        if (wrap.querySelector('.sidebar-link')) setClass(wrap, 's2wc-filtered', !wrap.querySelector('.sidebar-link:not(.s2wc-filtered)'));
      });
    });
    const currentSignature = nativeLinks().map(a => a.href + a.textContent).join('|');
    if (palette.open && signature !== currentSignature) renderSearch();
    signature = currentSignature;
    const density = shell.querySelector('.s2wc-rail-bottom button:nth-child(2)'); density.setAttribute('aria-pressed', String(prefs.compact));
    conversations.update();
  }
  function schedule() { if (!pending) { pending = true; frameRequest = requestAnimationFrame(sync); } }
  const observer = new MutationObserver(records => {
    // Our own class/text changes must not create an observation/render loop.
    if (records.some(r => {
      const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      if (el?.closest?.('#s2wc-shell, #s2wc-palette, #s2wc-style')) return false;
      if (r.type === 'attributes' && r.attributeName === 'class') {
        const strip = s => (typeof s === 'string' ? s : s?.baseVal || '').split(/\s+/).filter(c => c && !c.startsWith('s2wc')).sort().join(' ');
        return strip(r.oldValue) !== strip(el.className);
      }
      return r.attributeName !== 'data-skin' || ROOT.hasAttribute('data-skin');
    })) schedule();
  });
  const observe = () => observer.observe(ROOT, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'href', 'data-skin', 'disabled', 'checked', 'aria-sort', 'aria-selected','aria-expanded'] });
  observe();
  window.addEventListener('pagehide', () => { observer.disconnect(); cancelAnimationFrame(frameRequest); pending = false; conversations?.deactivate(); });
  window.addEventListener('pageshow', () => { observe(); schedule(); });
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  for(const name of ['input','change'])document.addEventListener(name,e=>{if(active&&frame?.contains(e.target))schedule();},true);
  // pushState/replaceState navigation is detected through Vue's DOM updates; no history patching.
  document.addEventListener('keydown', e => {
    if (active && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  });
  if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('企业微信皮肤：启用 / 关闭', () => { prefs.enabled = !prefs.enabled; save(); sync(); });
  sync();
}
