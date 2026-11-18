const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')

function setup() {
  const source = readFileSync(`${__dirname}/../sub2api-model-toolbox.user.js`, 'utf8')
  const tables = []
  const context = vm.createContext({
    console,
    performance,
    URL,
    window: { location: { href: 'https://sub2api.invalid/admin/accounts' } },
    document: {
      querySelectorAll: () => tables,
      createElement: () => ({
        dataset: {}, style: {}, children: [], ownText: '', listeners: {},
        get textContent() { return this.ownText + this.children.map((child) => child.textContent).join('') },
        set textContent(value) { this.ownText = value; this.children = [] },
        setAttribute(name, value) { this[name] = value },
        appendChild(child) { this.children.push(child) },
        replaceChildren() { this.children = []; this.ownText = '' },
        addEventListener(name, listener) { this.listeners[name] = listener }
      })
    }
  })
  vm.runInContext(source.slice(0, source.indexOf('  const observer = new MutationObserver')) +
    '\n globalThis.api = { configuredModels, ensureAccountModels, listAccounts, modelTestButton, testOne, setTransport: (fn) => { gmRequest = fn }, setTester: (fn) => { testOne = fn }, setLoader: (fn) => { listAccounts = fn }, setAdminGet: (fn) => { adminGet = fn }, reset: () => { accountModelSession = null } }; })()', context)
  return { api: context.api, tables }
}

function cell(textContent = '') {
  return {
    textContent, label: null,
    querySelector() { return this.label },
    appendChild(label) {
      this.label = label
      label.remove = () => { this.label = null }
    }
  }
}

test('只展示对外模型名，保留通配符，缺省配置不显示', () => {
  const { api } = setup()
  assert.deepEqual(Array.from(api.configuredModels({ credentials: { model_mapping: {
    'gpt-5': 'gpt-5', alias: 'upstream', 'claude-*': 'claude-*'
  } } })), ['gpt-5', 'alias', 'claude-*'])
  for (const account of [{}, { credentials: null }, { credentials: { model_mapping: {} } }]) {
    assert.equal(api.configuredModels(account).length, 0)
  }
})

test('默认保留 API Key 筛选，自动展示读取所有类型和所有页', async () => {
  const { api } = setup()
  const queries = []
  api.setAdminGet(async (path, params) => {
    assert.equal(path, '/admin/accounts')
    queries.push(params)
    return { items: [{ id: params.page }], pages: 2 }
  })
  assert.equal((await api.listAccounts(false, true)).length, 2)
  assert.ok(queries.every((params) => !('type' in params)))
  queries.length = 0
  await api.listAccounts()
  assert.ok(queries.every((params) => params.type === 'apikey'))
})

test('按 ID 展示、重复渲染不重复插入、翻页更新并清除未知账号旧标签', async () => {
  const { api, tables } = setup()
  let calls = 0
  api.setLoader(async () => {
    calls++
    return [
      { id: 1, name: '同名', credentials: { model_mapping: { a: 'a' } } },
      { id: 2, name: '同名', credentials: { model_mapping: { b: 'b' } } }
    ]
  })
  const row = { dataset: { rowId: '2' }, cells: [cell('#2'), cell('同名')] }
  tables.push({ querySelectorAll: (selector) => selector === 'thead th'
    ? [cell('账号ID'), cell('名称')] : [row] })
  await api.ensureAccountModels()
  const label = row.cells[1].label
  assert.equal(label.textContent, 'b▷')
  const button = label.children[0].children[0]
  await api.ensureAccountModels()
  assert.equal(row.cells[1].label, label)
  assert.equal(label.children[0].children[0], button)
  assert.equal(calls, 1)
  delete row.dataset.rowId
  row.cells[0].textContent = '#1'
  await api.ensureAccountModels()
  assert.equal(label.textContent, 'a▷')
  row.cells[0].textContent = '#3'
  await api.ensureAccountModels()
  assert.equal(row.cells[1].label, null)
})

