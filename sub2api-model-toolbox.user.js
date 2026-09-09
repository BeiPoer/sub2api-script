// ==UserScript==
// @name         Sub2API 运维工具箱
// @namespace    https://github.com/Wei-Shaw/sub2api
// @version      0.1.1
// @updateURL    https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-model-toolbox.user.js
// @downloadURL  https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-model-toolbox.user.js
// @description  在 Sub2API 管理员页面直接测试 API Key 上游账号
// @author       sub2api contributors
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict'

  const HOST_ID = 'sub2api-model-toolbox'
  const PROMPT = '回复【ok】'
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 5
  const REQUEST_TIMEOUT = 60000
  const state = {
    open: false,
    initialized: false,
    loading: false,
    running: false,
    groups: [],
    accounts: [],
    groupId: '',
    schedule: 'on',
    selected: new Set(),
    results: [],
    quickAccounts: [],
    quickLoading: false
  }

  let host = null
  let shadow = null
  let elements = null

  const CSS = String.raw`
    :host { all: initial; }
    [hidden] { display: none !important; }
    .root {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      color: #172033;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    button, input, select { font: inherit; }
    button { cursor: pointer; }
    .edge {
      position: absolute;
      top: 50%;
      right: 0;
      width: 24px;
      height: 58px;
      padding: 0;
      transform: translateY(-50%);
      pointer-events: auto;
      border: 1px solid #cbd5e1;
      border-right: 0;
      border-radius: 8px 0 0 8px;
      background: #fff;
      color: #475569;
      box-shadow: 0 5px 18px rgba(15, 23, 42, .16);
      font-size: 22px;
      line-height: 1;
    }
    .edge:hover { background: #f1f5f9; color: #2563eb; }
    .panel {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      flex-direction: column;
      width: min(480px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      overflow: hidden;
      pointer-events: auto;
      border: 1px solid #d9e1eb;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 16px 44px rgba(15, 23, 42, .2);
    }
    .panel-header, .view-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      border-bottom: 1px solid #e5eaf0;
    }
    .panel-header strong, .view-header strong { color: #0f172a; font-size: 14px; }
    .icon-button {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #64748b;
      font-size: 18px;
      line-height: 1;
    }
    .icon-button:hover { background: #eef2f7; color: #2563eb; }
    .panel-body { min-height: 0; overflow: auto; }
    .menu { padding: 14px; }
    .tool-button {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid #dbe3ec;
      border-radius: 7px;
      background: #f8fafc;
      color: #1e293b;
      text-align: left;
    }
    .tool-button:hover { border-color: #93b4f4; background: #eff6ff; color: #1d4ed8; }
    .tool-glyph { color: #2563eb; font-size: 16px; }
    .test-view { display: flex; flex-direction: column; min-height: 0; }
    .view-header { justify-content: flex-start; }
    .view-header .spacer { flex: 1; }
    .filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 8px; padding: 10px 12px 8px; }
    .field { min-width: 0; display: flex; flex-direction: column; gap: 4px; color: #64748b; font-size: 11px; }
    input, select {
      width: 100%;
      min-width: 0;
      height: 32px;
      padding: 0 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      outline: 0;
      background: #fff;
      color: #1e293b;
    }
    input:focus, select:focus { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, .16); }
    .small-button, .primary-button {
      height: 32px;
      padding: 0 10px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .small-button { align-self: end; border: 1px solid #cbd5e1; background: #fff; color: #475569; }
    .small-button:hover { border-color: #93b4f4; color: #2563eb; }
    .account-toolbar { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 12px; color: #64748b; font-size: 11px; }
    .account-toolbar .count { flex: 1; }
    .account-toolbar button { padding: 0; border: 0; background: transparent; color: #2563eb; font-size: 11px; }
    .account-toolbar button:hover { text-decoration: underline; }
    .account-list { max-height: 260px; overflow: auto; border-top: 1px solid #edf1f5; border-bottom: 1px solid #edf1f5; }
    .account-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #f0f3f7; }
    .account-row:last-child { border-bottom: 0; }
    .account-row:hover { background: #f8fafc; }
    .account-row input[type="checkbox"] { width: 15px; height: 15px; flex: 0 0 15px; margin-top: 2px; accent-color: #2563eb; }
    .account-main { min-width: 0; flex: 1; }
    .account-name { display: flex; align-items: center; gap: 6px; min-width: 0; color: #1e293b; font-weight: 600; }
    .copy-buttons { display: inline-flex; gap: 3px; flex: 0 0 auto; }
    .copy-button { width: 22px; height: 20px; padding: 0; border: 1px solid #dbe3ec; border-radius: 4px; background: #fff; color: #64748b; font-size: 10px; line-height: 1; }
    .copy-button:hover { border-color: #93b4f4; background: #eff6ff; color: #2563eb; }
    .account-name span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .account-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 2px; color: #64748b; font-size: 11px; }
    .badge { display: inline-flex; align-items: center; padding: 1px 5px; border: 1px solid #dbe3ec; border-radius: 4px; background: #f8fafc; color: #64748b; font-size: 10px; }
    .badge.ok { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }
    .badge.off { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
    .muted { color: #94a3b8; font-size: 11px; }
    .empty { padding: 24px 12px; color: #94a3b8; text-align: center; }
    .run-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 10px 12px; }
    .primary-button { align-self: end; border: 1px solid #2563eb; background: #2563eb; color: #fff; }
    .primary-button:hover:not(:disabled) { background: #1d4ed8; }
    button:disabled, input:disabled, select:disabled { cursor: not-allowed; opacity: .55; }
    .notice { min-height: 20px; padding: 0 12px 8px; color: #64748b; font-size: 11px; }
    .notice.error { color: #b91c1c; }
    .results { display: flex; flex-direction: column; gap: 7px; padding: 0 12px 12px; }
    .result { padding: 8px; border: 1px solid #dbe3ec; border-left: 3px solid #22c55e; border-radius: 6px; background: #fbfdff; }
    .result.failed { border-left-color: #ef4444; }
    .result-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .result-head strong { min-width: 0; overflow: hidden; color: #1e293b; text-overflow: ellipsis; white-space: nowrap; }
    .result-head .time { margin-left: auto; color: #94a3b8; font-size: 10px; }
    .result pre { max-height: 160px; margin: 6px 0 0; overflow: auto; white-space: pre-wrap; word-break: break-word; color: #334155; font: 11px/1.5 Consolas, monospace; }
    .result-error { margin-top: 5px; color: #b91c1c; font-size: 11px; word-break: break-word; }
    @media (max-width: 540px) {
      .panel { top: 8px; right: 8px; width: calc(100vw - 16px); max-height: calc(100vh - 16px); }
      .filters { grid-template-columns: 1fr 1fr; }
      .filters .small-button { grid-column: 2; }
    }
  `

  const TEMPLATE = `
    <div class="root">
      <button class="edge" id="edge" type="button" title="展开工具箱" aria-label="展开工具箱">‹</button>
      <section class="panel" id="panel" hidden aria-label="Sub2API 模型测试工具箱">
        <header class="panel-header">
          <strong>工具箱</strong>
          <button class="icon-button" id="collapse" type="button" title="折叠工具箱" aria-label="折叠工具箱">›</button>
        </header>
        <div class="panel-body">
          <div class="menu" id="menu">
            <button class="tool-button" id="model-tool" type="button"><span class="tool-glyph">◇</span><span>模型测试</span></button>
            <button class="tool-button" id="quick-tool" type="button"><span class="tool-glyph">⧉</span><span>快速获取渠道 URL + Key</span></button>
          </div>
          <div class="test-view" id="test-view" hidden>
            <div class="view-header">
              <button class="icon-button" id="back" type="button" title="返回工具箱" aria-label="返回工具箱">←</button>
              <strong>模型测试</strong>
              <span class="spacer"></span>
              <button class="icon-button" id="refresh" type="button" title="刷新账号" aria-label="刷新账号">↻</button>
            </div>
            <div class="filters">
              <label class="field"><span>分组</span><select id="group"></select></label>
              <label class="field"><span>调度</span><select id="schedule"><option value="all">全部</option><option value="on" selected>开启</option><option value="off">关闭</option></select></label>
              <button class="small-button" id="reload" type="button">重新加载</button>
            </div>
            <div class="account-toolbar"><span class="count" id="count">未加载账号</span><button id="select-all" type="button">全选当前</button><button id="clear-selection" type="button">清空</button></div>
            <div class="account-list" id="accounts"></div>
            <div class="run-panel">
              <label class="field"><span>模型</span><input id="model" type="text" autocomplete="off" placeholder="例如：gpt-4o-mini" /></label>
              <button class="primary-button" id="test" type="button">测试</button>
            </div>
            <div class="notice" id="notice"></div>
            <div class="results" id="results"></div>
          </div>
          <div class="test-view" id="quick-view" hidden>
            <div class="view-header"><button class="icon-button" id="quick-back" type="button" title="返回工具箱" aria-label="返回工具箱">←</button><strong>渠道 URL + Key</strong><span class="spacer"></span><button class="icon-button" id="quick-refresh" type="button" title="刷新账号" aria-label="刷新账号">↻</button></div>
            <div class="account-list" id="quick-accounts"></div>
          </div>
        </div>
      </section>
    </div>
  `

  function isAdminRoute() {
    return /^\/admin(?:\/|$)/i.test(window.location.pathname)
  }

  function looksLikeSub2API() {
    return Boolean(
      window.__APP_CONFIG__ ||
      document.querySelector('#app .sidebar, #app header.glass, .sidebar, header.glass') ||
      /Sub2API|Ku AI/i.test(document.title)
    )
  }

  function currentApiBase() {
    // api_base_url is a public client-generation setting and can point at a
    // different gateway. Admin data belongs to the current Sub2API origin.
    return '/api/v1'
  }

  function adminURL(path, params) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : ''
    return `${currentApiBase()}${path.startsWith('/') ? path : `/${path}`}${query}`
  }

  async function adminGet(path, params) {
    const headers = { Accept: 'application/json' }
    const token = localStorage.getItem('auth_token')
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(adminURL(path, params), { headers, credentials: 'include' })
    const text = await response.text()
    let body
    try { body = text ? JSON.parse(text) : null } catch { body = null }
    if (!response.ok) throw new Error(`管理接口 ${response.status}${readError(body) ? `：${readError(body)}` : ''}`)
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'code')) {
      if (body.code !== 0) throw new Error(body.message || `管理接口错误 ${body.code}`)
      return body.data
    }
    return body
  }

  function readError(value) {
    if (!value || typeof value !== 'object') return ''
    const error = value.error
    if (typeof error === 'string') return error
    if (error && typeof error === 'object' && typeof error.message === 'string') return error.message
    return typeof value.message === 'string' ? value.message : ''
  }

  function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  }

  function asString(value) {
    return typeof value === 'string' ? value.trim() : ''
  }

  function numberId(value) {
    const id = Number(value)
    return Number.isFinite(id) ? id : 0
  }

  function groupNames(account) {
    const names = []
    const groups = Array.isArray(account.groups) ? account.groups : []
    for (const group of groups) {
      const name = asString(asRecord(group).name)
      if (name && !names.includes(name)) names.push(name)
    }
    const ids = Array.isArray(account.group_ids) ? account.group_ids : []
    for (const id of ids) {
      const group = state.groups.find((item) => numberId(item.id) === numberId(id))
      if (group && asString(group.name) && !names.includes(group.name)) names.push(asString(group.name))
    }
    const accountGroups = Array.isArray(account.account_groups) ? account.account_groups : []
    for (const item of accountGroups) {
      const group = state.groups.find((candidate) => numberId(candidate.id) === numberId(asRecord(item).group_id))
      if (group && asString(group.name) && !names.includes(group.name)) names.push(asString(group.name))
    }
    return names
  }

  function accountBase(account, protocol) {
    const credentials = asRecord(account.credentials)
    const protocolBases = asRecord(credentials.api_base_urls)
    const selected = asString(protocolBases[protocol])
    if (selected) return selected
    if (asString(credentials.base_url)) return asString(credentials.base_url)

    const platform = asString(account.platform).toLowerCase()
    const mode = asString(credentials.account_mode).toLowerCase() === 'coding' ? 'coding' : 'payg'
    if (platform === 'openai') return 'https://api.openai.com'
    if (platform === 'anthropic') return 'https://api.anthropic.com'
    if (platform === 'gemini') return 'https://generativelanguage.googleapis.com'
    if (platform === 'grok') return 'https://api.x.ai/v1'
    if (platform === 'kimi') {
      if (protocol === 'anthropic') return mode === 'coding' ? 'https://api.kimi.com/coding' : 'https://api.moonshot.cn/anthropic'
      return mode === 'coding' ? 'https://api.kimi.com/coding/v1' : 'https://api.moonshot.cn/v1'
    }
    if (platform === 'zhipu') {
      if (protocol === 'anthropic') return 'https://open.bigmodel.cn/api/anthropic'
      return mode === 'coding' ? 'https://open.bigmodel.cn/api/coding/paas/v4' : 'https://open.bigmodel.cn/api/paas/v4'
    }
    if (platform === 'deepseek') {
      return protocol === 'anthropic' ? 'https://api.deepseek.com/anthropic' : 'https://api.deepseek.com'
    }
    return ''
  }

  function connectionFor(account, model) {
    const credentials = asRecord(account.credentials)
    const extra = asRecord(account.extra)
    const key = asString(credentials.api_key)
    if (!key) throw new Error('账号没有可用的 API Key')
    const platform = asString(account.platform).toLowerCase()
    let protocol = 'chat_completions'

    if (platform === 'anthropic') {
      protocol = 'anthropic'
    } else if (platform === 'gemini') {
      protocol = 'gemini'
    } else if (platform === 'antigravity') {
      protocol = /^gemini-/i.test(model.trim()) ? 'gemini' : 'anthropic'
    } else if (platform === 'openai') {
      const mode = asString(extra.openai_responses_mode)
      protocol = mode === 'force_chat_completions' || (mode !== 'force_responses' && extra.openai_responses_supported === false)
        ? 'chat_completions'
        : 'responses'
    } else if (platform === 'grok') {
      protocol = 'responses'
    } else if (platform === 'kimi' || platform === 'zhipu' || platform === 'deepseek') {
      const configured = asString(credentials.api_protocol)
      protocol = configured === 'anthropic' || configured === 'responses' || configured === 'chat_completions'
        ? configured
        : 'chat_completions'
      if (platform === 'zhipu' && protocol === 'responses') protocol = 'chat_completions'
    }

    const base = accountBase(account, protocol === 'gemini' ? 'chat_completions' : protocol)
    if (!base) throw new Error('账号没有可用的上游 API 地址')
    let url
    if (protocol === 'anthropic') url = appendEndpoint(base, '/v1/messages')
    else if (protocol === 'gemini') url = appendEndpoint(base, `/v1beta/models/${encodeURIComponent(model.trim())}:generateContent`)
    else if (protocol === 'responses') url = appendEndpoint(base, platform === 'deepseek' ? '/responses' : '/v1/responses')
    else url = appendEndpoint(base, '/v1/chat/completions')
    return { key, protocol, url, extra }
  }

  function appendEndpoint(rawBase, endpoint) {
    let parsed
    try { parsed = new URL(rawBase, window.location.href) } catch { throw new Error('上游 API 地址格式无效') }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('上游 API 地址必须使用 HTTP 或 HTTPS')
    const ep = `/${String(endpoint).replace(/^\/+/, '')}`
    const match = ep.match(/^\/(v\d+(?:\.\d+)?(?:alpha|beta|preview)?)(\/.*)$/i)
    const relative = match ? match[2] : ep
    const path = parsed.pathname.replace(/\/+$/, '')
    if (!path.endsWith(ep) && !path.endsWith(relative)) {
      const versionSuffix = /\/v\d+(?:\.\d+)?(?:alpha|beta|preview)?$/i.test(path)
      parsed.pathname = `${path}${versionSuffix ? relative : ep}` || '/'
    }
    parsed.hash = ''
    return parsed.toString()
  }

  function requestPayload(connection, model) {
    if (connection.protocol === 'anthropic') {
      return {
        model,
        max_tokens: 64,
        messages: [{ role: 'user', content: PROMPT }],
        stream: false
      }
    }
    if (connection.protocol === 'gemini') {
      return {
        contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
        generationConfig: { maxOutputTokens: 64 }
      }
    }
    if (connection.protocol === 'responses') {
      return {
        model,
        input: [{ role: 'user', content: [{ type: 'input_text', text: PROMPT }] }],
        max_output_tokens: 64,
        stream: false
      }
    }
    return {
      model,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: 64,
      stream: false
    }
  }

  function requestHeaders(connection) {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (connection.protocol === 'anthropic') {
      if (connection.extra.anthropic_apikey_auth_scheme === 'authorization_bearer') headers.Authorization = `Bearer ${connection.key}`
      else headers['x-api-key'] = connection.key
      headers['anthropic-version'] = '2023-06-01'
    } else if (connection.protocol === 'gemini') {
      headers['x-goog-api-key'] = connection.key
    } else {
      headers.Authorization = `Bearer ${connection.key}`
    }
    return headers
  }

  function gmRequest(details) {
    const legacy = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null
    const modernGM = typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function' ? GM : null
    const modern = modernGM ? modernGM.xmlHttpRequest.bind(modernGM) : null
    const request = legacy || modern
    if (!request) {
      return fetch(details.url, {
        method: details.method,
        headers: details.headers,
        body: details.data,
        credentials: 'include'
      }).then(async (response) => ({
        status: response.status,
        responseText: await response.text(),
        responseHeaders: response.headers.get('content-type') || ''
      }))
    }
    return new Promise((resolve, reject) => {
      request({
        method: details.method,
        url: details.url,
        headers: details.headers,
        data: details.data,
        timeout: REQUEST_TIMEOUT,
        onload: resolve,
        onerror: () => reject(new Error('上游网络请求失败')),
        ontimeout: () => reject(new Error('上游请求超时')),
        onabort: () => reject(new Error('上游请求已取消'))
      })
    })
  }

  async function directRequest(connection, model) {
    const response = await gmRequest({
      method: 'POST',
      url: connection.url,
      headers: requestHeaders(connection),
      data: JSON.stringify(requestPayload(connection, model))
    })
    const status = Number(response.status) || 0
    const body = response.responseText || ''
    if (status < 200 || status >= 300) {
      const parsed = parseResponseBody(body, response.responseHeaders)
      throw new Error(`上游返回 ${status || '未知状态'}${extractError(parsed) ? `：${extractError(parsed)}` : ''}`)
    }
    return parseResponseBody(body, response.responseHeaders)
  }

  function parseResponseBody(text, contentType) {
    if (/event-stream/i.test(String(contentType || '')) || /^\s*data:/m.test(text)) return parseSSE(text)
    try { return text ? JSON.parse(text) : '' } catch { return text }
  }

  function parseSSE(text) {
    const chunks = []
    let last = null
    for (const line of String(text).split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue
      const value = line.slice(5).trim()
      if (!value || value === '[DONE]') continue
      try {
        const event = JSON.parse(value)
        last = event
        const delta = extractDeltaText(event)
        if (delta) chunks.push(delta)
      } catch { /* ignore keep-alive/non-JSON SSE lines */ }
    }
    return chunks.length ? { output_text: chunks.join('') } : (last || text)
  }

  function extractDeltaText(value) {
    const item = asRecord(value)
    if (typeof item.delta === 'string') return item.delta
    if (asRecord(item.delta).text) return asString(asRecord(item.delta).text)
    if (item.type === 'response.output_text.delta') return asString(item.delta)
    const choices = Array.isArray(item.choices) ? item.choices : []
    if (choices[0]) {
      const choice = asRecord(choices[0])
      const delta = asRecord(choice.delta)
      if (typeof delta.content === 'string') return delta.content
      if (Array.isArray(delta.content)) return contentText(delta.content)
    }
    const candidates = Array.isArray(item.candidates) ? item.candidates : []
    if (candidates[0]) return contentText(asRecord(candidates[0]).content)
    return ''
  }

  function contentText(value) {
    if (typeof value === 'string') return value
    if (!Array.isArray(value)) {
      const item = asRecord(value)
      return asString(item.text) || (item.parts ? contentText(item.parts) : '') || (item.content ? contentText(item.content) : '')
    }
    return value.map((item) => contentText(item)).filter(Boolean).join('')
  }

  function extractText(value) {
    if (typeof value === 'string') return value
    const body = asRecord(value)
    if (!Object.keys(body).length) return ''
    for (const key of ['output_text', 'outputText', 'text']) {
      if (typeof body[key] === 'string' && body[key].trim()) return body[key].trim()
    }
    const choices = Array.isArray(body.choices) ? body.choices : []
    if (choices[0]) {
      const choice = asRecord(choices[0])
      const messageText = contentText(asRecord(choice.message).content)
      if (messageText) return messageText
      if (asString(choice.text)) return asString(choice.text)
      const deltaText = contentText(asRecord(choice.delta).content)
      if (deltaText) return deltaText
    }
    const output = Array.isArray(body.output) ? body.output : []
    const outputText = contentText(output.map((item) => asRecord(item).content || item))
    if (outputText) return outputText
    const content = contentText(body.content)
    if (content) return content
    const candidates = Array.isArray(body.candidates) ? body.candidates : []
    const candidateText = contentText(candidates.map((item) => asRecord(item).content))
    if (candidateText) return candidateText
    if (body.response) return extractText(body.response)
    return ''
  }

  function extractError(value) {
    const body = asRecord(value)
    const error = asRecord(body.error)
    return asString(error.message) || asString(body.message) || asString(body.error)
  }

  function displayBody(value) {
    const text = extractText(value)
    if (text) return text
    if (typeof value === 'string') return value.trim() || '(空响应)'
    try { return JSON.stringify(value, null, 2) } catch { return String(value) }
  }

  async function testOne(account, model) {
    const started = performance.now()
    try {
      const connection = connectionFor(account, model)
      const response = await directRequest(connection, model)
      const error = extractError(response)
      return {
        id: numberId(account.id),
        name: asString(account.name) || `账号 ${account.id}`,
        protocol: connection.protocol,
        ok: !error,
        text: displayBody(response),
        error,
        latency: Math.round(performance.now() - started)
      }
    } catch (error) {
      return {
        id: numberId(account.id),
        name: asString(account.name) || `账号 ${account.id}`,
        protocol: '未发送',
        ok: false,
        text: '',
        error: error instanceof Error ? error.message : String(error),
        latency: Math.round(performance.now() - started)
      }
    }
  }

  async function listAccounts(filterGroup = true) {
    const accounts = []
    let page = 1
    let pages = 1
    do {
      const params = { type: 'apikey', page: String(page), page_size: String(PAGE_SIZE), sort_by: 'name', sort_order: 'asc' }
      if (filterGroup && state.groupId) params.group = state.groupId
      const payload = asRecord(await adminGet('/admin/accounts', params))
      const items = Array.isArray(payload.items) ? payload.items : []
      accounts.push(...items)
      const total = Number(payload.total) || 0
      pages = Math.max(Number(payload.pages) || 0, total ? Math.ceil(total / PAGE_SIZE) : 1)
      if (!items.length || page >= pages) break
      page += 1
    } while (page <= 1000)
    return accounts
  }

  async function loadData(clearResults) {
    if (state.loading) return
    state.loading = true
    state.selected.clear()
    if (clearResults) state.results = []
    setNotice('正在加载分组和账号…')
    renderResults()
    try {
      const groups = await adminGet('/admin/groups/all', { include_inactive: 'true' })
      state.groups = Array.isArray(groups) ? groups : []
      if (!state.initialized) state.groupId = state.groups.length ? String(state.groups[0].id) : ''
      else if (state.groupId && !state.groups.some((group) => String(group.id) === state.groupId)) state.groupId = state.groups.length ? String(state.groups[0].id) : ''
      renderGroups()
      state.accounts = await listAccounts()
      state.initialized = true
      setNotice('')
    } catch (error) {
      state.accounts = []
      setNotice(error instanceof Error ? error.message : String(error), true)
    } finally {
      state.loading = false
      renderAccounts()
      renderResults()
      updateControls()
    }
  }

  async function reloadAccounts() {
    if (state.loading) return
    state.loading = true
    state.selected.clear()
    setNotice('正在加载账号…')
    try {
      state.accounts = await listAccounts()
      setNotice('')
    } catch (error) {
      state.accounts = []
      setNotice(error instanceof Error ? error.message : String(error), true)
    } finally {
      state.loading = false
      renderAccounts()
      updateControls()
    }
  }

  function visibleAccounts() {
    return state.accounts.filter((account) => {
      if (state.schedule === 'all') return true
      return Boolean(account.schedulable) === (state.schedule === 'on')
    })
  }

  function renderGroups() {
    if (!elements) return
    elements.group.replaceChildren()
    const all = document.createElement('option')
    all.value = ''
    all.textContent = '全部分组'
    elements.group.appendChild(all)
    for (const group of state.groups) {
      const option = document.createElement('option')
      option.value = String(group.id)
      option.textContent = `${asString(group.name) || `分组 ${group.id}`}${group.status === 'inactive' ? '（停用）' : ''}`
      elements.group.appendChild(option)
    }
    elements.group.value = state.groupId
  }

  function renderAccounts() {
    if (!elements) return
    const visible = visibleAccounts()
    const valid = new Set(state.accounts.map((account) => String(account.id)))
    for (const id of state.selected) if (!valid.has(String(id))) state.selected.delete(id)
    elements.accounts.replaceChildren()
    if (!visible.length) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = state.loading ? '正在加载…' : '没有符合筛选条件的 API Key 账号'
      elements.accounts.appendChild(empty)
    } else {
      for (const account of visible) elements.accounts.appendChild(accountRow(account))
    }
    const selectedVisible = visible.filter((account) => state.selected.has(String(account.id))).length
    elements.count.textContent = `显示 ${visible.length} 个，已选 ${selectedVisible} 个`
    updateControls()
  }

  function renderQuickAccounts() {
    if (!elements) return
    elements.quickAccounts.replaceChildren()
    if (state.quickLoading) {
      const loading = document.createElement('div')
      loading.className = 'empty'
      loading.textContent = '正在加载…'
      elements.quickAccounts.appendChild(loading)
    } else if (!state.quickAccounts.length) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = '没有 API Key 账号'
      elements.quickAccounts.appendChild(empty)
    } else {
      for (const account of state.quickAccounts) elements.quickAccounts.appendChild(accountRow(account, true))
    }
  }

  async function loadQuickAccounts() {
    if (state.quickLoading) return
    state.quickLoading = true
    renderQuickAccounts()
    try { state.quickAccounts = await listAccounts(false) } catch { state.quickAccounts = [] }
    state.quickLoading = false
    renderQuickAccounts()
  }

  async function copyText(text, button) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const input = document.createElement('textarea')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    const old = button.textContent
    button.textContent = '✓'
    setTimeout(() => { button.textContent = old }, 900)
  }

  function accountRow(account, quick = false) {
    const credentials = asRecord(account.credentials)
    const key = asString(credentials.api_key)
    const base = asString(credentials.base_url) || (asString(account.platform).toLowerCase() !== 'antigravity' ? '默认地址' : '')
    const row = document.createElement(quick ? 'div' : 'label')
    row.className = 'account-row'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = state.selected.has(String(account.id))
    checkbox.disabled = !key || !base || state.loading || state.running
    checkbox.addEventListener('change', () => {
      const id = String(account.id)
      if (checkbox.checked) state.selected.add(id)
      else state.selected.delete(id)
      renderAccounts()
    })
    if (!quick) row.appendChild(checkbox)

    const main = document.createElement('div')
    main.className = 'account-main'
    const name = document.createElement('div')
    name.className = 'account-name'
    const nameText = document.createElement('span')
    nameText.textContent = asString(account.name) || `账号 ${account.id}`
    const copyButtons = document.createElement('span')
    copyButtons.className = 'copy-buttons'
    for (const [label, title, value] of [['URL', '复制 API URL', base], ['Key', '复制 API Key', key]]) {
      const button = document.createElement('button')
      button.className = 'copy-button'
      button.type = 'button'
      button.title = title
      button.textContent = label
      button.disabled = !value || value === '默认地址'
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); copyText(value, button) })
      copyButtons.appendChild(button)
    }
    name.appendChild(copyButtons)
    name.appendChild(nameText)
    const status = document.createElement('span')
    status.className = `badge ${account.status === 'active' ? 'ok' : 'off'}`
    status.textContent = asString(account.status) || '未知状态'
    name.appendChild(status)
    main.appendChild(name)

    const meta = document.createElement('div')
    meta.className = 'account-meta'
    const platform = document.createElement('span')
    platform.textContent = asString(account.platform) || 'unknown'
    meta.appendChild(platform)
    const names = groupNames(account)
    const group = document.createElement('span')
    group.textContent = names.length ? names.join(' / ') : '未分组'
    meta.appendChild(group)
    const schedule = document.createElement('span')
    schedule.className = `badge ${account.schedulable ? 'ok' : 'off'}`
    schedule.textContent = account.schedulable ? '调度开启' : '调度关闭'
    meta.appendChild(schedule)
    main.appendChild(meta)

    if (!key || !base) {
      const missing = document.createElement('div')
      missing.className = 'muted'
      missing.textContent = !key ? '缺少 API Key' : '缺少上游 API 地址'
      main.appendChild(missing)
    }
    row.appendChild(main)
    return row
  }

  function renderResults() {
    if (!elements) return
    elements.results.replaceChildren()
    for (const result of state.results) {
      const item = document.createElement('article')
      item.className = `result${result.ok ? '' : ' failed'}`
      const head = document.createElement('div')
      head.className = 'result-head'
      const strong = document.createElement('strong')
      strong.textContent = result.name
      head.appendChild(strong)
      const protocol = document.createElement('span')
      protocol.className = 'badge'
      protocol.textContent = result.protocol
      head.appendChild(protocol)
      const time = document.createElement('span')
      time.className = 'time'
      time.textContent = `${result.latency} ms`
      head.appendChild(time)
      item.appendChild(head)
      if (result.text) {
        const pre = document.createElement('pre')
        pre.textContent = result.text
        item.appendChild(pre)
      }
      if (result.error) {
        const error = document.createElement('div')
        error.className = 'result-error'
        error.textContent = result.error
        item.appendChild(error)
      }
      elements.results.appendChild(item)
    }
  }

  function setNotice(text, error) {
    if (!elements) return
    elements.notice.textContent = text || ''
    elements.notice.classList.toggle('error', Boolean(error))
  }

  function updateControls() {
    if (!elements) return
    const visible = visibleAccounts()
    const selectedVisible = visible.filter((account) => state.selected.has(String(account.id)))
    elements.group.disabled = state.loading || state.running
    elements.schedule.disabled = state.loading || state.running
    elements.reload.disabled = state.loading || state.running
    elements.refresh.disabled = state.loading || state.running
    elements.selectAll.disabled = state.loading || state.running || !visible.length
    elements.clearSelection.disabled = state.loading || state.running || !state.selected.size
    elements.model.disabled = state.running
    elements.test.disabled = state.loading || state.running || !selectedVisible.length || !elements.model.value.trim()
    elements.test.textContent = state.running ? '测试中…' : '测试'
  }

  async function runTests() {
    const model = elements.model.value.trim()
    const selected = state.accounts.filter((account) => state.selected.has(String(account.id)))
    if (!model) return setNotice('请输入模型名称', true)
    if (!selected.length) return setNotice('请先勾选账号', true)
    state.running = true
    state.results = []
    setNotice(`开始测试 ${selected.length} 个账号，最多 ${BATCH_SIZE} 路并行…`)
    renderResults()
    updateControls()
    for (let index = 0; index < selected.length; index += BATCH_SIZE) {
      const batch = selected.slice(index, index + BATCH_SIZE)
      const results = await Promise.all(batch.map((account) => testOne(account, model)))
      state.results.push(...results)
      renderResults()
    }
    state.running = false
    const failed = state.results.filter((result) => !result.ok).length
    setNotice(failed ? `测试完成：成功 ${state.results.length - failed} 个，失败 ${failed} 个` : `测试完成：${state.results.length} 个账号均返回结果` , failed > 0)
    updateControls()
    renderAccounts()
  }

  function bindUI() {
    elements = {
      edge: shadow.getElementById('edge'),
      panel: shadow.getElementById('panel'),
      collapse: shadow.getElementById('collapse'),
      menu: shadow.getElementById('menu'),
      modelTool: shadow.getElementById('model-tool'),
      quickTool: shadow.getElementById('quick-tool'),
      testView: shadow.getElementById('test-view'),
      quickView: shadow.getElementById('quick-view'),
      back: shadow.getElementById('back'),
      quickBack: shadow.getElementById('quick-back'),
      refresh: shadow.getElementById('refresh'),
      quickRefresh: shadow.getElementById('quick-refresh'),
      reload: shadow.getElementById('reload'),
      group: shadow.getElementById('group'),
      schedule: shadow.getElementById('schedule'),
      count: shadow.getElementById('count'),
      selectAll: shadow.getElementById('select-all'),
      clearSelection: shadow.getElementById('clear-selection'),
      accounts: shadow.getElementById('accounts'),
      quickAccounts: shadow.getElementById('quick-accounts'),
      model: shadow.getElementById('model'),
      test: shadow.getElementById('test'),
      notice: shadow.getElementById('notice'),
      results: shadow.getElementById('results')
    }
    elements.edge.addEventListener('click', () => setOpen(true))
    elements.collapse.addEventListener('click', () => setOpen(false))
    elements.modelTool.addEventListener('click', () => {
      elements.menu.hidden = true
      elements.testView.hidden = false
      elements.quickView.hidden = true
      if (!state.initialized) loadData(false)
    })
    elements.quickTool.addEventListener('click', () => {
      elements.menu.hidden = true
      elements.testView.hidden = true
      elements.quickView.hidden = false
      loadQuickAccounts()
    })
    elements.back.addEventListener('click', () => {
      if (state.running) return
      elements.testView.hidden = true
      elements.menu.hidden = false
    })
    elements.quickBack.addEventListener('click', () => {
      elements.quickView.hidden = true
      elements.menu.hidden = false
    })
    elements.refresh.addEventListener('click', () => loadData(true))
    elements.quickRefresh.addEventListener('click', loadQuickAccounts)
    elements.reload.addEventListener('click', () => loadData(true))
    elements.group.addEventListener('change', () => {
      state.groupId = elements.group.value
      reloadAccounts()
    })
    elements.schedule.addEventListener('change', () => {
      state.schedule = elements.schedule.value
      state.selected.clear()
      renderAccounts()
    })
    elements.selectAll.addEventListener('click', () => {
      const visible = visibleAccounts()
      const eligible = visible.filter((account) => asString(asRecord(account.credentials).api_key) && (asString(asRecord(account.credentials).base_url) || asString(account.platform).toLowerCase() !== 'antigravity'))
      const allSelected = eligible.length > 0 && eligible.every((account) => state.selected.has(String(account.id)))
      for (const account of eligible) {
        if (allSelected) state.selected.delete(String(account.id))
        else state.selected.add(String(account.id))
      }
      renderAccounts()
    })
    elements.clearSelection.addEventListener('click', () => {
      state.selected.clear()
      renderAccounts()
    })
    elements.model.addEventListener('input', updateControls)
    elements.model.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !elements.test.disabled) runTests()
    })
    elements.test.addEventListener('click', runTests)
    updateControls()
  }

  function setOpen(open) {
    state.open = open
    if (!elements) return
    elements.panel.hidden = !open
    elements.edge.hidden = open
  }

  function ensureHost() {
    if (host || !document.body) return
    host = document.createElement('div')
    host.id = HOST_ID
    shadow = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = CSS
    shadow.appendChild(style)
    const wrapper = document.createElement('div')
    wrapper.innerHTML = TEMPLATE
    shadow.appendChild(wrapper.firstElementChild)
    document.body.appendChild(host)
    bindUI()
    setOpen(false)
  }

  function removeHost() {
    if (host) host.remove()
    host = null
    shadow = null
    elements = null
    state.open = false
    state.initialized = false
    state.groups = []
    state.accounts = []
    state.selected.clear()
    state.results = []
  }

  function syncRoute() {
    if (isAdminRoute() && looksLikeSub2API()) ensureHost()
    else removeHost()
  }

  let syncFrame = 0
  function scheduleSync() {
    if (syncFrame) return
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0
      syncRoute()
    })
  }

  const observer = new MutationObserver(() => {
    if ((isAdminRoute() && !host) || (!isAdminRoute() && host)) scheduleSync()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const result = original.apply(this, args)
      scheduleSync()
      return result
    }
  }
  window.addEventListener('popstate', scheduleSync)
  window.addEventListener('hashchange', scheduleSync)
  window.addEventListener('DOMContentLoaded', scheduleSync, { once: true })
  scheduleSync()
})()
