const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')

function setup() {
  const source = readFileSync(`${__dirname}/../sub2api-model-toolbox.user.js`, 'utf8')
  const tables = []
  const context = vm.createContext({
    console,
    document: {
      querySelectorAll: () => tables,
      createElement: () => ({ dataset: {}, style: {}, textContent: '' })
    }
  })
  vm.runInContext(source.slice(0, source.indexOf('  const observer = new MutationObserver')) +
    '\n globalThis.api = { configuredModels, ensureAccountModels, listAccounts, setLoader: (fn) => { listAccounts = fn }, setAdminGet: (fn) => { adminGet = fn }, reset: () => { accountModelSession = null } }; })()', context)
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
  assert.equal(api.configuredModels({ credentials: { model_mapping: {
    'gpt-5': 'gpt-5', alias: 'upstream', 'claude-*': 'claude-*'
  } } }), 'gpt-5、alias、claude-*')
  for (const account of [{}, { credentials: null }, { credentials: { model_mapping: {} } }]) {
    assert.equal(api.configuredModels(account), '')
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
    ? [cell('ID'), cell('名称')] : [row] })
  await api.ensureAccountModels()
  const label = row.cells[1].label
  assert.equal(label.textContent, 'b')
  await api.ensureAccountModels()
  assert.equal(row.cells[1].label, label)
  assert.equal(calls, 1)
  delete row.dataset.rowId
  row.cells[0].textContent = '#1'
  await api.ensureAccountModels()
  assert.equal(label.textContent, 'a')
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