test('离开页面后忽略尚未返回的数据', async () => {
  const { api, tables } = setup()
  let resolve
  api.setLoader(() => new Promise((done) => { resolve = done }))
  const row = { dataset: { rowId: '1' }, cells: [cell('名称')] }
  tables.push({ querySelectorAll: (selector) => selector === 'thead th' ? [cell('名称')] : [row] })
  const pending = api.ensureAccountModels()
  api.reset()
  resolve([{ id: 1 }])
  await pending
  assert.equal(row.cells[0].label, null)
})

const clickEvent = { preventDefault() {}, stopPropagation() {} }

test('点击才测试，映射到上游模型，禁止重复请求，成功变绿，失败可重试并展示响应', async () => {
  const { api } = setup()
  const account = { id: 1, credentials: { model_mapping: { alias: 'upstream' } } }
  let calls = 0
  let finish
  api.setTester((actualAccount, model) => {
    assert.equal(actualAccount, account)
    assert.equal(model, 'upstream')
    calls++
    return new Promise((resolve) => { finish = resolve })
  })
  const button = api.modelTestButton(account, 'alias')
  assert.equal(calls, 0)
  assert.equal(button['aria-label'], '测试 alias')
  const pending = button.listeners.click(clickEvent)
  assert.equal(button.disabled, true)
  assert.equal(button.textContent, '…')
  await button.listeners.click(clickEvent)
  assert.equal(calls, 1)
  finish({ ok: true, latency: 12 })
  await pending
  assert.equal(button.style.color, '#16a34a')
  assert.equal(button.textContent, '✓')
  assert.equal(button.disabled, false)
  const retry = button.listeners.click(clickEvent)
  finish({ ok: false, error: '上游返回 429', text: '{"error":"quota exceeded","detail":"<b>raw</b>"}' })
  await retry
  assert.equal(button.style.color, '#dc2626')
  assert.equal(button.textContent, '✕')
  assert.match(button.title, /429[\s\S]*quota exceeded[\s\S]*<b>raw<\/b>/)
  assert.equal(button['aria-label'], button.title)
  assert.equal(button.disabled, false)
})

test('通配符不会发出无效请求，异常后按钮恢复可用', async () => {
  const { api } = setup()
  let calls = 0
  api.setTester(() => { calls++; throw new Error('网络异常') })
  const wildcard = api.modelTestButton({}, 'claude-*')
  await wildcard.listeners.click(clickEvent)
  assert.equal(calls, 0)
  assert.match(wildcard.title, /通配符不能直接测试/)
  const button = api.modelTestButton({}, 'claude-sonnet')
  await button.listeners.click(clickEvent)
  assert.equal(button.style.color, '#dc2626')
  assert.equal(button.disabled, false)
  assert.match(button.title, /网络异常/)
})

test('实际测试逻辑保留 HTTP 失败正文及 200 错误响应，并处理缺失 Key', async () => {
  const { api } = setup()
  const account = { id: 1, platform: 'anthropic', credentials: { api_key: 'test-only', base_url: 'https://upstream.invalid' } }
  const body = '{"error":{"message":"quota exceeded"},"request_id":"test-request"}'
  api.setTransport(async (request) => {
    assert.equal(JSON.parse(request.data).model, 'upstream')
    return { status: 429, responseText: body }
  })
  const failure = await api.testOne(account, 'upstream')
  assert.equal(failure.ok, false)
  assert.equal(failure.text, body)
  assert.match(failure.error, /429/)
  api.setTransport(async () => ({ status: 200, responseText: body }))
  const apiError = await api.testOne(account, 'upstream')
  assert.equal(apiError.ok, false)
  assert.equal(JSON.parse(apiError.text).request_id, 'test-request')
  const noKey = await api.testOne({ id: 2 }, 'upstream')
  assert.equal(noKey.ok, false)
  assert.match(noKey.error, /API Key/)
})
