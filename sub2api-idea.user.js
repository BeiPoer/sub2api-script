// ==UserScript==
// @name         Sub2API · IntelliJ IDEA Theme
// @namespace    https://github.com/BeiPoer/sub2api
// @version      0.5.5
// @updateURL    https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-idea.user.js
// @downloadURL  https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-idea.user.js
// @description  将 Sub2API 用户端与完整管理后台换成 IntelliJ IDEA / Darcula 风格，并将左侧导航伪装成 IDEA Project View；管理员页面采用紧凑工具窗布局，仅改变外观，不修改业务数据和交互。
// @author       sub2api contributors
// @match        http://*/*
// @match        https://*/*
// @icon         https://www.jetbrains.com/favicon.ico
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict'

  // Sub2API 可部署在任意域名；确定地址后可将上方 @match 收窄到自己的站点。

  const STYLE_ID = 'sub2api-idea-theme-style'
  const ROOT_CLASS = 'sub2api-idea-theme'
  const ADMIN_CLASS = 'sub2api-idea-admin'
  const STATUS_CLASS = 'sub2api-idea-statusbar'
  const MENU_CLASS = 'sub2api-idea-menubar'
  const menuItems = ['File', 'Edit', 'View', 'Navigate', 'Code', 'Run', 'Tools', 'Window', 'Help']

  const CSS = String.raw`
    :root.${ROOT_CLASS} {
      --idea-bg: #f3f4f6;
      --idea-surface: #ffffff;
      --idea-surface-alt: #f7f8fa;
      --idea-sidebar: #f7f8fa;
      --idea-header: #ffffff;
      --idea-border: #d9dde3;
      --idea-border-soft: #e7e9ed;
      --idea-text: #2b2d30;
      --idea-muted: #6b7280;
      --idea-active-bg: #dcecf8;
      --idea-active-text: #1f4d69;
      --idea-accent: #4a9fd8;
      --idea-accent-hover: #3e8fc7;
      --idea-code: #28313b;
      --idea-shadow: 0 1px 2px rgba(28, 35, 43, 0.09);
    }

    :root.${ROOT_CLASS}.dark {
      --idea-bg: #2b2d30;
      --idea-surface: #313335;
      --idea-surface-alt: #2f3033;
      --idea-sidebar: #2b2d30;
      --idea-header: #2b2d30;
      --idea-border: #4b4d4f;
      --idea-border-soft: #3d3f41;
      --idea-text: #dfe1e5;
      --idea-muted: #9da0a6;
      --idea-active-bg: #3c4e5a;
      --idea-active-text: #9cdcfe;
      --idea-accent: #4a9fd8;
      --idea-accent-hover: #61afe6;
      --idea-code: #a9b7c6;
      --idea-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .${ROOT_CLASS},
    .${ROOT_CLASS} body,
    .${ROOT_CLASS} #app {
      background: var(--idea-bg) !important;
      color: var(--idea-text) !important;
      font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif !important;
    }

    .${ROOT_CLASS} body {
      min-height: 100vh;
      padding-bottom: 22px !important;
    }

    .${ROOT_CLASS} #app .bg-mesh-gradient,
    .${ROOT_CLASS} #app > div > .absolute.inset-0[class*="bg-gradient"] {
      background-image: none !important;
    }

    .${ROOT_CLASS} #app > div > .pointer-events-none.absolute.inset-0 > [class~="blur-3xl"] {
      display: none !important;
    }

    .${ROOT_CLASS} #app .min-h-screen {
      background: transparent !important;
    }

    .${ROOT_CLASS} #app > .relative.flex.min-h-screen,
    .${ROOT_CLASS} #app > .flex.min-h-screen {
      background: var(--idea-bg) !important;
    }

    .${ROOT_CLASS} #app > .relative.flex.min-h-screen > .pointer-events-none,
    .${ROOT_CLASS} #app > .relative.flex.min-h-screen > .absolute.inset-0 {
      display: none !important;
    }

    /* App shell */
    .${ROOT_CLASS} .sidebar {
      height: calc(100vh - 22px) !important;
      background: var(--idea-sidebar) !important;
      border-right: 1px solid var(--idea-border) !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }

    .${ROOT_CLASS} .sidebar-header {
      height: 31px !important;
      min-height: 31px !important;
      padding-right: 14px !important;
      padding-left: 14px !important;
      border-bottom: 1px solid var(--idea-border) !important;
      background: var(--idea-sidebar) !important;
    }

    .${ROOT_CLASS} .sidebar-logo {
      width: 18px !important;
      height: 18px !important;
      min-width: 18px !important;
      flex-basis: 18px !important;
      position: relative !important;
      border: 1px solid #ff8100 !important;
      border-radius: 2px !important;
      background: #000 !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS} .sidebar-logo img {
      opacity: 0 !important;
    }

    .${ROOT_CLASS} .sidebar-logo::after {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: #fff;
      content: 'IJ';
      font-family: Inter, "Segoe UI", sans-serif;
      font-size: 7px;
      font-weight: 800;
      letter-spacing: 0;
    }

    .${ROOT_CLASS} .sidebar-brand {
      display: none !important;
    }

    .${ROOT_CLASS} .sidebar-header-collapsed {
      padding-right: 27px !important;
      padding-left: 27px !important;
    }

    .${ROOT_CLASS} .sidebar-brand-title {
      color: var(--idea-text) !important;
      font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace !important;
      font-size: 13px !important;
      font-weight: 600 !important;
    }

    .${ROOT_CLASS} .sidebar-brand::after {
      margin-left: 6px;
      color: var(--idea-accent) !important;
      content: 'IDEA';
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .${ROOT_CLASS} .sidebar-section {
      padding-top: 6px !important;
    }

    .${ROOT_CLASS} .sidebar-section-title {
      color: var(--idea-muted) !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 10px !important;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .${ROOT_CLASS} .sidebar-link {
      position: relative !important;
      min-height: 32px !important;
      border: 1px solid transparent !important;
      border-left: 2px solid transparent !important;
      border-radius: 3px !important;
      color: var(--idea-text) !important;
      box-shadow: none !important;
      font-size: 13px !important;
    }

    /* Project View tree: folders for expandable groups, files for leaf routes. */
    .${ROOT_CLASS} .sidebar-nav .sidebar-section {
      position: relative;
      margin-left: 7px !important;
      padding-left: 5px !important;
      border-left: 1px solid var(--idea-border) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title {
      position: relative;
      padding-left: 21px !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title::before,
    .${ROOT_CLASS} .sidebar-nav button.sidebar-link::before,
    .${ROOT_CLASS} .sidebar-nav a.sidebar-link::before {
      position: absolute;
      display: block;
      content: '';
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title::before,
    .${ROOT_CLASS} .sidebar-nav button.sidebar-link::before {
      top: 50%;
      left: 6px;
      width: 12px;
      height: 8px;
      border: 1px solid #c9984d;
      border-radius: 1px;
      background: #e8b86d;
      box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.28);
      transform: translateY(-45%);
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title::before {
      left: 4px;
    }

    .${ROOT_CLASS} .sidebar-nav a.sidebar-link::before {
      top: 50%;
      left: 8px;
      width: 8px;
      height: 11px;
      border: 1px solid #8d949d;
      border-radius: 1px;
      background: var(--idea-surface);
      transform: translateY(-50%);
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link-active::before {
      border-color: var(--idea-accent) !important;
      background: var(--idea-accent) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link-active::after {
      position: absolute;
      top: 50%;
      left: 10px;
      width: 4px;
      height: 1px;
      background: #fff;
      content: '';
      transform: translateY(-50%);
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link > :is(svg, .sidebar-svg-icon) {
      display: none !important;
    }

    .${ROOT_CLASS} .sidebar-nav button.sidebar-link .sidebar-label-flex > svg {
      display: block !important;
      width: 12px !important;
      height: 12px !important;
      color: var(--idea-muted) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link {
      padding-left: 27px !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section > div[class*="border-l"] {
      border-left-color: var(--idea-border) !important;
    }

    .${ROOT_CLASS} .sidebar[class~="w-[72px]"] .sidebar-nav .sidebar-section {
      margin-left: 0 !important;
      padding-left: 0 !important;
      border-left: 0 !important;
    }

    .${ROOT_CLASS} .sidebar[class~="w-[72px]"] .sidebar-nav .sidebar-link {
      padding-left: 14px !important;
    }

    .${ROOT_CLASS} .sidebar[class~="w-[72px]"] .sidebar-nav .sidebar-link::before {
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .${ROOT_CLASS} .sidebar[class~="w-[72px]"] .sidebar-nav .sidebar-link-active::after {
      left: calc(50% - 2px);
    }

    .${ROOT_CLASS} .sidebar[class~="w-[72px]"] .sidebar-nav .sidebar-section-title {
      padding-left: 0 !important;
    }

    .${ROOT_CLASS} .sidebar[class~="w-[72px]"] .sidebar-nav .sidebar-section-title::before {
      left: 50%;
      transform: translate(-50%, -45%);
    }

    /* IDEA Project View refinement: dense rows, disclosure arrows and folder nodes. */
    .${ROOT_CLASS} .sidebar-nav {
      padding: 4px 0 !important;
      font-family: Inter, "Segoe UI", system-ui, sans-serif !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section {
      margin: 0 0 5px !important;
      padding: 0 !important;
      border-left: 0 !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section + .sidebar-section {
      margin-top: 7px !important;
      border-top: 1px solid var(--idea-border-soft) !important;
      padding-top: 5px !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title {
      height: 24px !important;
      min-height: 24px !important;
      margin: 0 !important;
      padding: 3px 8px 3px 43px !important;
      border: 0 !important;
      border-radius: 0 !important;
      color: var(--idea-text) !important;
      font-family: Inter, "Segoe UI", system-ui, sans-serif !important;
      font-size: 12px !important;
      font-weight: 400 !important;
      letter-spacing: 0 !important;
      line-height: 18px !important;
      text-transform: none !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title::before,
    .${ROOT_CLASS} .sidebar-nav button.sidebar-link::before,
    .${ROOT_CLASS} .sidebar-nav a.sidebar-link::before {
      top: 50% !important;
      left: 26px !important;
      width: 13px !important;
      height: 9px !important;
      border: 1px solid #9aa1a8 !important;
      border-radius: 1px !important;
      background: transparent !important;
      box-shadow: none !important;
      transform: translateY(-50%) !important;
    }

    .${ROOT_CLASS}.dark .sidebar-nav .sidebar-section-title::before,
    .${ROOT_CLASS}.dark .sidebar-nav button.sidebar-link::before,
    .${ROOT_CLASS}.dark .sidebar-nav a.sidebar-link::before {
      border-color: #9aa1a8 !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title::before,
    .${ROOT_CLASS} .sidebar-nav button.sidebar-link::before,
    .${ROOT_CLASS} .sidebar-nav a.sidebar-link::before {
      border: 0 !important;
      border-radius: 0 !important;
      background:
        linear-gradient(currentColor, currentColor) 3px 0 / 10px 1px no-repeat,
        linear-gradient(currentColor, currentColor) 0 2px / 5px 1px no-repeat,
        linear-gradient(currentColor, currentColor) 0 0 / 1px 100% no-repeat,
        linear-gradient(currentColor, currentColor) 100% 0 / 1px 100% no-repeat,
        linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat !important;
      color: #9aa1a8 !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link-active::before {
      color: var(--idea-accent) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title::after {
      display: block !important;
      content: '' !important;
      top: 50% !important;
      right: auto !important;
      bottom: auto !important;
      left: 10px !important;
      width: 6px !important;
      height: 6px !important;
      border: 0 !important;
      border-top: 1px solid var(--idea-muted) !important;
      border-right: 1px solid var(--idea-muted) !important;
      background: transparent !important;
      opacity: 1 !important;
      transform: translateY(-50%) rotate(45deg) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section-title-text {
      max-width: none !important;
      color: var(--idea-text) !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      opacity: 1 !important;
      transform: none !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link,
    .${ROOT_CLASS} .sidebar-nav button.sidebar-link,
    .${ROOT_CLASS} .sidebar-nav a.sidebar-link {
      height: 24px !important;
      min-height: 24px !important;
      margin: 0 !important;
      padding: 3px 8px 3px 43px !important;
      border: 0 !important;
      border-left: 2px solid transparent !important;
      border-radius: 0 !important;
      color: var(--idea-text) !important;
      font-size: 12px !important;
      font-weight: 400 !important;
      line-height: 18px !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link:hover {
      border-left-color: transparent !important;
      background: rgba(127, 143, 158, 0.12) !important;
      color: var(--idea-text) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link-active {
      border-left-color: var(--idea-accent) !important;
      background: var(--idea-active-bg) !important;
      color: var(--idea-active-text) !important;
      font-weight: 500 !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link-active::before {
      border-color: var(--idea-accent) !important;
      background: rgba(74, 159, 216, 0.18) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link-active::after {
      display: block !important;
    }

    /* Buttons represent folders. Use the same CSS disclosure arrow as every tree row. */
    .${ROOT_CLASS} .sidebar-nav button.sidebar-link .sidebar-label-flex > svg {
      display: none !important;
    }

    .${ROOT_CLASS} .sidebar-nav button.sidebar-link::after {
      position: absolute;
      top: 50%;
      left: 10px;
      width: 6px;
      height: 6px;
      border-top: 1px solid var(--idea-muted);
      border-right: 1px solid var(--idea-muted);
      content: '';
      transform: translateY(-50%) rotate(45deg);
    }

    .${ROOT_CLASS} .sidebar-nav button.sidebar-link:has(.rotate-180)::after {
      transform: translateY(-50%) rotate(135deg);
    }

    /* Leaf routes still look like project nodes, while child routes are indented. */
    .${ROOT_CLASS} .sidebar-nav > .sidebar-section > a.sidebar-link::after {
      position: absolute;
      top: 50%;
      left: 10px;
      width: 6px;
      height: 6px;
      border-top: 1px solid var(--idea-muted);
      border-right: 1px solid var(--idea-muted);
      content: '';
      transform: translateY(-50%) rotate(45deg);
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section > div[class*="border-l"] {
      margin: 1px 0 1px 18px !important;
      padding: 0 0 0 18px !important;
      border-left: 1px solid var(--idea-border) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section > div[class*="border-l"] .sidebar-link {
      padding-left: 25px !important;
      color: var(--idea-muted) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section > div[class*="border-l"] .sidebar-link::before {
      left: 8px !important;
      width: 11px !important;
      height: 8px !important;
      border-color: #858d96 !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section > div[class*="border-l"] .sidebar-link::after {
      display: block !important;
      left: 7px !important;
      width: 6px !important;
      height: 6px !important;
      background: transparent !important;
      border-color: var(--idea-muted) !important;
      content: '' !important;
      transform: translateY(-50%) rotate(45deg) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-section > div[class*="border-l"] .sidebar-link-active::after {
      border-color: var(--idea-accent) !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-link > :is(svg, .sidebar-svg-icon) {
      display: none !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-label {
      max-width: none !important;
      font-size: 12px !important;
      opacity: 1 !important;
      transform: none !important;
    }

    .${ROOT_CLASS} .sidebar-nav .sidebar-label-collapsed {
      max-width: 0 !important;
    }

    .${ROOT_CLASS}.dark .sidebar-nav .sidebar-section > div[class*="border-l"] {
      border-left-color: #45494e !important;
    }

    .${ROOT_CLASS} .sidebar-link:hover {
      background: var(--idea-surface-alt) !important;
      border-color: var(--idea-border-soft) !important;
    }

    .${ROOT_CLASS} .sidebar-link-active {
      background: var(--idea-active-bg) !important;
      border-color: var(--idea-border) !important;
      border-left-color: var(--idea-accent) !important;
      color: var(--idea-active-text) !important;
      font-weight: 600 !important;
    }

    .${ROOT_CLASS} .sidebar-link-active svg {
      color: var(--idea-accent) !important;
    }

    .${ROOT_CLASS} .sidebar-nav + div {
      border-top-color: var(--idea-border) !important;
    }

    .${ROOT_CLASS} header.glass {
      display: block !important;
      height: 31px !important;
      min-height: 31px !important;
      background: var(--idea-header) !important;
      border-bottom: 1px solid var(--idea-border) !important;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03) !important;
      backdrop-filter: none !important;
    }

    .${ROOT_CLASS} header.glass h1,
    .${ROOT_CLASS} header.glass h1 + p {
      display: none !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div.hidden.lg\\:block {
      display: none !important;
    }

    .${ROOT_CLASS} header.glass > :not(.${MENU_CLASS}) {
      position: absolute !important;
      top: 0 !important;
      right: 0 !important;
      left: 0 !important;
      height: 31px !important;
      padding-right: 8px !important;
      padding-left: 8px !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:first-child {
      display: none !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child {
      display: flex !important;
      height: 31px !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 2px !important;
      margin-left: auto !important;
      pointer-events: auto !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child :is(a, button) {
      min-height: 24px !important;
      max-height: 28px !important;
      border-radius: 2px !important;
      font-size: 11px !important;
      line-height: 1 !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child :is(a, button):not([aria-label]) {
      padding-top: 2px !important;
      padding-bottom: 2px !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child [class~="h-8"][class~="w-8"] {
      width: 22px !important;
      height: 22px !important;
      border-radius: 2px !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child [class~="text-sm"] {
      font-size: 10px !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child [class~="text-xs"] {
      font-size: 9px !important;
    }

    /* Balance chip: keep the account value readable without the bright SaaS teal. */
    .${ROOT_CLASS} header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] {
      border: 1px solid #cbd4dd !important;
      border-radius: 3px !important;
      background: #e8edf2 !important;
      color: #536271 !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] svg,
    .${ROOT_CLASS} header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] [class*="text-primary-"] {
      color: #536f85 !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] > span {
      color: #536271 !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 11px !important;
    }

    .${ROOT_CLASS}.dark header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] {
      border-color: #4c5965 !important;
      background: #37414a !important;
      color: #c1ccd5 !important;
    }

    .${ROOT_CLASS}.dark header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] svg,
    .${ROOT_CLASS}.dark header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] [class*="text-primary-"] {
      color: #9fb6c7 !important;
    }

    .${ROOT_CLASS}.dark header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] > span {
      color: #c1ccd5 !important;
    }

    .${ROOT_CLASS} header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] [class*="text-amber-"] {
      color: #a9854d !important;
    }

    .${ROOT_CLASS}.dark header.glass > div.flex > div:last-child > div.group[class~="bg-primary-50"] [class*="text-amber-"] {
      color: #c2a36a !important;
    }

    .${ROOT_CLASS} .${MENU_CLASS} {
      display: flex;
      height: 31px;
      align-items: center;
      gap: 2px;
      padding: 0 14px;
      padding-right: clamp(260px, 28vw, 500px);
      overflow: hidden;
      border-bottom: 1px solid var(--idea-border-soft);
      color: var(--idea-muted);
      font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
      font-size: 11px;
      user-select: none;
    }

    .${ROOT_CLASS} .${MENU_CLASS} span {
      padding: 3px 7px;
      border-radius: 2px;
      white-space: nowrap;
    }

    .${ROOT_CLASS} .${MENU_CLASS} span:hover {
      background: var(--idea-active-bg);
      color: var(--idea-active-text);
    }

    .${ROOT_CLASS} main {
      padding: 20px !important;
    }

    .${ROOT_CLASS} .table-page-layout {
      height: calc(100vh - 31px - 40px - 22px) !important;
    }

    /* Panels and controls */
    .${ROOT_CLASS} .card,
    .${ROOT_CLASS} .card-glass,
    .${ROOT_CLASS} .glass-card,
    .${ROOT_CLASS} .table-scroll-container {
      background: var(--idea-surface) !important;
      border: 1px solid var(--idea-border) !important;
      border-radius: 4px !important;
      box-shadow: var(--idea-shadow) !important;
      backdrop-filter: none !important;
    }

    .${ROOT_CLASS} .card-header,
    .${ROOT_CLASS} .card-footer {
      border-color: var(--idea-border) !important;
    }

    .${ROOT_CLASS} main :is([class~="rounded-2xl"], [class~="rounded-3xl"])[class~="bg-white"] {
      border: 1px solid var(--idea-border) !important;
      border-radius: 4px !important;
      background: var(--idea-surface) !important;
      box-shadow: var(--idea-shadow) !important;
    }

    .${ROOT_CLASS} .btn {
      border-radius: 3px !important;
      box-shadow: none !important;
      font-size: 12px !important;
      transform: none !important;
    }

    .${ROOT_CLASS} .btn-primary {
      background: var(--idea-accent) !important;
      color: #fff !important;
    }

    .${ROOT_CLASS} .btn-primary:hover {
      background: var(--idea-accent-hover) !important;
    }

    .${ROOT_CLASS} .btn-secondary,
    .${ROOT_CLASS} .btn-ghost {
      background: var(--idea-surface-alt) !important;
      border-color: var(--idea-border) !important;
      color: var(--idea-text) !important;
    }

    .${ROOT_CLASS} .btn-danger {
      background: #c75450 !important;
    }

    .${ROOT_CLASS} .btn-success {
      background: #499c54 !important;
    }

    .${ROOT_CLASS} .btn-warning {
      background: #c1862e !important;
    }

    .${ROOT_CLASS} .input,
    .${ROOT_CLASS} input:not([type="checkbox"]):not([type="radio"]),
    .${ROOT_CLASS} select,
    .${ROOT_CLASS} textarea {
      min-height: 32px;
      border: 1px solid var(--idea-border) !important;
      border-radius: 3px !important;
      background: var(--idea-surface) !important;
      color: var(--idea-text) !important;
      box-shadow: none !important;
      font-size: 12px !important;
    }

    .${ROOT_CLASS} textarea {
      min-height: 72px;
    }

    .${ROOT_CLASS} .input:focus,
    .${ROOT_CLASS} input:focus,
    .${ROOT_CLASS} select:focus,
    .${ROOT_CLASS} textarea:focus {
      border-color: var(--idea-accent) !important;
      outline: 1px solid var(--idea-accent) !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS} .input-label {
      color: var(--idea-muted) !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 11px !important;
    }

    .${ROOT_CLASS} .dropdown,
    .${ROOT_CLASS} [role="dialog"] > div,
    .${ROOT_CLASS} .modal-content {
      border: 1px solid var(--idea-border) !important;
      border-radius: 4px !important;
      background: var(--idea-surface) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
    }

    .${ROOT_CLASS} .dropdown-item {
      border-radius: 2px !important;
      color: var(--idea-text) !important;
      font-size: 12px !important;
    }

    .${ROOT_CLASS} .dropdown-item:hover {
      background: var(--idea-active-bg) !important;
      color: var(--idea-active-text) !important;
    }

    /* Tables resemble an IDE data grid. */
    .${ROOT_CLASS} table {
      border-collapse: collapse !important;
    }

    .${ROOT_CLASS} table thead,
    .${ROOT_CLASS} .table-header {
      background: var(--idea-surface-alt) !important;
    }

    .${ROOT_CLASS} table th {
      border-color: var(--idea-border) !important;
      color: var(--idea-muted) !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .${ROOT_CLASS} table td {
      border-color: var(--idea-border-soft) !important;
      color: var(--idea-text) !important;
      font-size: 12px !important;
    }

    .${ROOT_CLASS} table tbody tr:hover {
      background: var(--idea-active-bg) !important;
    }

    .${ROOT_CLASS} .table-wrapper::-webkit-scrollbar,
    .${ROOT_CLASS} .sidebar-nav::-webkit-scrollbar {
      width: 9px;
      height: 9px;
    }

    .${ROOT_CLASS} .table-wrapper::-webkit-scrollbar-thumb,
    .${ROOT_CLASS} .sidebar-nav::-webkit-scrollbar-thumb {
      border: 2px solid transparent;
      border-radius: 0;
      background: var(--idea-border) !important;
      background-clip: padding-box;
    }

    .${ROOT_CLASS} .text-gradient {
      background: none !important;
      color: var(--idea-accent) !important;
      -webkit-text-fill-color: currentColor !important;
    }

    .${ROOT_CLASS} :is(.shadow-card, .shadow-glass, .shadow-glow, .shadow-glow-lg) {
      box-shadow: var(--idea-shadow) !important;
    }

    /* Administrator workspace: compact panels, data grids and configuration forms. */
    :root.${ROOT_CLASS}.${ADMIN_CLASS} {
      --idea-admin-bg: #eef0f3;
      --idea-admin-panel: #ffffff;
      --idea-admin-panel-alt: #f6f7f9;
      --idea-admin-line: #d3d7dd;
      --idea-admin-line-soft: #e5e7eb;
      --idea-admin-heading: #25282c;
    }

    :root.${ROOT_CLASS}.${ADMIN_CLASS}.dark {
      --idea-admin-bg: #252629;
      --idea-admin-panel: #2f3033;
      --idea-admin-panel-alt: #292b2e;
      --idea-admin-line: #484b4f;
      --idea-admin-line-soft: #3b3d40;
      --idea-admin-heading: #f0f1f2;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main {
      background: var(--idea-admin-bg) !important;
      color: var(--idea-text) !important;
      font-size: 13px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main > :is(.space-y-6, .space-y-5, .space-y-4, .mx-auto) {
      min-width: 0;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .page-header {
      display: flex;
      min-height: 34px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px !important;
      border-bottom: 1px solid var(--idea-admin-line);
      padding-bottom: 8px;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .page-title,
    .${ROOT_CLASS}.${ADMIN_CLASS} h1 {
      color: var(--idea-admin-heading) !important;
      font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace !important;
      font-size: 18px !important;
      font-weight: 600 !important;
      letter-spacing: 0 !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} h2 {
      color: var(--idea-admin-heading) !important;
      font-size: 15px !important;
      font-weight: 600 !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} h3 {
      color: var(--idea-admin-heading) !important;
      font-size: 13px !important;
      font-weight: 600 !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .page-description {
      color: var(--idea-muted) !important;
      font-size: 11px !important;
    }

    /* Catch page-specific cards used by Dashboard, Ops, Usage and payment views. */
    .${ROOT_CLASS}.${ADMIN_CLASS} :is(
      .stat-card,
      .table-container,
      .table-scroll-container,
      .settings-tabs-shell,
      [class~="rounded-2xl"],
      [class~="rounded-3xl"]
    ):is(
      .card,
      [class~="bg-white"],
      [class*="bg-white/"],
      [class*="bg-gray-50"],
      [class*="bg-dark-"],
      [class*="ring-"],
      [class*="shadow-"]
    ) {
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 4px !important;
      background: var(--idea-admin-panel) !important;
      box-shadow: var(--idea-shadow) !important;
      backdrop-filter: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .stat-card {
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 4px !important;
      background: var(--idea-admin-panel) !important;
      box-shadow: var(--idea-shadow) !important;
      backdrop-filter: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(
      [class~="rounded-lg"],
      [class~="rounded-xl"]
    ):is(
      [class~="bg-white"],
      [class*="bg-white/"],
      [class*="bg-gray-50"],
      [class*="bg-dark-"],
      [class*="shadow-sm"],
      [class*="ring-"]
    ) {
      border-color: var(--idea-admin-line) !important;
      border-radius: 3px !important;
      background: var(--idea-admin-panel-alt) !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(
      [class~="rounded-lg"],
      [class~="rounded-xl"]
    )[class~="border"] {
      border-color: var(--idea-admin-line) !important;
      border-radius: 3px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} [class*="bg-gradient-to"]:not(.btn),
    .${ROOT_CLASS}.${ADMIN_CLASS} [class*="bg-gradient-radial"]:not(.btn) {
      background-image: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .stat-card {
      min-height: 86px !important;
      padding: 12px !important;
      gap: 10px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .stat-icon {
      width: 32px !important;
      height: 32px !important;
      border: 1px solid currentColor !important;
      border-radius: 3px !important;
      background: transparent !important;
      opacity: 0.9;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .stat-value {
      color: var(--idea-admin-heading) !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 18px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .stat-label,
    .${ROOT_CLASS}.${ADMIN_CLASS} .stat-trend {
      font-size: 10px !important;
    }

    /* Filter/action rails above every TablePageLayout. */
    .${ROOT_CLASS}.${ADMIN_CLASS} .table-page-layout {
      gap: 10px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .table-page-layout > .layout-section-fixed > * {
      min-height: 42px;
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 4px !important;
      background: var(--idea-admin-panel-alt) !important;
      padding: 7px 9px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .table-page-layout > .layout-section-scrollable > .table-scroll-container {
      border-radius: 4px !important;
      background: var(--idea-admin-panel) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .table-page-layout > .layout-section-fixed:last-child > * {
      min-height: 42px;
      background: var(--idea-admin-panel) !important;
    }

    /* Shared table/data-grid treatment, including virtualized tables. */
    .${ROOT_CLASS}.${ADMIN_CLASS} .table-container,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table-wrapper,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table-scroll-container,
    .${ROOT_CLASS}.${ADMIN_CLASS} .data-table {
      border-color: var(--idea-admin-line) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} table,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table {
      font-size: 12px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} table th,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table th,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table-header,
    .${ROOT_CLASS}.${ADMIN_CLASS} .sticky-header-cell {
      background: var(--idea-admin-panel-alt) !important;
      border-color: var(--idea-admin-line) !important;
      color: var(--idea-muted) !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} table td,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table td {
      background: var(--idea-admin-panel) !important;
      border-color: var(--idea-admin-line-soft) !important;
      color: var(--idea-text) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} table tbody tr:hover td,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table tbody tr:hover td {
      background: var(--idea-active-bg) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} tbody .sticky-col,
    .${ROOT_CLASS}.${ADMIN_CLASS} .sticky-col {
      background: var(--idea-admin-panel) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} tbody tr:hover .sticky-col {
      background: var(--idea-active-bg) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main div[class*="border-t"][class*="dark:bg-dark-800"] {
      background: var(--idea-admin-panel-alt) !important;
      border-color: var(--idea-admin-line) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main nav[aria-label="Pagination"] button {
      min-height: 28px !important;
      border-color: var(--idea-admin-line) !important;
      border-radius: 2px !important;
      background: var(--idea-admin-panel-alt) !important;
      color: var(--idea-muted) !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main nav[aria-label="Pagination"] button[aria-current="page"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main nav[aria-label="Pagination"] button[class*="border-primary-"] {
      border-color: var(--idea-accent) !important;
      background: var(--idea-active-bg) !important;
      color: var(--idea-active-text) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .table-wrapper .table-body,
    .${ROOT_CLASS}.${ADMIN_CLASS} .table-wrapper .table-row {
      background: transparent !important;
    }

    /* Tabs used by settings, channels, usage and monitor pages. */
    .${ROOT_CLASS}.${ADMIN_CLASS} .tabs,
    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tabs,
    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tabs-shell,
    .${ROOT_CLASS}.${ADMIN_CLASS} [role="tablist"] {
      border-color: var(--idea-admin-line) !important;
      border-radius: 4px !important;
      background: var(--idea-admin-panel-alt) !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tabs-shell {
      top: 31px !important;
      padding: 2px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .tab,
    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tab,
    .${ROOT_CLASS}.${ADMIN_CLASS} .channel-tab,
    .${ROOT_CLASS}.${ADMIN_CLASS} [role="tablist"] > button {
      min-height: 32px !important;
      border: 1px solid transparent !important;
      border-radius: 3px !important;
      color: var(--idea-muted) !important;
      font-size: 11px !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .tab-active,
    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tab-active,
    .${ROOT_CLASS}.${ADMIN_CLASS} .channel-tab-active,
    .${ROOT_CLASS}.${ADMIN_CLASS} [role="tablist"] > button[aria-selected="true"] {
      border-color: var(--idea-border) !important;
      background: var(--idea-active-bg) !important;
      color: var(--idea-active-text) !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tab::before,
    .${ROOT_CLASS}.${ADMIN_CLASS} .settings-tab-active::after {
      display: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .channel-tab-inactive {
      background: transparent !important;
    }

    /* Select component is teleported to body, so keep these rules under the root class. */
    .${ROOT_CLASS}.${ADMIN_CLASS} .select-trigger,
    .${ROOT_CLASS}.${ADMIN_CLASS} .select-search-input {
      min-height: 32px !important;
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 3px !important;
      background: var(--idea-admin-panel) !important;
      color: var(--idea-text) !important;
      box-shadow: none !important;
      font-size: 12px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .select-trigger-open,
    .${ROOT_CLASS}.${ADMIN_CLASS} .select-trigger:focus-visible {
      border-color: var(--idea-accent) !important;
      outline: 1px solid var(--idea-accent) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .select-dropdown-portal,
    .${ROOT_CLASS}.${ADMIN_CLASS} .select-dropdown-portal .select-options {
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 3px !important;
      background: var(--idea-admin-panel) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .select-dropdown-portal .select-option {
      min-height: 30px;
      color: var(--idea-text) !important;
      font-size: 12px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .select-dropdown-portal .select-option:hover,
    .${ROOT_CLASS}.${ADMIN_CLASS} .select-dropdown-portal .select-option-focused,
    .${ROOT_CLASS}.${ADMIN_CLASS} .select-dropdown-portal .select-option-selected {
      background: var(--idea-active-bg) !important;
      color: var(--idea-active-text) !important;
    }

    /* Settings and complex forms. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main form > :is(.card, section),
    .${ROOT_CLASS}.${ADMIN_CLASS} main form .card {
      border-color: var(--idea-admin-line) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main form .border-b,
    .${ROOT_CLASS}.${ADMIN_CLASS} main form .border-t,
    .${ROOT_CLASS}.${ADMIN_CLASS} main form .border-y {
      border-color: var(--idea-admin-line) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main code,
    .${ROOT_CLASS}.${ADMIN_CLASS} main pre,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .code,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .code-block {
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 3px !important;
      background: var(--idea-code) !important;
      color: #d6e1eb !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main label,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .input-label {
      color: var(--idea-muted) !important;
      font-size: 11px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main input[type="checkbox"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main input[type="radio"] {
      accent-color: var(--idea-accent) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main button:not(.btn):not([role="switch"]):not([class~="rounded-full"]),
    .${ROOT_CLASS}.${ADMIN_CLASS} main a[class*="rounded-lg"]:not([class~="rounded-full"]) {
      border-radius: 3px !important;
      font-size: 12px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main button:not(.btn):not([role="switch"]):not([class~="rounded-full"]):hover {
      background: var(--idea-active-bg) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .modal-overlay,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-overlay {
      background: rgba(20, 23, 27, 0.58) !important;
      backdrop-filter: blur(2px) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .modal-content,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-container {
      max-height: calc(100vh - 70px) !important;
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 4px !important;
      background: var(--idea-admin-panel) !important;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .modal-header,
    .${ROOT_CLASS}.${ADMIN_CLASS} .modal-footer,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-header,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-footer {
      border-color: var(--idea-admin-line) !important;
      background: var(--idea-admin-panel-alt) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .modal-title,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-header h2,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-header h3 {
      color: var(--idea-admin-heading) !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 14px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .modal-body,
    .${ROOT_CLASS}.${ADMIN_CLASS} .dialog-body {
      background: var(--idea-admin-panel) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(.modal-content, .dialog-container) :is(
      [class*="dark:bg-dark-800"],
      [class*="dark:bg-dark-700"],
      [class*="bg-gray-50"],
      [class*="bg-gray-100"]
    ) {
      border-color: var(--idea-admin-line) !important;
      border-radius: 3px !important;
      background: var(--idea-admin-panel-alt) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .toast {
      border: 1px solid var(--idea-admin-line) !important;
      border-left-width: 3px !important;
      border-radius: 3px !important;
      background: var(--idea-admin-panel) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .badge {
      border: 1px solid currentColor !important;
      border-radius: 3px !important;
      padding: 1px 5px !important;
      font-family: "JetBrains Mono", Consolas, monospace !important;
      font-size: 10px !important;
    }

    /* Chart canvases remain data-driven; only their surrounding frame changes. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main canvas {
      max-width: 100% !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .progress,
    .${ROOT_CLASS}.${ADMIN_CLASS} [role="progressbar"] {
      border: 1px solid var(--idea-admin-line) !important;
      border-radius: 2px !important;
      background: var(--idea-admin-panel-alt) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} .progress-bar {
      background: var(--idea-accent) !important;
    }

    /* Dense IDE workspace pass: reduce SaaS spacing and tone down loud utility colors. */
    .${ROOT_CLASS}.${ADMIN_CLASS} {
      --idea-admin-ink: #3f4852;
      --idea-admin-link: #4d7898;
      --idea-admin-green: #628d6b;
      --idea-admin-amber: #a47f42;
      --idea-admin-red: #ad625d;
      --idea-admin-purple: #866f9b;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS}.dark {
      --idea-admin-ink: #c5cbd1;
      --idea-admin-link: #8fb1c8;
      --idea-admin-green: #86ad8c;
      --idea-admin-amber: #c2a16b;
      --idea-admin-red: #d48a83;
      --idea-admin-purple: #b29ac7;
    }

    /* Keep panels compact like an IDE tool window. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main .space-y-6 { row-gap: 10px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .space-y-5 { row-gap: 9px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .space-y-4 { row-gap: 8px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .space-y-3 { row-gap: 6px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .gap-6 { gap: 10px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .gap-5 { gap: 9px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .gap-4 { gap: 8px !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .gap-3 { gap: 6px !important; }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.card, [class~="rounded-3xl"])[class~="p-6"] {
      padding: 12px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.card, [class~="rounded-3xl"])[class~="p-5"] {
      padding: 10px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.card, [class~="rounded-3xl"])[class~="p-4"] {
      padding: 9px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.card, [class~="rounded-3xl"])[class~="p-3"] {
      padding: 7px !important;
    }

    /* Data grids: compact rows, cells and action controls. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main table th,
    .${ROOT_CLASS}.${ADMIN_CLASS} main table td,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table th,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table td {
      height: 28px !important;
      min-height: 28px !important;
      padding: 4px 8px !important;
      line-height: 1.25 !important;
      vertical-align: middle !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main table th,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table th {
      height: 26px !important;
      min-height: 26px !important;
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main table tr,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table tr,
    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-row-id] {
      height: 28px !important;
      min-height: 28px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main table td > :is(div, span),
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table td > :is(div, span) {
      line-height: 1.25 !important;
    }

    /* Do not let a long ranking list stretch its shorter sibling card. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main .grid:has(> .card) {
      align-items: start !important;
    }

    /* DataTable cells often contain stacked utility divs; tighten those stacks too. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main table tbody tr > td > *,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table tbody tr > td > *,
    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-row-id] > * {
      line-height: 1.15 !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main table tbody tr > td :is(div, span, small, strong, a),
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table tbody tr > td :is(div, span, small, strong, a),
    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-row-id] :is(div, span, small, strong, a) {
      line-height: 1.15 !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main table tbody tr > td :is(.space-y-0\\.5, .space-y-1, .space-y-2, .space-y-3),
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table tbody tr > td :is(.space-y-0\\.5, .space-y-1, .space-y-2, .space-y-3),
    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-row-id] :is(.space-y-0\\.5, .space-y-1, .space-y-2, .space-y-3) {
      row-gap: 2px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main table td :is(.btn, button, a),
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table td :is(.btn, button, a) {
      min-height: 24px !important;
      max-height: 28px !important;
      padding-top: 2px !important;
      padding-bottom: 2px !important;
      font-size: 11px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .table-wrapper .table-body > tr > td,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .table-wrapper .table-body > tr > th {
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(.modal-content, .dialog-container) table th,
    .${ROOT_CLASS}.${ADMIN_CLASS} :is(.modal-content, .dialog-container) table td {
      height: 28px !important;
      min-height: 28px !important;
      padding: 4px 8px !important;
      line-height: 1.25 !important;
      vertical-align: middle !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(.modal-content, .dialog-container) table tr {
      height: 28px !important;
    }

    /* Compact list/card rows used by mobile DataTable and admin sub-tables. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main .layout-section-scrollable .space-y-3 > div,
    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-field] {
      min-height: 24px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .layout-section-scrollable .space-y-3 > div[class*="rounded-"] {
      padding: 8px !important;
      border-radius: 3px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-field] {
      padding-top: 2px !important;
      padding-bottom: 2px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main [data-field] > :is(span, div) {
      font-size: 11px !important;
      line-height: 1.25 !important;
    }

    /* Keep chart cards present as tool windows, but collapse the actual graph until hover. */
    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas) {
      position: relative !important;
      overflow: hidden !important;
      cursor: zoom-in !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas) :is(div, section):has(> canvas) {
      max-height: 20px !important;
      min-height: 0 !important;
      overflow: hidden !important;
      opacity: 0.16 !important;
      filter: grayscale(1) saturate(0.3) !important;
      transition: max-height 180ms ease, opacity 140ms ease, filter 140ms ease !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas) canvas {
      max-height: 20px !important;
      opacity: 0.16 !important;
      filter: grayscale(1) saturate(0.3) !important;
      transition: max-height 180ms ease, opacity 140ms ease, filter 140ms ease !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas):hover :is(div, section):has(> canvas),
    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas):focus-within :is(div, section):has(> canvas) {
      max-height: 360px !important;
      min-height: 150px !important;
      overflow: visible !important;
      opacity: 1 !important;
      filter: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas):hover canvas,
    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas):focus-within canvas {
      max-height: 360px !important;
      opacity: 1 !important;
      filter: saturate(0.65) contrast(0.95) !important;
    }

    /* Charts should inherit the restrained IDEA palette when visible. */
    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.chart-container, canvas) {
      border-radius: 2px !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} :is(main, .modal-content, .dialog-container) :is(.card, [class~="rounded-3xl"], [class~="rounded-2xl"]):has(canvas):hover {
      cursor: default !important;
    }

    /* Ops dashboard wraps charts in fixed 360px columns; collapse those tool windows too. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is([class~="h-[360px]"], [class~="min-h-[360px]"]):has(canvas) {
      height: 44px !important;
      min-height: 44px !important;
      overflow: hidden !important;
      transition: height 180ms ease, min-height 180ms ease !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is([class~="h-[360px]"], [class~="min-h-[360px]"]):has(canvas):hover,
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is([class~="h-[360px]"], [class~="min-h-[360px]"]):has(canvas):focus-within {
      height: 360px !important;
      min-height: 360px !important;
      overflow: visible !important;
    }

    /* Neutralize bright SaaS text while retaining distinct, muted semantic states. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class~="text-white"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class~="text-gray-950"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class~="text-gray-900"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class~="text-gray-800"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class~="text-gray-700"] {
      color: var(--idea-admin-ink) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label, a)[class~="text-gray-600"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label, a)[class~="text-gray-500"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label, a)[class~="text-gray-400"] {
      color: var(--idea-muted) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class*="text-primary-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class*="text-blue-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class*="text-cyan-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(h1, h2, h3, h4, h5, h6, p, span, td, th, label, a)[class*="text-sky-"] {
      color: var(--idea-admin-link) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-emerald-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-green-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-teal-"] {
      color: var(--idea-admin-green) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-amber-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-orange-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-yellow-"] {
      color: var(--idea-admin-amber) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-red-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-rose-"] {
      color: var(--idea-admin-red) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-purple-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-violet-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(p, span, td, th, label)[class*="text-indigo-"] {
      color: var(--idea-admin-purple) !important;
    }

    /* Large colored callout blocks become neutral IDE tool-window surfaces. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-primary-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-blue-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-green-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-emerald-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-amber-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-orange-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-purple-50"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, section, aside)[class*="bg-red-50"] {
      background: var(--idea-admin-panel-alt) !important;
      border-color: var(--idea-admin-line) !important;
      box-shadow: none !important;
    }

    /* Keep the IDE selection blue legible over the neutralized surfaces. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.btn-primary, .tab-active, .settings-tab-active, .channel-tab-active) {
      color: #fff !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.btn-primary, .tab-active, .settings-tab-active, .channel-tab-active)[class*="bg-white"] {
      color: var(--idea-admin-link) !important;
    }

    /* KPI values are divs in the operations workspace, so include them in the muted palette. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class~="text-white"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class~="text-gray-950"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class~="text-gray-900"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class~="text-gray-800"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class~="text-gray-700"] {
      color: var(--idea-admin-ink) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-primary-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-blue-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-cyan-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-sky-"] {
      color: var(--idea-admin-link) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-emerald-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-green-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-teal-"] {
      color: var(--idea-admin-green) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-amber-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-orange-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-yellow-"] {
      color: var(--idea-admin-amber) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-red-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-rose-"] {
      color: var(--idea-admin-red) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-purple-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-violet-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(div, svg, strong, small)[class*="text-indigo-"] {
      color: var(--idea-admin-purple) !important;
    }

    /* Replace saturated pill fills with outlined IDE badges and muted switches. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-primary,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-success,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-warning,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-danger,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-gray,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-purple {
      background: transparent !important;
      box-shadow: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-primary { color: var(--idea-admin-link) !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-success { color: var(--idea-admin-green) !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-warning { color: var(--idea-admin-amber) !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-danger { color: var(--idea-admin-red) !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-gray { color: var(--idea-muted) !important; }
    .${ROOT_CLASS}.${ADMIN_CLASS} main .badge-purple { color: var(--idea-admin-purple) !important; }

    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-primary-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-blue-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-cyan-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-emerald-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-green-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-teal-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-amber-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-orange-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-yellow-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-red-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-rose-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-purple-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-violet-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-indigo-"],
    .${ROOT_CLASS}.${ADMIN_CLASS} main > * span[class*="bg-pink-"] {
      background: var(--idea-admin-panel-alt) !important;
      border-color: var(--idea-admin-line) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main button[class~="h-5"][class~="w-9"][class~="rounded-full"] {
      background: var(--idea-accent) !important;
      border-color: var(--idea-border) !important;
    }

    /* Flat, outlined controls read like an IDE toolbar instead of a SaaS CTA row. */
    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.btn, .btn-primary, .btn-secondary, .btn-success, .btn-warning, .btn-danger, .btn-ghost) {
      border-radius: 3px !important;
      background-image: none !important;
      box-shadow: none !important;
      transform: none !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .btn-primary {
      border: 1px solid var(--idea-accent) !important;
      background: var(--idea-active-bg) !important;
      color: var(--idea-active-text) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .btn-secondary,
    .${ROOT_CLASS}.${ADMIN_CLASS} main .btn-ghost {
      border: 1px solid var(--idea-admin-line) !important;
      background: var(--idea-admin-panel-alt) !important;
      color: var(--idea-muted) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .btn-success {
      border: 1px solid var(--idea-admin-green) !important;
      background: transparent !important;
      color: var(--idea-admin-green) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .btn-warning {
      border: 1px solid var(--idea-admin-amber) !important;
      background: transparent !important;
      color: var(--idea-admin-amber) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main .btn-danger {
      border: 1px solid var(--idea-admin-red) !important;
      background: transparent !important;
      color: var(--idea-admin-red) !important;
    }

    .${ROOT_CLASS}.${ADMIN_CLASS} main :is(.btn, .btn-primary, .btn-secondary, .btn-success, .btn-warning, .btn-danger, .btn-ghost):hover {
      background: var(--idea-active-bg) !important;
      box-shadow: none !important;
    }

    /* A quiet IDE status bar keeps the bottom edge visually anchored. */
    .${STATUS_CLASS} {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 10000;
      display: flex;
      height: 22px;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      border-top: 1px solid var(--idea-border);
      background: var(--idea-sidebar);
      color: var(--idea-muted);
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      pointer-events: none;
      user-select: none;
    }

    .${STATUS_CLASS} .status-accent {
      color: var(--idea-accent);
    }

    @media (max-width: 700px) {
      .${ROOT_CLASS} header.glass {
        height: 52px !important;
        min-height: 52px !important;
      }

      .${ROOT_CLASS} header.glass > :not(.${MENU_CLASS}) {
        position: static !important;
        inset: auto !important;
        height: 52px !important;
        padding-right: 8px !important;
        padding-left: 8px !important;
      }

      .${ROOT_CLASS} header.glass > div.flex > div:first-child {
        display: flex !important;
      }

      .${ROOT_CLASS} header.glass > div.flex > div:last-child {
        height: 52px !important;
      }

      .${ROOT_CLASS} .${MENU_CLASS} {
        display: none;
      }

      .${ROOT_CLASS} .sidebar-header {
        height: 56px !important;
        min-height: 56px !important;
        padding-right: 24px !important;
        padding-left: 24px !important;
      }

      .${ROOT_CLASS} main {
        padding: 12px !important;
      }

      .${ROOT_CLASS} .table-page-layout {
        height: auto !important;
      }

      .${ROOT_CLASS} .sidebar-brand::after {
        display: none;
      }
    }
  `

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    ;(document.head || document.documentElement).appendChild(style)
  }

  function looksLikeSub2Api() {
    const app = document.querySelector('#app')
    const hasAppShell = Boolean(app?.childElementCount && app.querySelector('.sidebar') && app.querySelector('header.glass'))
    const hasDocumentShell = document.querySelector('.sidebar') && document.querySelector('header.glass')
    const hasStandaloneView = app?.querySelector(
      '.card-glass, .terminal-container, [data-testid="compact-home"]'
    )
    const hasInjectedConfig = window.__APP_CONFIG__ && typeof window.__APP_CONFIG__ === 'object'
    const hasKnownBrand = /(?:Sub2API\s*-\s*AI API Gateway|Ku AI)/i.test(document.title)
    const hasAdminShell = isAdminRoute() && Boolean(document.querySelector('.sidebar'))
    return Boolean(hasAppShell || hasDocumentShell || hasStandaloneView || hasInjectedConfig || hasKnownBrand || hasAdminShell)
  }

  function addMenuBar() {
    const header = document.querySelector('#app header.glass')
    if (!header || header.querySelector(`.${MENU_CLASS}`)) return
    const menu = document.createElement('div')
    menu.className = MENU_CLASS
    menu.setAttribute('aria-hidden', 'true')
    for (const label of menuItems) {
      const item = document.createElement('span')
      item.textContent = label
      menu.appendChild(item)
    }
    header.insertBefore(menu, header.firstChild)
  }

  function addStatusBar() {
    if (!document.body || document.body.querySelector(`.${STATUS_CLASS}`)) return
    const status = document.createElement('div')
    status.className = STATUS_CLASS
    status.innerHTML = '<span>IDEA</span><span class="status-accent status-context">UTF-8</span><span>Ready</span>'
    document.body.appendChild(status)
  }

  function isAdminRoute() {
    return /^\/admin(?:\/|$)/i.test(location.pathname)
  }

  function syncAdminStatus() {
    const context = document.querySelector(`.${STATUS_CLASS} .status-context`)
    if (context) context.textContent = isAdminRoute() ? 'Admin' : 'UTF-8'
  }

  function applyTheme() {
    injectStyle()
    const root = document.documentElement
    const admin = isAdminRoute()
    root.classList.add(ROOT_CLASS)
    root.classList.toggle(ADMIN_CLASS, admin)
    document.body?.classList.toggle(ADMIN_CLASS, admin)
    root.dataset.sub2apiIdea = 'true'
    addMenuBar()
    addStatusBar()
    syncAdminStatus()
  }

  let frame = 0
  function scheduleApply() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (looksLikeSub2Api()) applyTheme()
    })
  }

  function bootstrap() {
    const observer = new MutationObserver(scheduleApply)
    observer.observe(document.documentElement, { childList: true, subtree: true })

    for (const method of ['pushState', 'replaceState']) {
      const original = history[method]
      history[method] = function (...args) {
        const result = original.apply(this, args)
        scheduleApply()
        return result
      }
    }

    window.addEventListener('popstate', scheduleApply)
    window.addEventListener('hashchange', scheduleApply)
    document.addEventListener('DOMContentLoaded', scheduleApply, { once: true })
    scheduleApply()
  }

  bootstrap()
})()
