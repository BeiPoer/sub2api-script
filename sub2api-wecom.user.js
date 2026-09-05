// ==UserScript==
// @name         Sub2API · 企业微信 IM 工作台
// @namespace    https://github.com/BeiPoer/sub2api
// @version      0.3.0
// @updateURL    https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-wecom.user.js
// @downloadURL  https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-wecom.user.js
// @description  将 Sub2API 登录后的工作台重排为企业微信 5.x 对话式界面，保留原页面数据、路由和业务控件。
// @author       sub2api contributors
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict'

  // 视觉与布局参考 Blackwindow6/linuxdo-wecom-ui（MIT，https://github.com/Blackwindow6/linuxdo-wecom-ui）。
  // 请勿与 sub2api-idea.user.js 等其他外观脚本同时启用。

  const STYLE_ID = 'sub2api-wecom-theme-style'
  const SHELL_ID = 'sub2api-wecom-shell'
  const ROOT_CLASS = 'sub2api-wecom-theme'
  const STYLE_MARKER = 'sub2api-wecom-v3'
  const AVATAR_COLORS = ['#4389f5', '#2f9b8f', '#7a6ff0', '#df8a45', '#3e9c67', '#c05f82', '#5f7fa8', '#8a6d52']
  const AVATAR_GLYPHS = ['林', '陈', '周', '王', '张', '许', '苏', '沈', '顾', '陆', '叶', '唐', '宋', '方', '程', '夏']
  const ANNOUNCEMENT_SELECTOR = 'button[aria-label="公告"],button[aria-label*="公告"],button[aria-label*="announcement" i],button[title*="公告"],button[title*="announcement" i]'
  const ACCOUNT_SELECTOR = 'button[aria-label="用户菜单"],button[aria-label*="用户"],button[aria-label*="user" i],button[aria-label*="account" i]'
  const LOCALE_SELECTOR = '[data-wecom-locale-button],button[title="中文"],button[title="English"],button[aria-label*="ZH" i]'
  const SUBSCRIPTION_SELECTOR = 'button[class*="bg-purple-50"],button[title*="订阅"],button[title*="subscription" i]'

  // 参考 linuxdo-wecom-ui 的双气泡标记，内联 SVG 不产生外部请求。
  const WECOM_LOGO = '<svg class="wecom-logo-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="sub2api-wecom-logo-gradient" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse"><stop stop-color="#4096ff"/><stop offset="1" stop-color="#1769d2"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#sub2api-wecom-logo-gradient)"/><path fill="#fff" d="M11 27.5C11 18.94 18.84 12 28.5 12S46 18.94 46 27.5 38.16 43 28.5 43c-2.13 0-4.17-.34-6.06-.95L14 47l2.48-7.16C13.1 36.91 11 32.55 11 27.5Z"/><path fill="#19c878" stroke="#fff" stroke-width="2.5" d="M34 37.5C34 30.6 40.27 25 48 25s14 5.6 14 12.5S55.73 50 48 50c-1.55 0-3.04-.23-4.43-.65L37 53l1.84-5.23C35.87 45.39 34 41.73 34 37.5Z"/><circle cx="23" cy="27" r="2" fill="#267ef0"/><circle cx="33" cy="27" r="2" fill="#267ef0"/><circle cx="44" cy="37.5" r="1.7" fill="#fff"/><circle cx="52" cy="37.5" r="1.7" fill="#fff"/></svg>'

  const ICON_PATHS = {
    message: '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.2a.8.8 0 0 1-1.3-.6V6.5Z"/>',
    mail: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="m5 8 7 5 7-5"/>',
    document: '<path d="M7 4h7l4 4v12H7V4Z"/><path d="M14 4v4h4M9 12h6M9 16h5"/>',
    calendar: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 4v3m8-3v3M4 10h16"/>',
    todo: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 9h8M8 13h5M8 17h3"/>',
    meeting: '<rect x="4" y="7" width="12" height="10" rx="2"/><path d="m16 10 4-2v8l-4-2"/>',
    workbench: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    contacts: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M17 11a2.5 2.5 0 1 0 0-5M17 14c2.7 0 4 1.8 4 4"/>',
    drive: '<path d="m4 8 8-4 8 4v8l-8 4-8-4V8Z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M7 4.5h3.2l1 3.2-2 1.4a11 11 0 0 0 5.7 5.7l1.4-2 3.2 1V17a2 2 0 0 1-2.2 2A15 15 0 0 1 5 6.7a2 2 0 0 1 2-2.2Z"/>',
    video: '<rect x="3.5" y="7" width="12" height="10" rx="2"/><path d="m15.5 10 5-2.5v9l-5-2.5"/>',
    users: '<circle cx="9" cy="9" r="3"/><path d="M4.5 19a4.5 4.5 0 0 1 9 0M16.5 10a2.5 2.5 0 1 0-1.5-4.5M16 14c2.5.2 3.8 1.8 4 4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.7-3L3 11"/><path d="M3 5v6h6M4 13a8 8 0 0 0 14.7 3L21 13"/><path d="M21 19v-6h-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/>',
    bell: '<path d="M6 16h12l-1.2-2.2a6.5 6.5 0 0 1-.8-3.3V9a4 4 0 1 0-8 0v1.5c0 1.2-.3 2.3-.8 3.3L6 16Z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
    emoji: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1.1 1.3 2.3 1.9 3.5 1.9s2.4-.6 3.5-1.9"/>',
    clip: '<path d="m8.5 12.5 5.8-5.8a3 3 0 0 1 4.2 4.2l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l7.3-7.3a2.5 2.5 0 0 1 3.5 3.5l-7.3 7.3a1 1 0 0 1-1.4-1.4l6.5-6.5"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4.5-4 3 2.5 2-2 4.5 4.5"/>',
    send: '<path d="m4 5 16 7-16 7 3.5-7L4 5Z"/><path d="M7.5 12H20"/>',
  }

  const CSS = String.raw`
    /* ${STYLE_MARKER} */
    html.${ROOT_CLASS} {
      --wecom-rail: 162px;
      --wecom-list: 304px;
      --wecom-members: 220px;
      --wecom-header: 80px;
      --wecom-composer: 154px;
      --wecom-blue: #4389f5;
      --wecom-blue-hover: #2f78e8;
      --wecom-blue-soft: #dcecff;
      --wecom-blue-active: #cfe4ff;
      --wecom-rail-start: #e7f3ff;
      --wecom-rail-end: #ddeeff;
      --wecom-workspace: #f1f4f8;
      --wecom-surface: #ffffff;
      --wecom-hover: #e8eef6;
      --wecom-border: #d9e0e9;
      --wecom-border-strong: #c5cfdb;
      --wecom-text: #172033;
      --wecom-text-2: #526175;
      --wecom-text-3: #8b98aa;
      color-scheme: light !important;
      background: var(--wecom-workspace) !important;
      font-family: "Microsoft YaHei UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif !important;
    }
    html.${ROOT_CLASS}, html.${ROOT_CLASS} body, html.${ROOT_CLASS} #app, html.${ROOT_CLASS} #app > .min-h-screen { min-height: 100dvh !important; background: var(--wecom-workspace) !important; color: var(--wecom-text) !important; }
    html.${ROOT_CLASS} body { overflow: hidden !important; }
    html.${ROOT_CLASS}.dark [data-wecom-app-content], html.${ROOT_CLASS}.dark [data-wecom-app-content] > main { background: var(--wecom-workspace) !important; color: var(--wecom-text) !important; }
    html.${ROOT_CLASS}.dark main[data-wecom-conversation] [class*="dark:bg-"] { background-color: #fff !important; background-image: none !important; }
    html.${ROOT_CLASS}.dark main[data-wecom-conversation] [class*="dark:border-"] { border-color: var(--wecom-border) !important; }
    html.${ROOT_CLASS} body * { letter-spacing: 0 !important; }
    html.${ROOT_CLASS} #app > .min-h-screen > .pointer-events-none.fixed.inset-0, html.${ROOT_CLASS} .bg-mesh-gradient { display: none !important; }

    /* Keep Vue's source nodes as event/data providers. */
    html.${ROOT_CLASS} aside.sidebar { position: fixed !important; z-index: 1 !important; left: -10000px !important; top: 0 !important; width: 1px !important; min-width: 1px !important; height: 1px !important; overflow: visible !important; opacity: 0 !important; pointer-events: none !important; transform: none !important; }
    html.${ROOT_CLASS} header.glass { position: fixed !important; z-index: 2 !important; left: -10000px !important; top: 0 !important; width: 1px !important; height: 1px !important; min-height: 1px !important; overflow: visible !important; border: 0 !important; background: transparent !important; box-shadow: none !important; opacity: 1 !important; pointer-events: none !important; }
    html.${ROOT_CLASS} header.glass .dropdown { position: fixed !important; z-index: 900 !important; top: 58px !important; right: 18px !important; left: auto !important; pointer-events: auto !important; opacity: 1 !important; visibility: visible !important; transform: none !important; border-color: var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; color: var(--wecom-text) !important; box-shadow: 0 10px 28px rgba(36,58,86,.18) !important; }
    html.${ROOT_CLASS} header.glass [data-wecom-locale-source] > div.absolute { position: fixed !important; z-index: 900 !important; top: 58px !important; right: 18px !important; left: auto !important; pointer-events: auto !important; border-color: var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; color: var(--wecom-text) !important; box-shadow: 0 10px 28px rgba(36,58,86,.18) !important; }

    html.${ROOT_CLASS} [data-wecom-app-content] { position: fixed !important; z-index: 20 !important; top: var(--wecom-header) !important; right: var(--wecom-members) !important; bottom: var(--wecom-composer) !important; left: calc(var(--wecom-rail) + var(--wecom-list)) !important; width: auto !important; min-height: 0 !important; margin: 0 !important; overflow: hidden !important; background: var(--wecom-workspace) !important; transition: left .18s ease, right .18s ease, top .18s ease, bottom .18s ease !important; }
    html.${ROOT_CLASS} [data-wecom-app-content] > main { box-sizing: border-box !important; width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; overflow-x: hidden !important; overflow-y: auto !important; padding: 20px 26px 28px !important; background: var(--wecom-workspace) !important; scrollbar-color: rgba(118,145,177,.42) transparent !important; }
    html.${ROOT_CLASS} [data-wecom-app-content] > main::-webkit-scrollbar { width: 7px !important; }
    html.${ROOT_CLASS} [data-wecom-app-content] > main::-webkit-scrollbar-thumb { border-radius: 4px !important; background: rgba(118,145,177,.42) !important; }
    html.${ROOT_CLASS} [data-wecom-app-content] > main > :is(.mx-auto,[class*="max-w-"]) { width: 100% !important; max-width: none !important; margin-right: 0 !important; margin-left: 0 !important; }
    html.${ROOT_CLASS} [data-wecom-app-content] > .fixed.inset-x-0.bottom-0 { z-index: 320 !important; right: var(--wecom-members) !important; bottom: var(--wecom-composer) !important; left: calc(var(--wecom-rail) + var(--wecom-list)) !important; border-color: var(--wecom-border) !important; background: rgba(255,255,255,.97) !important; box-shadow: 0 -4px 16px rgba(36,58,86,.08) !important; backdrop-filter: none !important; }

    html.${ROOT_CLASS} #${SHELL_ID}, html.${ROOT_CLASS} #${SHELL_ID} * { box-sizing: border-box; font-family: "Microsoft YaHei UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif; }
    html.${ROOT_CLASS} #${SHELL_ID} { position: fixed; inset: 0; z-index: 300; pointer-events: none; color: var(--wecom-text); }
    html.${ROOT_CLASS} #sub2api-wecom-rail { position: fixed; z-index: 350; inset: 0 auto 0 0; width: var(--wecom-rail); display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; border-right: 1px solid #c9d9eb; background: linear-gradient(180deg,var(--wecom-rail-start),var(--wecom-rail-end)); }
    .wecom-rail-brand { height: 62px; display: flex; align-items: center; gap: 8px; flex: 0 0 62px; padding: 0 14px; }
    .wecom-rail-logo { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 36px; border-radius: 9px; color: #fff; background: linear-gradient(145deg,#4389f5,#25ad91); box-shadow: 0 4px 12px rgba(51,120,205,.2); }
    .wecom-rail-logo svg { width: 36px; height: 36px; }
    .wecom-rail-brand-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .wecom-rail-brand-copy strong { overflow: hidden; color: #2e5f95; font-size: 12px; font-weight: 700; line-height: 15px; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-rail-brand-copy span { overflow: hidden; color: #7792af; font-size: 9px; line-height: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-rail-profile { display: flex; justify-content: center; padding: 3px 0 13px; }
    .wecom-rail-profile button { position: relative; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 7px; cursor: pointer; background: transparent; }
    .wecom-rail-profile button:hover { background: rgba(79,143,234,.11); }
    .wecom-avatar { display: grid; place-items: center; overflow: hidden; color: #fff; font-size: 14px; font-weight: 700; line-height: 1; }
    .wecom-rail-profile .wecom-avatar { width: 34px; height: 34px; margin: 3px; border-radius: 6px; }
    .wecom-avatar-badge { position: absolute; top: -3px; right: -5px; min-width: 16px; height: 16px; padding: 0 4px; border: 2px solid #e5f2ff; border-radius: 9px; background: #fa5151; color: #fff; font-size: 9px; line-height: 12px; text-align: center; }
    .wecom-rail-items { min-height: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; padding: 0 12px; scrollbar-width: none; }
    .wecom-rail-items::-webkit-scrollbar { display: none; }
    .wecom-rail-item { position: relative; width: 100%; height: 43px; display: flex; align-items: center; gap: 9px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: #5d718a; font-size: 12px; cursor: default; text-align: left; }
    .wecom-rail-item svg { width: 17px; height: 17px; flex: 0 0 17px; color: #7187a0; }
    .wecom-rail-item[data-active="true"] { background: var(--wecom-blue-active); color: #2d78e7; font-weight: 600; cursor: pointer; }
    .wecom-rail-item[data-active="true"] svg { color: #2d78e7; }
    .wecom-rail-item:not([data-active="true"]):hover { background: rgba(79,143,234,.08); }
    .wecom-rail-label { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .wecom-rail-bottom { margin-top: auto; padding: 10px 12px 14px; border-top: 1px solid rgba(160,184,211,.45); }
    .wecom-rail-bottom .wecom-rail-item { justify-content: center; padding: 0; }

    html.${ROOT_CLASS} #sub2api-wecom-conversations { position: fixed; z-index: 340; inset: 0 auto 0 var(--wecom-rail); width: var(--wecom-list); display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; border-right: 1px solid #d6dee8; background: #f4f7fb; }
    .wecom-conversations-head { height: 62px; display: flex; align-items: center; gap: 8px; flex: 0 0 62px; padding: 13px 14px 10px; }
    .wecom-search { min-width: 0; height: 35px; flex: 1; display: flex; align-items: center; gap: 7px; padding: 0 10px; border-radius: 7px; background: #e5eaf0; color: #8291a4; }
    .wecom-search:focus-within { background: #fff; box-shadow: inset 0 0 0 1px #a9c9f6; }
    .wecom-search svg { width: 15px; height: 15px; flex: 0 0 15px; }
    .wecom-search input { width: 100%; height: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--wecom-text); font-size: 13px; }
    .wecom-search input::placeholder { color: #8a98aa; }
    .wecom-add { width: 35px; height: 35px; display: grid; place-items: center; flex: 0 0 35px; padding: 0; border: 0; border-radius: 7px; background: #e5eaf0; color: #5f7188; cursor: pointer; }
    .wecom-add:hover { background: #dce5ef; color: var(--wecom-blue); }
    .wecom-add svg { width: 17px; height: 17px; }
    .wecom-conversations-tabs { height: 38px; display: flex; align-items: center; gap: 18px; flex: 0 0 38px; padding: 0 15px; border-bottom: 1px solid #dfe6ee; }
    .wecom-conversations-tab { position: relative; height: 38px; padding: 0 2px; border: 0; background: transparent; color: #7c8b9e; font-size: 12px; cursor: pointer; }
    .wecom-conversations-tab.is-active { color: #1b2a3b; font-weight: 600; }
    .wecom-conversations-tab.is-active::after { position: absolute; right: 3px; bottom: 0; left: 3px; height: 2px; border-radius: 2px; background: var(--wecom-blue); content: ''; }
    .wecom-conversations-body { min-height: 0; flex: 1; overflow-y: auto; padding: 4px 0 16px; scrollbar-color: rgba(118,145,177,.42) transparent; scrollbar-width: thin; }
    .wecom-conversations-body::-webkit-scrollbar { width: 6px; }
    .wecom-conversations-body::-webkit-scrollbar-thumb { border-radius: 4px; background: rgba(118,145,177,.35); }
    .wecom-conversation-group-title { height: 28px; padding: 8px 14px 3px; color: #8b98aa; font-size: 11px; }
    .wecom-conversation { width: 100%; min-height: 68px; display: flex; align-items: center; gap: 10px; padding: 9px 13px; border: 0; border-radius: 0; background: transparent; color: var(--wecom-text); cursor: pointer; text-align: left; }
    .wecom-conversation:hover { background: #e8eef6; }
    .wecom-conversation.is-active { background: var(--wecom-blue); color: #fff; }
    .wecom-conversation-avatar { width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 44px; overflow: hidden; border-radius: 7px; background: #d6e8ff; color: #fff; font-size: 17px; font-weight: 700; }
    .wecom-conversation-avatar.is-group { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; padding: 2px; background: #fff; }
    .wecom-conversation-avatar.is-group i { display: grid; place-items: center; min-width: 0; min-height: 0; overflow: hidden; color: #fff; font-size: 8px; font-style: normal; font-weight: 700; }
    .wecom-conversation-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .wecom-conversation-top { min-width: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
    .wecom-conversation-name { min-width: 0; overflow: hidden; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-conversation-time { flex: 0 0 auto; color: #8a98aa; font-size: 10px; }
    .wecom-conversation-preview { min-width: 0; overflow: hidden; color: #8a98aa; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-conversation.is-active .wecom-conversation-time, .wecom-conversation.is-active .wecom-conversation-preview { color: rgba(255,255,255,.82); }
    .wecom-conversation-empty { padding: 28px 18px; color: #8b98aa; font-size: 12px; text-align: center; }

    html.${ROOT_CLASS} #sub2api-wecom-chat-header { position: fixed; z-index: 330; top: 0; right: var(--wecom-members); left: calc(var(--wecom-rail) + var(--wecom-list)); height: var(--wecom-header); display: flex; align-items: center; justify-content: space-between; gap: 20px; pointer-events: auto; padding: 0 18px; border-bottom: 1px solid #dce3eb; background: #fff; transition: left .18s ease, right .18s ease; }
    .wecom-chat-heading { min-width: 0; display: flex; align-items: center; gap: 10px; }
    .wecom-chat-avatar { display: none; }
    .wecom-chat-heading-copy { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .wecom-chat-title { min-width: 0; overflow: hidden; color: #111827; font-size: 17px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-chat-subtitle { min-width: 0; overflow: hidden; color: #75849a; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-chat-tools { display: flex; align-items: center; gap: 3px; flex: 0 0 auto; }
    .wecom-chat-tool { width: 34px; height: 34px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 7px; background: transparent; color: #60748d; cursor: pointer; }
    .wecom-chat-tool:hover, .wecom-chat-tool.is-active { background: var(--wecom-blue-soft); color: var(--wecom-blue); }
    .wecom-chat-tool svg { width: 18px; height: 18px; }
    .wecom-chat-more { position: fixed; z-index: 600; top: 58px; right: 18px; width: 184px; padding: 6px; border: 1px solid var(--wecom-border); border-radius: 8px; background: #fff; box-shadow: 0 10px 28px rgba(36,58,86,.18); pointer-events: auto; }
    .wecom-chat-more[hidden], .wecom-profile-popover[hidden] { display: none !important; }
    .wecom-popover-button { width: 100%; height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 9px; border: 0; border-radius: 5px; background: transparent; color: var(--wecom-text-2); font-size: 12px; cursor: pointer; text-align: left; }
    .wecom-popover-button:hover { background: var(--wecom-blue-soft); color: var(--wecom-blue); }
    .wecom-popover-button svg { width: 15px; height: 15px; }

    html.${ROOT_CLASS} #sub2api-wecom-members { position: fixed; z-index: 340; inset: 0 0 0 auto; width: var(--wecom-members); display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; border-left: 1px solid #d8e0e9; background: #fff; transition: transform .18s ease, opacity .18s ease; }
    .wecom-members-header { height: var(--wecom-header); display: flex; align-items: flex-end; justify-content: space-between; flex: 0 0 var(--wecom-header); padding: 0 12px 10px; border-bottom: 1px solid #e2e7ed; color: #536378; font-size: 12px; }
    .wecom-members-actions { display: flex; align-items: center; gap: 2px; }
    .wecom-members-actions button { width: 25px; height: 25px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 5px; background: transparent; color: #71839a; cursor: pointer; }
    .wecom-members-actions button:hover { background: #eef3f8; color: var(--wecom-blue); }
    .wecom-members-actions svg { width: 14px; height: 14px; }
    .wecom-members-summary { margin: 10px; padding: 10px; border: 1px solid #dce5ef; border-radius: 7px; background: #f5f9fe; }
    .wecom-members-summary-label { color: #8291a4; font-size: 10px; }
    .wecom-members-summary-value { margin-top: 3px; color: #326dac; font-size: 16px; font-weight: 700; }
    .wecom-members-subscription { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e1eaf4; color: #7658a8; font-size: 11px; }
    .wecom-members-body { min-height: 0; flex: 1; overflow-y: auto; padding: 2px 10px 18px; scrollbar-color: rgba(118,145,177,.38) transparent; scrollbar-width: thin; }
    .wecom-members-section-title { padding: 8px 2px 5px; color: #d08b1a; font-size: 11px; }
    .wecom-members-section-title.is-green { color: #42a45d; }
    .wecom-member { height: 34px; display: flex; align-items: center; gap: 8px; min-width: 0; padding: 0 3px; }
    .wecom-member-avatar { width: 23px; height: 23px; display: grid; place-items: center; flex: 0 0 23px; border-radius: 5px; color: #fff; font-size: 10px; font-weight: 700; }
    .wecom-member-name { min-width: 0; overflow: hidden; color: #25364b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-member-role { margin-left: auto; color: #8c98a8; font-size: 9px; }

    html.${ROOT_CLASS} #sub2api-wecom-composer { position: fixed; z-index: 330; right: var(--wecom-members); bottom: 0; left: calc(var(--wecom-rail) + var(--wecom-list)); height: var(--wecom-composer); padding: 0 16px 13px; pointer-events: none; background: var(--wecom-workspace); transition: left .18s ease, right .18s ease; }
    .wecom-composer-card { height: 100%; min-height: 128px; padding: 0; overflow: hidden; border: 1px solid #d6dee8; border-radius: 8px; background: #fff; box-shadow: 0 1px 2px rgba(34,55,80,.03); }
    .wecom-composer-tools { height: 38px; display: flex; align-items: center; gap: 3px; padding: 8px 11px 0; color: #71839a; }
    .wecom-composer-tool { width: 27px; height: 27px; display: grid; place-items: center; border: 0; border-radius: 5px; background: transparent; color: #71839a; }
    .wecom-composer-tool svg { width: 17px; height: 17px; }
    .wecom-composer-placeholder { min-height: 61px; padding: 8px 14px; color: #a8b0bc; font-size: 13px; }
    .wecom-composer-send { height: 28px; display: flex; align-items: center; justify-content: flex-end; padding: 0 15px 10px; color: #a8b0bc; font-size: 12px; }
    .wecom-composer-send svg { width: 15px; height: 15px; margin-right: 4px; }
    .wecom-profile-popover { position: fixed; z-index: 700; top: 54px; left: calc(var(--wecom-rail) - 3px); width: 214px; padding: 10px; border: 1px solid var(--wecom-border); border-radius: 8px; background: #fff; box-shadow: 0 12px 30px rgba(36,58,86,.2); pointer-events: auto; }
    .wecom-profile-head { display: flex; align-items: center; gap: 9px; padding: 4px 4px 10px; border-bottom: 1px solid #e8edf3; }
    .wecom-profile-head .wecom-avatar { width: 32px; height: 32px; border-radius: 6px; }
    .wecom-profile-name { min-width: 0; overflow: hidden; color: var(--wecom-text); font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .wecom-profile-caption { margin-top: 2px; color: var(--wecom-text-3); font-size: 10px; }
    .wecom-profile-actions { padding-top: 6px; }

    /* Existing page blocks become message bubbles while their controls stay live. */
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.card,.glass-card,.card-glass) { border-color: var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; box-shadow: 0 1px 2px rgba(38,56,78,.04) !important; backdrop-filter: none !important; transform: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation].card { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-stack="true"] { display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 0 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] { position: relative !important; width: min(100%,920px) !important; max-width: 100% !important; min-height: 54px; margin: 0 0 16px !important; padding: 30px 18px 16px 58px !important; overflow: visible !important; border: 1px solid var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; box-shadow: 0 1px 2px rgba(38,56,78,.04) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] { background-image: none !important; backdrop-filter: none !important; overflow-wrap: anywhere !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][data-wecom-side="right"] { align-self: flex-end !important; padding-right: 58px !important; border-color: #bcd7f8 !important; background: #dcecff !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] > .wecom-sender-label { position: absolute; top: 9px; left: 58px; max-width: calc(100% - 76px); overflow: hidden; color: #7f8ea2; font-size: 10px; line-height: 14px; text-overflow: ellipsis; white-space: nowrap; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][data-wecom-side="right"] > .wecom-sender-label { right: 58px; left: auto; color: #5e7ea4; text-align: right; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message]::before { position: absolute; top: 9px; left: 14px; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 6px; background: var(--wecom-avatar-bg,#4389f5); color: #fff; content: attr(data-wecom-avatar); font-size: 12px; font-weight: 700; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][data-wecom-side="right"]::before { right: 14px; left: auto; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message]::after { display: block; margin-top: 9px; color: #9aa6b6; content: attr(data-wecom-meta); font-size: 10px; line-height: 13px; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][data-wecom-side="right"]::after { text-align: right; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] :is(.card,.glass-card,.card-glass) { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] :is([class*="bg-gradient-to-"],[class*="backdrop-blur"]) { background-image: none !important; backdrop-filter: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] :is(pre,code) { max-width: 100% !important; overflow-x: auto !important; overflow-wrap: anywhere !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message] pre { white-space: pre-wrap !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][class*="emerald"], html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][class*="success"] { border-color: #a7d8b7 !important; background: #edf9f0 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][class*="red"], html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][class*="danger"] { border-color: #e8b0b0 !important; background: #fff3f3 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][class*="amber"], html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message][class*="warning"] { border-color: #ebd09b !important; background: #fff9ec !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-table-shell] { overflow: visible !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation][data-wecom-table-frame] { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-table-frame] { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table { display: block !important; width: 100% !important; border-collapse: separate !important; background: transparent !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table thead { position: absolute !important; width: 1px !important; height: 1px !important; overflow: hidden !important; clip: rect(0 0 0 0) !important; white-space: nowrap !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody { display: flex !important; flex-direction: column !important; width: 100% !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row] { position: relative !important; width: min(100%,980px) !important; display: flex !important; flex-wrap: wrap !important; align-items: flex-start !important; margin: 0 0 13px !important; padding: 30px 12px 9px 58px !important; border: 1px solid var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; box-shadow: 0 1px 2px rgba(38,56,78,.04) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row][data-wecom-side="right"] { align-self: flex-end !important; padding-right: 58px !important; border-color: #bcd7f8 !important; background: #dcecff !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row]::before { position: absolute; top: 9px; left: 14px; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 6px; background: var(--wecom-avatar-bg,#4389f5); color: #fff; content: attr(data-wecom-avatar); font-size: 12px; font-weight: 700; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row][data-wecom-side="right"]::before { right: 14px; left: auto; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row]::after { display: block; width: 100%; margin-top: 8px; color: #9aa6b6; content: attr(data-wecom-meta); font-size: 10px; line-height: 13px; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row][data-wecom-side="right"]::after { text-align: right; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row] > td { display: block !important; flex: 1 1 170px !important; min-width: 0 !important; padding: 4px 8px !important; border: 0 !important; background: transparent !important; color: var(--wecom-text-2) !important; font-size: 12px !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row] > td::before { display: block; margin-bottom: 2px; color: #8b98aa; content: attr(data-wecom-label); font-size: 10px; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row] > td:last-child { flex: 0 0 auto !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] table.wecom-table tbody tr[data-wecom-table-row] :is(button,a) { max-width: 100%; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .table-page-layout { display: flex !important; flex-direction: column !important; height: auto !important; min-height: 100% !important; gap: 10px !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .table-page-layout .layout-section-scrollable { order: 1 !important; min-height: 0 !important; overflow: visible !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .table-page-layout .table-wrapper { min-height: 0 !important; overflow: auto !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .table-page-layout .layout-section-fixed[data-wecom-fixed-role="actions"] { order: 2 !important; position: sticky !important; bottom: 0 !important; z-index: 6 !important; margin-top: auto !important; padding-top: 6px !important; background: var(--wecom-workspace) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .table-page-layout .layout-section-fixed[data-wecom-fixed-role="pagination"] { order: 3 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message].layout-section-scrollable { width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message].layout-section-scrollable::before, html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message].layout-section-scrollable::after, html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message].layout-section-scrollable > .wecom-sender-label { display: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message].layout-section-fixed { align-self: flex-end !important; width: min(100%,920px) !important; border-color: #bcd7f8 !important; background: #dcecff !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-message].layout-section-fixed > .wecom-sender-label { right: 58px !important; left: auto !important; color: #5e7ea4 !important; text-align: right !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] [data-wecom-fixed-role="pagination"]:not(.layout-section-fixed) { align-self: flex-start !important; width: min(100%,920px) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.btn,button[class*="rounded-xl"],a[class*="rounded-xl"]) { min-height: 32px !important; border-radius: 6px !important; box-shadow: none !important; transform: none !important; white-space: nowrap !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .btn-primary { border: 1px solid var(--wecom-blue) !important; background: var(--wecom-blue) !important; color: #fff !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .btn-primary:hover { background: var(--wecom-blue-hover) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.btn-secondary,.btn-ghost) { border: 1px solid var(--wecom-border-strong) !important; background: #fff !important; color: var(--wecom-text-2) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .btn-danger, html.${ROOT_CLASS} main[data-wecom-conversation] .btn-outline-danger { border: 1px solid #e5a1a1 !important; background: #fff3f3 !important; color: #c34848 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .btn-success { border: 1px solid #94d2aa !important; background: #e9f8ee !important; color: #237a42 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .btn-warning { border: 1px solid #ebc98b !important; background: #fff8e8 !important; color: #9a6811 !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.btn-stripe,.btn-airwallex) { border: 1px solid #4964c6 !important; background: #536bd1 !important; color: #fff !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select,.input,.select-trigger,.date-picker-trigger,.date-picker-input) { border: 1px solid var(--wecom-border-strong) !important; border-radius: 6px !important; background: #fff !important; background-image: none !important; box-shadow: none !important; color: var(--wecom-text) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.tabs,.settings-tabs) { gap: 2px !important; padding: 4px !important; border: 1px solid #dce3ec !important; border-radius: 7px !important; background: #e9eef4 !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .settings-tabs-shell { position: relative !important; top: auto !important; z-index: auto !important; width: 100% !important; max-width: 100% !important; margin: 0 0 12px !important; border: 1px solid #dce3ec !important; border-radius: 7px !important; background: #e9eef4 !important; box-shadow: none !important; backdrop-filter: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .settings-tabs-scroll { max-width: 100% !important; overflow-x: auto !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .settings-tabs { width: max-content !important; min-width: 100% !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .custom-page-layout { width: 100% !important; min-height: 100% !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .custom-page-layout > .card { min-height: 100% !important; border-radius: 8px !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .toc-sidebar { width: 220px !important; flex: 0 0 220px !important; border-right: 1px solid var(--wecom-border) !important; background: #f7f9fc !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .toc-header { height: 42px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 0 12px !important; border-bottom: 1px solid var(--wecom-border) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .toc-item { display: block !important; margin: 2px 7px !important; padding: 6px 8px !important; border-radius: 5px !important; color: var(--wecom-text-2) !important; font-size: 12px !important; text-decoration: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .toc-item:hover, html.${ROOT_CLASS} main[data-wecom-conversation] .toc-item.toc-active { background: var(--wecom-blue-soft) !important; color: var(--wecom-blue) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] .markdown-page-content { min-width: 0 !important; background: #fff !important; color: var(--wecom-text) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.tab,.settings-tab) { min-height: 31px !important; border: 0 !important; border-radius: 5px !important; background: transparent !important; color: var(--wecom-text-2) !important; box-shadow: none !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.tab-active,.settings-tab-active) { background: #fff !important; color: var(--wecom-blue) !important; box-shadow: 0 1px 3px rgba(36,58,86,.12) !important; }
    html.${ROOT_CLASS} main[data-wecom-conversation] :is(.modal-content,.dialog-container) { border: 1px solid var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; box-shadow: 0 18px 50px rgba(30,48,71,.22) !important; }
    html.${ROOT_CLASS} :is(.select-dropdown-portal,.select-dropdown,.date-picker-dropdown,body > .dropdown) { border: 1px solid var(--wecom-border) !important; border-radius: 8px !important; background: #fff !important; box-shadow: 0 9px 26px rgba(36,58,86,.16) !important; }
    html.${ROOT_CLASS} :is(.modal-overlay,.dialog-overlay) { background: rgba(24,35,49,.42) !important; backdrop-filter: blur(2px) !important; }
    html.${ROOT_CLASS} .fixed.inset-0:not(#${SHELL_ID}) { z-index: 1000 !important; }
    html.${ROOT_CLASS} :is([role="dialog"],.modal-overlay,.dialog-overlay) { z-index: 1000 !important; }
    html.${ROOT_CLASS} .toast { border-radius: 7px !important; background: #fff !important; box-shadow: 0 8px 24px rgba(36,58,86,.16) !important; }
    html.${ROOT_CLASS}.wecom-members-hidden { --wecom-members: 0px; }
    html.${ROOT_CLASS}.wecom-members-hidden #sub2api-wecom-members { display: none !important; }
    @media (max-width: 1200px) { html.${ROOT_CLASS} { --wecom-list: 270px; --wecom-members: 190px; } }
    @media (max-width: 980px) { html.${ROOT_CLASS} { --wecom-rail: 86px; --wecom-list: 250px; --wecom-members: 0px; } html.${ROOT_CLASS} #sub2api-wecom-members { display: flex !important; width: min(280px,calc(100vw - var(--wecom-rail) - 16px)); transform: translateX(100%); box-shadow: -12px 0 28px rgba(36,58,86,.18); } html.${ROOT_CLASS}.wecom-members-open #sub2api-wecom-members { transform: translateX(0); } html.${ROOT_CLASS}.wecom-members-hidden #sub2api-wecom-members { display: none !important; } .wecom-rail-label, .wecom-rail-brand-copy { display: none; } .wecom-rail-brand { justify-content: center; padding: 0; } .wecom-rail-item { justify-content: center; padding: 0; } }
    @media (max-width: 680px) { html.${ROOT_CLASS} { --wecom-rail: 60px; --wecom-list: min(260px,calc(100vw - 60px)); --wecom-header: 68px; --wecom-composer: 118px; } html.${ROOT_CLASS} #sub2api-wecom-chat-header { padding: 0 10px; } html.${ROOT_CLASS} [data-wecom-app-content] > main { padding: 14px 16px 20px !important; } .wecom-conversation-avatar { width: 38px; height: 38px; flex-basis: 38px; } .wecom-conversation { min-height: 60px; padding-right: 9px; padding-left: 9px; } .wecom-chat-title { font-size: 14px; } .wecom-chat-tool[data-action="more"] { display: none; } }
  `

  const state = { shell: null, navSignature: '', contentSignature: '', headerSignature: '', membersSignature: '', frame: 0, navExpansionPending: false, documentBound: false }

  function icon(name, size = 18) {
    const path = ICON_PATHS[name] || ICON_PATHS.message
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
  }

  function hash(value) {
    let result = 0
    const text = String(value || '?')
    for (let index = 0; index < text.length; index += 1) result = (result * 31 + text.charCodeAt(index)) | 0
    return Math.abs(result)
  }

  function avatarLetter(value) {
    const first = [...String(value || '?').trim()][0] || '?'
    return /[a-z]/i.test(first) ? first.toUpperCase() : first
  }

  function avatarColor(value) {
    return AVATAR_COLORS[hash(value) % AVATAR_COLORS.length]
  }

  function avatarGradient(value) {
    const seed = hash(value)
    return `linear-gradient(145deg,${AVATAR_COLORS[seed % AVATAR_COLORS.length]},${AVATAR_COLORS[(seed + 3) % AVATAR_COLORS.length]})`
  }

  function avatarMarkup(seed, label) {
    const base = hash(seed)
    if (base % 3 === 0) {
      const cells = Array.from({ length: 9 }, (_, index) => `<i style="background:${AVATAR_COLORS[(base + index * 3) % AVATAR_COLORS.length]}">${AVATAR_GLYPHS[(base + index * 7) % AVATAR_GLYPHS.length]}</i>`).join('')
      return `<span class="wecom-conversation-avatar is-group" data-wecom-avatar="${escapeHtml(avatarLetter(label))}" aria-hidden="true">${cells}</span>`
    }
    return `<span class="wecom-conversation-avatar" data-wecom-avatar="${escapeHtml(avatarLetter(label))}" style="background:${avatarGradient(seed)}" aria-hidden="true">${escapeHtml(avatarLetter(label))}</span>`
  }

  function injectStyle() {
    const nodes = [...document.querySelectorAll(`#${STYLE_ID}`)]
    const current = nodes[0]
    nodes.slice(1).forEach((node) => node.remove())
    if (current) {
      if (!current.textContent.includes(STYLE_MARKER)) current.textContent = CSS
      return
    }
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    ;(document.head || document.documentElement).appendChild(style)
  }

  function appLayoutPresent() {
    const app = document.querySelector('#app')
    return Boolean(app && app.querySelector('aside.sidebar') && app.querySelector('nav.sidebar-nav') && app.querySelector('header.glass') && app.querySelector('main'))
  }

  function sourceNodes() {
    const aside = document.querySelector('aside.sidebar')
    const header = document.querySelector('header.glass')
    const main = document.querySelector('main')
    const content = aside?.nextElementSibling && aside.nextElementSibling.contains(main) ? aside.nextElementSibling : main?.parentElement
    if (aside && aside.dataset.wecomSource !== 'sidebar') aside.dataset.wecomSource = 'sidebar'
    if (header && header.dataset.wecomSource !== 'header') header.dataset.wecomSource = 'header'
    if (main && main.dataset.wecomConversation !== 'true') main.dataset.wecomConversation = 'true'
    if (content && content.dataset.wecomAppContent !== 'true') content.dataset.wecomAppContent = 'true'
    const localeButton = [...(header?.querySelectorAll('button[title]') || [])].find((button) => {
      const code = [...button.querySelectorAll('span')].map(firstVisibleText).find((text) => /^[A-Z]{2,3}$/.test(text))
      return Boolean(code) || /中文|english|日本|한국|español|français|deutsch/i.test(button.getAttribute('title') || '')
    }) || header?.querySelector(LOCALE_SELECTOR)
    if (localeButton) {
      localeButton.dataset.wecomLocaleButton = 'true'
      if (localeButton.parentElement) localeButton.parentElement.dataset.wecomLocaleSource = 'true'
    }
    return { aside, header, main, content }
  }

  function firstVisibleText(element) {
    return (element?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function originalButton(selector) {
    const scoped = selector.split(',').map((part) => `header.glass ${part.trim()}`).join(',')
    return document.querySelector(scoped) || document.querySelector(selector)
  }

  function clickOriginal(selector) {
    const target = originalButton(selector)
    if (!target) return false
    try { target.click() } catch { try { target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })) } catch { return false } }
    return true
  }

  function sourceNavigation() {
    const nav = document.querySelector('nav.sidebar-nav')
    if (!nav) return []
    const entries = []
    const seen = new Set()
    const sections = [...nav.querySelectorAll(':scope > .sidebar-section')]
    nav.querySelectorAll('a.sidebar-link[href]').forEach((link) => {
      const href = link.getAttribute('href') || ''
      const label = firstVisibleText(link)
      const key = routeKey(href)
      if (!href || !label || seen.has(key)) return
      seen.add(key)
      const section = link.closest('.sidebar-section')
      const sectionIndex = sections.indexOf(section)
      const group = /^\/custom\//i.test(routePath(href))
        ? '自定义菜单'
        : firstVisibleText(section?.querySelector('.sidebar-section-title')) || (sectionIndex === 0 ? '管理工作台' : sectionIndex > 0 ? '我的账户' : '工作台')
      entries.push({ href, label, group, link })
    })
    return entries
  }

  function routeKey(value) {
    try {
      const url = new URL(value || location.href, location.href)
      return `${url.pathname}${url.search}${url.hash}`
    } catch {
      return String(value || '').split('#')[0]
    }
  }

  function routePath(value) {
    try { return new URL(value || location.href, location.href).pathname }
    catch { return String(value || '').split(/[?#]/, 1)[0] }
  }

  function expandSourceGroups() {
    const nav = document.querySelector('nav.sidebar-nav')
    if (!nav || state.navExpansionPending) return
    const aside = nav.closest('aside.sidebar')
    const expandButton = [...(aside?.querySelectorAll('button.sidebar-link') || [])].find((button) => /展开|expand/i.test(button.getAttribute('title') || ''))
    if (expandButton) {
      state.navExpansionPending = true
      try { expandButton.click() } catch { /* 页面卸载时忽略 */ }
      setTimeout(() => { state.navExpansionPending = false; scheduleSync() }, 80)
      return
    }
    const buttons = [...nav.querySelectorAll(':scope button.sidebar-link')].filter((button) => !button.nextElementSibling?.querySelector('a.sidebar-link[href]'))
    if (!buttons.length) return
    state.navExpansionPending = true
    buttons.forEach((button) => { try { button.click() } catch { /* 页面卸载时忽略 */ } })
    setTimeout(() => { state.navExpansionPending = false; scheduleSync() }, 60)
  }

  function menuSummary(label, href) {
    const text = `${label} ${href}`
    if (/用户/.test(text)) return '查看成员、状态与账户权限'
    if (/账号|渠道/.test(text)) return '管理连接、路由与可用模型'
    if (/设置|配置/.test(text)) return '更新工作台运行参数'
    if (/使用|日志|审计/.test(text)) return '查看最近的系统活动'
    if (/订阅|兑换|优惠|订单/.test(text)) return '处理订阅和账户服务'
    if (/生图|图片/.test(text)) return '提交图像生成任务'
    return '工作台助手已准备好'
  }

  function ensureShell() {
    if (!document.body) return null
    const shells = [...document.querySelectorAll(`#${SHELL_ID}`)]
    let shell = shells[0]
    shells.slice(1).forEach((node) => node.remove())
    const required = ['#sub2api-wecom-rail', '#sub2api-wecom-conversations', '#sub2api-wecom-chat-header', '#sub2api-wecom-members', '#sub2api-wecom-composer']
    if (shell && (shell.dataset.wecomVersion !== '3' || !required.every((selector) => shell.querySelector(selector)))) { shell.remove(); shell = null }
    if (shell) { state.shell = shell; return shell }
    shell = document.createElement('div')
    shell.id = SHELL_ID
    shell.dataset.wecomVersion = '3'
    shell.innerHTML = `
      <nav id="sub2api-wecom-rail" aria-label="企业微信工作台">
        <div class="wecom-rail-brand"><span class="wecom-rail-logo" aria-label="企业微信">${WECOM_LOGO}</span><span class="wecom-rail-brand-copy"><strong>企业微信</strong><span>工作台</span></span></div>
        <div class="wecom-rail-profile"><button type="button" data-action="profile" aria-label="打开账户和语言菜单"><span class="wecom-avatar" data-role="rail-avatar" data-wecom-avatar="F">F</span><span class="wecom-avatar-badge" data-role="rail-badge" hidden></span></button></div>
        <div class="wecom-rail-items"><button type="button" class="wecom-rail-item" data-action="messages" data-active="true">${icon('message')}<span class="wecom-rail-label">消息</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('mail')}<span class="wecom-rail-label">邮件</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('document')}<span class="wecom-rail-label">文档</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('calendar')}<span class="wecom-rail-label">日程</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('todo')}<span class="wecom-rail-label">待办</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('meeting')}<span class="wecom-rail-label">会议</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('workbench')}<span class="wecom-rail-label">工作台</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('contacts')}<span class="wecom-rail-label">通讯录</span></button><button type="button" class="wecom-rail-item" data-action="decorative">${icon('drive')}<span class="wecom-rail-label">微盘</span></button></div>
        <div class="wecom-rail-bottom"><button type="button" class="wecom-rail-item" data-action="decorative">${icon('settings')}<span class="wecom-rail-label">高级功能</span></button></div>
      </nav>
      <aside id="sub2api-wecom-conversations" aria-label="工作台会话列表"><div class="wecom-conversations-head"><label class="wecom-search">${icon('search', 15)}<input type="search" data-role="conversation-search" placeholder="搜索" autocomplete="off" aria-label="搜索工作台会话"></label><button type="button" class="wecom-add" data-action="announcement" aria-label="打开系统公告">${icon('plus', 17)}</button></div><div class="wecom-conversations-tabs"><button type="button" class="wecom-conversations-tab is-active" data-filter="all">消息</button><button type="button" class="wecom-conversations-tab" data-filter="unread">未读</button></div><div class="wecom-conversations-body" data-role="conversation-body"></div></aside>
      <section id="sub2api-wecom-chat-header" aria-label="当前工作台会话"><div class="wecom-chat-heading"><span class="wecom-chat-avatar" data-role="chat-avatar" data-wecom-avatar="工">工</span><div class="wecom-chat-heading-copy"><div class="wecom-chat-title" data-role="chat-title">管理控制台</div><div class="wecom-chat-subtitle" data-role="chat-subtitle">系统概览与统计数据</div></div></div><div class="wecom-chat-tools"><button type="button" class="wecom-chat-tool" data-action="video" aria-label="视频会议">${icon('video')}</button><button type="button" class="wecom-chat-tool" data-action="phone" aria-label="电话">${icon('phone')}</button><button type="button" class="wecom-chat-tool" data-action="toggle-members" aria-label="群成员">${icon('users')}</button><button type="button" class="wecom-chat-tool" data-action="more" aria-label="更多">${icon('more')}</button></div></section>
      <aside id="sub2api-wecom-members" aria-label="当前会话成员"><div class="wecom-members-header"><span>群成员 · <b data-role="member-count">4</b></span><span class="wecom-members-actions"><button type="button" data-action="toggle-members" aria-label="关闭成员栏">${icon('users', 14)}</button><button type="button" data-action="more" aria-label="成员更多">${icon('more', 14)}</button></span></div><div class="wecom-members-summary"><div class="wecom-members-summary-label">账户余额</div><div class="wecom-members-summary-value" data-role="member-balance">--</div><div class="wecom-members-subscription" data-role="member-subscription" hidden></div></div><div class="wecom-members-body" data-role="members-body"></div></aside>
      <div id="sub2api-wecom-composer" aria-hidden="true"><div class="wecom-composer-card"><div class="wecom-composer-tools"><span class="wecom-composer-tool">${icon('emoji', 17)}</span><span class="wecom-composer-tool">${icon('clip', 17)}</span><span class="wecom-composer-tool">${icon('image', 17)}</span><span class="wecom-composer-tool">${icon('plus', 17)}</span></div><div class="wecom-composer-placeholder">发送给当前工作台会话</div><div class="wecom-composer-send">${icon('send', 15)}<span>发送</span></div></div></div>
      <div class="wecom-profile-popover" data-role="profile-popover" hidden><div class="wecom-profile-head"><span class="wecom-avatar" data-role="popover-avatar" data-wecom-avatar="F">F</span><div><div class="wecom-profile-name" data-role="profile-name">工作台管理员</div><div class="wecom-profile-caption">企业微信工作台</div></div></div><div class="wecom-profile-actions"><button type="button" class="wecom-popover-button" data-action="account">${icon('contacts', 15)}账户菜单</button><button type="button" class="wecom-popover-button" data-action="language">${icon('document', 15)}切换语言</button><button type="button" class="wecom-popover-button" data-action="subscription" data-role="subscription-action" hidden>${icon('calendar', 15)}订阅状态</button><button type="button" class="wecom-popover-button" data-action="announcement">${icon('bell', 15)}系统公告</button></div></div>
      <div class="wecom-chat-more" data-role="more-popover" hidden><button type="button" class="wecom-popover-button" data-action="refresh">${icon('refresh', 15)}刷新当前页面</button><button type="button" class="wecom-popover-button" data-action="account">${icon('contacts', 15)}打开账户菜单</button><button type="button" class="wecom-popover-button" data-action="announcement">${icon('bell', 15)}查看系统公告</button></div>
    `
    document.body.appendChild(shell)
    shell.querySelectorAll('.wecom-rail-item').forEach((item) => { item.title = item.querySelector('.wecom-rail-label')?.textContent?.trim() || '工作台' })
    shell.querySelectorAll('.wecom-chat-tool').forEach((item) => { item.title = item.getAttribute('aria-label') || '工作台操作' })
    state.shell = shell
    state.navSignature = ''; state.headerSignature = ''; state.membersSignature = ''
    bindShell(shell)
    return shell
  }

  function bindShell(shell) {
    if (shell.dataset.bound === 'true') return
    shell.dataset.bound = 'true'
    shell.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-action],[data-filter],.wecom-conversation') : null
      if (!target || !shell.contains(target)) return
      event.stopPropagation()
      const action = target.getAttribute('data-action')
      if (target.classList.contains('wecom-conversation')) {
        event.preventDefault()
        const href = target.getAttribute('data-href') || ''
      if (target.getAttribute('data-kind') === 'announcement') clickOriginal(ANNOUNCEMENT_SELECTOR)
        else [...document.querySelectorAll('aside.sidebar a.sidebar-link[href]')].find((candidate) => routeKey(candidate.getAttribute('href')) === routeKey(href))?.click()
        return
      }
      if (target.hasAttribute('data-filter')) {
        shell.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('is-active', button === target))
        shell.dataset.conversationFilter = target.getAttribute('data-filter') || 'all'
        filterConversations(); return
      }
      if (action === 'profile') togglePopover('profile')
      else if (action === 'more') togglePopover('more')
      else if (action === 'toggle-members') toggleMembers()
      else if (action === 'account') { closePopovers(); clickOriginal(ACCOUNT_SELECTOR) }
      else if (action === 'language') { closePopovers(); clickOriginal('[data-wecom-locale-button],' + LOCALE_SELECTOR) }
      else if (action === 'subscription') { closePopovers(); if (!clickOriginal(SUBSCRIPTION_SELECTOR)) [...document.querySelectorAll('aside.sidebar a.sidebar-link[href]')].find((candidate) => routeKey(candidate.getAttribute('href')) === '/subscriptions')?.click() }
      else if (action === 'announcement') { closePopovers(); clickOriginal(ANNOUNCEMENT_SELECTOR) }
      else if (action === 'refresh') { closePopovers(); location.reload() }
      else if (action === 'messages') shell.querySelector('[data-role="conversation-search"]')?.focus()
      else event.preventDefault()
    })
    shell.querySelector('[data-role="conversation-search"]')?.addEventListener('input', filterConversations)
    if (!state.documentBound) {
      state.documentBound = true
      document.addEventListener('click', (event) => { if (state.shell && !state.shell.contains(event.target)) closePopovers() })
    }
  }

  function togglePopover(name) {
    const shell = state.shell
    if (!shell) return
    const profile = shell.querySelector('[data-role="profile-popover"]')
    const more = shell.querySelector('[data-role="more-popover"]')
    const openProfile = name === 'profile' && profile?.hidden
    const openMore = name === 'more' && more?.hidden
    if (profile) profile.hidden = !openProfile
    if (more) more.hidden = !openMore
  }

  function closePopovers() {
    state.shell?.querySelector('[data-role="profile-popover"]')?.setAttribute('hidden', '')
    state.shell?.querySelector('[data-role="more-popover"]')?.setAttribute('hidden', '')
  }

  function toggleMembers() {
    const root = document.documentElement
    if (window.matchMedia?.('(max-width: 980px)').matches) {
      root.classList.remove('wecom-members-hidden')
      root.classList.toggle('wecom-members-open')
    } else root.classList.toggle('wecom-members-hidden')
  }

  function syncConversations() {
    const shell = state.shell
    if (!shell) return
    expandSourceGroups()
    const entries = sourceNavigation()
    const currentPath = `${location.pathname}${location.search}${location.hash}`
    const signature = `${routeKey(currentPath)}|${entries.map((entry) => `${routeKey(entry.href)}:${entry.label}:${entry.group}`).join('|')}`
    if (signature === state.navSignature) { syncConversationActive(currentPath); return }
    state.navSignature = signature
    const grouped = new Map([['系统消息', [{ kind: 'announcement', href: '', label: '系统公告', preview: '查看平台通知与公告' }]]])
    entries.forEach((entry) => { if (!grouped.has(entry.group)) grouped.set(entry.group, []); grouped.get(entry.group).push({ ...entry, preview: menuSummary(entry.label, entry.href) }) })
    const body = shell.querySelector('[data-role="conversation-body"]')
    if (!body) return
    body.innerHTML = [...grouped.entries()].map(([group, items]) => `<div class="wecom-conversation-group-title">${escapeHtml(group)}</div>${items.map((item) => `<button type="button" class="wecom-conversation" data-href="${escapeHtml(item.href)}" data-kind="${item.kind || 'route'}" data-search="${escapeHtml(`${item.label} ${item.preview}`.toLowerCase())}">${avatarMarkup(item.href || item.label, item.label)}<span class="wecom-conversation-info"><span class="wecom-conversation-top"><span class="wecom-conversation-name">${escapeHtml(item.label)}</span><time class="wecom-conversation-time">刚刚</time></span><span class="wecom-conversation-preview">${escapeHtml(item.preview)}</span></span></button>`).join('')}`).join('') || '<div class="wecom-conversation-empty">暂无工作台会话</div>'
    syncConversationActive(currentPath)
    filterConversations()
  }

  function syncConversationActive(currentPath = `${location.pathname}${location.search}${location.hash}`) {
    const current = routeKey(currentPath)
    state.shell?.querySelectorAll('.wecom-conversation[data-href]').forEach((row) => {
      const rawHref = row.getAttribute('data-href') || ''
      const href = rawHref ? routeKey(rawHref) : ''
      const currentPathname = routePath(current)
      const hrefPathname = rawHref ? routePath(rawHref) : ''
      row.classList.toggle('is-active', Boolean(href && (current === href || current.startsWith(`${href}/`) || currentPathname === hrefPathname || currentPathname.startsWith(`${hrefPathname}/`))))
    })
  }

  function filterConversations() {
    const shell = state.shell
    if (!shell) return
    const query = (shell.querySelector('[data-role="conversation-search"]')?.value || '').trim().toLowerCase()
    const filter = shell.dataset.conversationFilter || 'all'
    shell.querySelectorAll('.wecom-conversation').forEach((row) => { const matchesText = !query || (row.getAttribute('data-search') || '').includes(query); const matchesFilter = filter !== 'unread' || row.classList.contains('is-active'); row.hidden = !(matchesText && matchesFilter) })
    shell.querySelectorAll('.wecom-conversation-group-title').forEach((title) => { let sibling = title.nextElementSibling; let visible = false; while (sibling && !sibling.classList.contains('wecom-conversation-group-title')) { if (sibling.classList.contains('wecom-conversation') && !sibling.hidden) visible = true; sibling = sibling.nextElementSibling } title.hidden = !visible })
  }

  function syncHeaderAndMembers(source) {
    const shell = state.shell
    if (!shell || !source.header) return
    const title = firstVisibleText(source.header.querySelector('h1')) || document.title.replace(/\s+-\s+.*$/, '') || '工作台'
    const subtitle = firstVisibleText(source.header.querySelector('h1 + p')) || '企业微信工作台'
    const balance = readBalance(source.header)
    const subscription = readSubscription(source.header)
    const accountText = readAccountName(source.header) || '工作台管理员'
    const compactBalance = balance
    const signature = `${title}|${subtitle}|${compactBalance}|${accountText}|${subscription}`
    if (signature === state.headerSignature) return
    state.headerSignature = signature
    shell.querySelector('[data-role="chat-title"]').textContent = title
    shell.querySelector('[data-role="chat-subtitle"]').textContent = subtitle
    const chatAvatar = shell.querySelector('[data-role="chat-avatar"]')
    if (chatAvatar) { chatAvatar.textContent = avatarLetter(title); chatAvatar.dataset.wecomAvatar = avatarLetter(title); chatAvatar.style.background = avatarGradient(title) }
    shell.querySelector('[data-role="member-balance"]').textContent = compactBalance
    const subscriptionNode = shell.querySelector('[data-role="member-subscription"]')
    if (subscriptionNode) { subscriptionNode.textContent = subscription; subscriptionNode.hidden = !subscription }
    const subscriptionAction = shell.querySelector('[data-role="subscription-action"]')
    if (subscriptionAction) subscriptionAction.hidden = !subscription
    shell.querySelector('[data-role="profile-name"]').textContent = accountText.replace(/管理员.*$/, '管理员')
    const letter = avatarLetter(accountText)
    shell.querySelectorAll('[data-role="rail-avatar"],[data-role="popover-avatar"]').forEach((avatar) => { avatar.textContent = letter; avatar.dataset.wecomAvatar = letter; avatar.style.background = avatarGradient(accountText) })
  }

  function syncMembers(source) {
    const shell = state.shell
    if (!shell) return
    const title = firstVisibleText(source.header?.querySelector('h1')) || '工作台'
    const account = readAccountName(source.header) || '工作台管理员'
    const balance = readBalance(source.header)
    const subscription = readSubscription(source.header)
    const members = [{ name: account || '管理员', role: '群主' }, { name: '工作台助手', role: '助手' }, { name: '系统通知', role: '' }, { name: title.replace(/管理|设置/g, '') || '当前模块', role: '' }]
    const signature = `${title}|${account}|${balance}|${subscription}|${members.map((item) => item.name).join('|')}`
    if (signature === state.membersSignature) return
    state.membersSignature = signature
    shell.querySelector('[data-role="member-count"]').textContent = String(members.length)
    shell.querySelector('[data-role="member-balance"]').textContent = balance
    const subscriptionNode = shell.querySelector('[data-role="member-subscription"]')
    if (subscriptionNode) { subscriptionNode.textContent = subscription; subscriptionNode.hidden = !subscription }
    const subscriptionAction = shell.querySelector('[data-role="subscription-action"]')
    if (subscriptionAction) subscriptionAction.hidden = !subscription
    shell.querySelector('[data-role="members-body"]').innerHTML = `<div class="wecom-members-section-title">群主/管理员</div>${memberMarkup(members[0])}<div class="wecom-members-section-title is-green">群成员</div>${members.slice(1).map(memberMarkup).join('')}`
  }

  function memberMarkup(item) {
    return `<div class="wecom-member"><span class="wecom-member-avatar" data-wecom-avatar="${escapeHtml(avatarLetter(item.name))}" style="background:${avatarGradient(item.name)}">${escapeHtml(avatarLetter(item.name))}</span><span class="wecom-member-name">${escapeHtml(item.name)}</span>${item.role ? `<span class="wecom-member-role">${escapeHtml(item.role)}</span>` : ''}</div>`
  }

  function readBalance(header) {
    const source = firstVisibleText(header?.querySelector('[class*="bg-primary-50"]'))
    return source.match(/(?:[$¥￥€£]\s*[\d,.]+|[\d,.]+\s*(?:USD|CNY|EUR|GBP))/i)?.[0] || '--'
  }

  function readSubscription(header) {
    const node = header?.querySelector('[class*="bg-purple-50"],[title*="订阅"],[title*="subscription" i]')
    if (!node) return ''
    const text = firstVisibleText(node)
    const title = node.getAttribute('title') || ''
    return text ? `活跃订阅 · ${text}` : title
  }

  function readAccountName(header) {
    const button = header?.querySelector(ACCOUNT_SELECTOR)
    const name = firstVisibleText(button?.querySelector('.text-sm.font-medium,[class*="text-sm"][class*="font-medium"]'))
    if (name) return name
    const raw = firstVisibleText(button)
    const role = [...(button?.children || [])].map(firstVisibleText).find((text) => /^(管理员|用户|普通用户|operator|admin)$/i.test(text)) || ''
    const avatar = firstVisibleText(button?.querySelector('[class*="h-8"][class*="w-8"],[class*="h-9"][class*="w-9"]'))
    return raw.replace(role, '').replace(avatar, '').trim()
  }

  function markSender(node, side, seed, sender) {
    if (!node) return
    node.dataset.wecomMessage = 'true'
    node.dataset.wecomSide = side
    node.dataset.wecomAvatar = avatarLetter(seed)
    node.dataset.wecomMeta = `${sender} · 刚刚`
    node.style.setProperty('--wecom-avatar-bg', avatarGradient(seed))
    let label = node.querySelector(':scope > .wecom-sender-label')
    if (!label) { label = document.createElement('span'); label.className = 'wecom-sender-label'; label.setAttribute('aria-hidden', 'true'); node.prepend(label) }
    label.textContent = sender
  }

  function markTableContent(main) {
    const page = main.querySelector('.table-page-layout')
    if (page) {
      const fixedSections = [...page.querySelectorAll(':scope > .layout-section-fixed')]
      fixedSections.forEach((node, index) => {
        const text = firstVisibleText(node)
        const pagination = /分页|上一页|下一页|每页|页码|共\s*\d+\s*页/i.test(text) || Boolean(node.querySelector('[aria-label*="页"],[aria-label*="page" i]'))
        const role = pagination ? 'pagination' : 'actions'
        node.dataset.wecomFixedRole = role
        markSender(node, pagination ? 'left' : 'right', `${location.pathname}-${role}-${index}`, pagination ? '系统通知' : '当前用户')
      })
      page.querySelectorAll('.layout-section-scrollable .table-scroll-container,.layout-section-scrollable > .card').forEach((node) => { node.dataset.wecomTableShell = 'true' })
    }
    const tables = [...main.querySelectorAll('table')]
    tables.forEach((table) => {
      table.classList.add('wecom-table')
      const tableShell = table.closest('.table-scroll-container,.table-container') || table.parentElement
      if (tableShell) tableShell.dataset.wecomTableShell = 'true'
      let frame = table.parentElement
      while (frame && frame !== main) {
        if (frame.matches('.card,.glass-card,.card-glass,.table-container,.table-scroll-container')) frame.dataset.wecomTableFrame = 'true'
        frame = frame.parentElement
      }
      if (main.matches('.card,.glass-card,.card-glass')) main.dataset.wecomTableFrame = 'true'
      const labels = [...table.querySelectorAll('thead th')].map((header) => firstVisibleText(header))
      table.querySelectorAll('tbody tr').forEach((row, index) => {
        if (row.getAttribute('aria-hidden') === 'true') return
        row.dataset.wecomMessage = 'true'
        row.dataset.wecomTableRow = 'true'
        row.dataset.wecomSide = index % 4 === 3 ? 'right' : 'left'
        const firstCell = [...row.querySelectorAll('td')].find((cell) => firstVisibleText(cell)) || row.querySelector('td')
        const seed = firstVisibleText(firstCell) || `${location.pathname}-${index}`
        row.dataset.wecomAvatar = avatarLetter(seed)
        row.dataset.wecomMeta = `${seed.slice(0, 44)} · 刚刚`
        row.style.setProperty('--wecom-avatar-bg', avatarGradient(seed))
        row.querySelectorAll('td').forEach((cell, cellIndex) => { cell.dataset.wecomLabel = labels[cellIndex] || `字段 ${cellIndex + 1}` })
      })
    })
    main.querySelectorAll('nav[aria-label*="Pagination" i],nav[aria-label*="分页"],.pagination').forEach((nav, index) => {
      if (nav.closest('tbody tr')) return
      if (nav.closest('.layout-section-fixed')) return
      const parent = nav.parentElement?.parentElement
      const container = nav.matches('nav') && parent && /\bborder-t\b/.test(String(parent.className)) ? parent : nav
      container.dataset.wecomFixedRole = 'pagination'
      markSender(container, 'left', `${location.pathname}-pagination-${index}`, '系统通知')
    })
    return Boolean(page || tables.length)
  }

  function markCardContent(main) {
    const cardSelector = '.card,.glass-card,.card-glass,.stat-card,section[aria-labelledby],button[class*="shadow-card"],[class*="backdrop-blur"]'
    const cards = [...main.querySelectorAll(cardSelector)]
    const forms = [...main.querySelectorAll('form')].filter((node) => {
      const parentCard = node.parentElement?.closest(cardSelector)
      return !node.querySelector(cardSelector) && (!parentCard || parentCard === main || (parentCard.querySelector('table') && node.tagName === 'FORM'))
    })
    const blocks = [...cards, ...forms]
    let targets = blocks.filter((node) => {
      const parentCard = node.parentElement?.closest(cardSelector)
      const semanticSection = node.matches('section[aria-labelledby]') && !node.parentElement?.closest('section[aria-labelledby]')
      return !node.querySelector('table') && (semanticSection || !parentCard || parentCard === main || (node.tagName === 'FORM' && parentCard.querySelector('table')))
    })
    if (!targets.length && !blocks.length && !main.querySelector('table')) {
      targets = (() => {
        const direct = [...main.children].filter((node) => node instanceof HTMLElement && (node.children.length > 0 || firstVisibleText(node)))
        if (direct.length > 1) return direct
        const root = direct[0]
        if (!root) return []
        const children = [...root.children].filter((node) => node instanceof HTMLElement && !node.matches('.layout-section-fixed,.layout-section-scrollable') && node.children.length > 0)
        return children.length ? children : (firstVisibleText(root) ? [root] : [])
      })()
    }
    targets.forEach((node, index) => { const title = firstVisibleText(node.querySelector('h1,h2,h3,h4,strong')) || firstVisibleText(node).slice(0, 30) || location.pathname; markSender(node, index % 4 === 3 ? 'right' : 'left', `${location.pathname}-${index}-${title}`, index % 4 === 3 ? '当前用户' : '工作台助手') })
    const parents = new Set(targets.map((node) => node.parentElement).filter(Boolean))
    parents.forEach((parent) => { if (targets.filter((node) => node.parentElement === parent).length > 1) parent.dataset.wecomStack = 'true' })
  }

  function clearContentMarks(main) {
    main.querySelectorAll('[data-wecom-message]').forEach((node) => {
      node.removeAttribute('data-wecom-message')
      node.removeAttribute('data-wecom-side')
      node.removeAttribute('data-wecom-avatar')
      node.removeAttribute('data-wecom-meta')
      node.style.removeProperty('--wecom-avatar-bg')
      node.querySelector(':scope > .wecom-sender-label')?.remove()
    })
    main.querySelectorAll('[data-wecom-table-row]').forEach((node) => node.removeAttribute('data-wecom-table-row'))
    main.querySelectorAll('tbody tr').forEach((node) => { node.removeAttribute('data-wecom-side'); node.removeAttribute('data-wecom-avatar'); node.removeAttribute('data-wecom-meta'); node.style.removeProperty('--wecom-avatar-bg') })
    main.querySelectorAll('td[data-wecom-label]').forEach((node) => node.removeAttribute('data-wecom-label'))
    main.querySelectorAll('[data-wecom-table-shell]').forEach((node) => node.removeAttribute('data-wecom-table-shell'))
    main.querySelectorAll('[data-wecom-table-frame]').forEach((node) => node.removeAttribute('data-wecom-table-frame'))
    main.removeAttribute('data-wecom-table-frame')
    main.querySelectorAll('[data-wecom-stack]').forEach((node) => node.removeAttribute('data-wecom-stack'))
    main.querySelectorAll('[data-wecom-fixed-role]').forEach((node) => node.removeAttribute('data-wecom-fixed-role'))
    main.querySelectorAll('table.wecom-table').forEach((table) => table.classList.remove('wecom-table'))
  }

  function syncContent(source) {
    const main = source.main
    if (!main) return
    const blocks = [...main.querySelectorAll('.card,.glass-card,.card-glass,.stat-card,section[aria-labelledby],button[class*="shadow-card"],form')].map((node) => `${node.className}:${firstVisibleText(node).slice(0, 120)}`).join('|')
    const rows = [...main.querySelectorAll('table tbody tr:not([aria-hidden="true"])')].map((row) => `${row.getAttribute('data-row-id') || ''}:${firstVisibleText(row).slice(0, 120)}`).join('|')
    const signature = `${routeKey(location.href)}|${main.querySelectorAll('.card,table,section,form').length}|${hash(`${blocks}|${rows}|${main.textContent?.length || 0}`)}`
    if (signature === state.contentSignature) return
    state.contentSignature = signature
    main.dataset.wecomConversation = 'true'
    clearContentMarks(main)
    markTableContent(main)
    markCardContent(main)
  }

  function removeTheme() {
    document.querySelectorAll('main[data-wecom-conversation]').forEach((main) => {
      clearContentMarks(main)
      main.removeAttribute('data-wecom-conversation')
    })
    document.querySelectorAll('[data-wecom-app-content]').forEach((node) => node.removeAttribute('data-wecom-app-content'))
    document.querySelectorAll('[data-wecom-source]').forEach((node) => node.removeAttribute('data-wecom-source'))
    document.querySelectorAll('[data-wecom-locale-source]').forEach((node) => node.removeAttribute('data-wecom-locale-source'))
    document.querySelectorAll('[data-wecom-locale-button]').forEach((node) => node.removeAttribute('data-wecom-locale-button'))
    document.documentElement?.classList.remove(ROOT_CLASS, 'wecom-members-hidden', 'wecom-members-open')
    document.getElementById(SHELL_ID)?.remove()
    state.shell = null; state.navSignature = ''; state.contentSignature = ''; state.headerSignature = ''; state.membersSignature = ''
  }

  function syncTheme() {
    if (!document.documentElement) return
    if (!appLayoutPresent()) { removeTheme(); return }
    injectStyle()
    document.documentElement.classList.add(ROOT_CLASS)
    const source = sourceNodes()
    if (!ensureShell()) return
    syncConversations()
    syncHeaderAndMembers(source)
    syncMembers(source)
    syncContent(source)
    console.assert(document.querySelectorAll(`#${STYLE_ID}`).length === 1, '[Sub2API WeCom] style node must be unique')
    console.assert(document.querySelectorAll(`#${SHELL_ID}`).length === 1, '[Sub2API WeCom] shell node must be unique')
  }

  function scheduleSync() {
    if (state.frame) return
    const run = () => { state.frame = 0; syncTheme() }
    state.frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(run) : setTimeout(run, 16)
  }

  const mutationTouchesApp = (record) => {
    const app = document.querySelector('#app')
    if (app && (!document.getElementById(SHELL_ID) || !document.getElementById(STYLE_ID))) return true
    const target = record.target.nodeType === 1 ? record.target : record.target.parentElement
    if (app && (target === app || target?.closest?.('#app'))) return true
    return [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1 && (node.id === 'app' || node.id === SHELL_ID || node.id === STYLE_ID || node.querySelector?.('#app') || node.querySelector?.(`#${SHELL_ID}`) || node.querySelector?.(`#${STYLE_ID}`)))
  }
  const observer = new MutationObserver((records) => { if (records.some(mutationTouchesApp)) scheduleSync() })
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true })
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true }), { once: true })
  document.addEventListener('DOMContentLoaded', scheduleSync, { once: true })
  window.addEventListener('popstate', scheduleSync)
  window.addEventListener('hashchange', scheduleSync)
  scheduleSync()
})()
