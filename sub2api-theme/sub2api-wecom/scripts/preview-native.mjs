// Optional integration preview: real sibling Sub2API Vue source + local synthetic API.
// No backend proxy. All writes are rejected. Original repository is read-only.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const frontend = process.env.SUB2API_FRONTEND || fileURLToPath(new URL('../../../../sub2api/frontend/', import.meta.url));
const require = createRequire(path.join(frontend, 'package.json'));
process.chdir(frontend); // Tailwind's existing relative content/config paths belong to the source app.
const { createServer } = await import(pathToFileURL(path.join(path.dirname(require.resolve('vite/package.json')), 'dist/node/index.js')).href);
const { default: vue } = await import(pathToFileURL(require.resolve('@vitejs/plugin-vue')).href);
const user = { id: 1, email: 'preview@example.test', username: '预览管理员', role: 'admin', status: 'active', balance: 100, concurrency: 5, created_at: '2026-09-28T00:00:00Z' };
const settings = { site_name: 'Sub2API', site_subtitle: '企业微信皮肤联调 · 模拟数据', registration_enabled: false, subscription_enabled: true, ops_monitoring_enabled: true, custom_menu_items: [], payment_enabled: false, backend_mode_enabled: false };
const records = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: ['Claude 服务账号', 'OpenAI 服务账号', 'Gemini 服务账号'][i % 3] + ` ${i + 1}`, platform: ['anthropic', 'openai', 'gemini'][i % 3], type: 'apikey', status: 'active', priority: 10, concurrency: 5, rate_multiplier: 1, schedulable: true, credentials: {}, extra: {}, groups: [], group_ids: [], created_at: '2026-09-28T00:00:00Z', updated_at: '2026-09-28T00:00:00Z' }));
const usageRecords=Array.from({length:43},(_,i)=>({id:i+1,user_id:i%2+1,api_key_id:1,account_id:i%8+1,request_id:`preview-request-${i+1}`,model:i%2?'claude-sonnet':'gpt-4o',input_tokens:1200+i,output_tokens:300,cache_creation_tokens:0,cache_read_tokens:200,cache_creation_5m_tokens:0,cache_creation_1h_tokens:0,input_cost:.01,output_cost:.02,cache_creation_cost:0,cache_read_cost:0,total_cost:.03,actual_cost:.03,account_stats_cost:.03,rate_multiplier:1,account_rate_multiplier:1,billing_type:0,billing_mode:'tokens',request_type:'stream',stream:true,native_compaction_v2:false,duration_ms:850,first_token_ms:120,image_count:0,image_input_tokens:0,image_input_cost:0,image_output_tokens:0,image_output_cost:0,created_at:new Date(Date.now()-i*60000).toISOString(),user:{...user,id:i%2+1,email:i%2?'team@example.test':'preview@example.test'},api_key:{id:1,name:'演示 API Key'},account:{id:i%8+1,name:records[i%8].name},group_id:1,group:{id:1,name:'演示分组'},user_agent:'preview',ip_address:'127.0.0.1'}));
const models=['gpt-4o','claude-sonnet'].map(model=>({model,requests:20,total_tokens:30000,input_tokens:24000,output_tokens:6000,total_cost:.6,actual_cost:.6}));
const server = await createServer({
  configFile: false, root: frontend,
  cacheDir: fileURLToPath(new URL('../.native-cache', import.meta.url)),
  resolve: { alias: { '@': path.join(frontend, 'src'), 'vue-i18n': require.resolve('vue-i18n/dist/vue-i18n.runtime.esm-bundler.js') } },
  define: { __INTLIFY_JIT_COMPILATION__: true },
  plugins: [vue(), {
    name: 'wecom-local-fixture',
    transformIndexHtml(html) {
      const bootstrap = `window.__APP_CONFIG__=${JSON.stringify(settings)};localStorage.setItem('auth_token','local-preview-only');localStorage.setItem('auth_user',${JSON.stringify(JSON.stringify(user))});localStorage.setItem('theme','light');localStorage.setItem('admin_guide_1_admin_v4_interactive','true');`;
      return html.replace('</head>', `<script>${bootstrap}</script></head>`).replace('</body>', '<script src="/wecom-theme.js"></script></body>');
    },
    configureServer(vite) {
      vite.middlewares.use(async (req,res,next) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/wecom-theme.js') { res.setHeader('Content-Type','application/javascript'); res.end(await readFile(new URL('../sub2api-wecom.user.js',import.meta.url))); return; }
        if (!url.pathname.startsWith('/api/')) return next();
        res.setHeader('Content-Type','application/json');
        const p = url.pathname.replace(/^\/api\/v1/,'');
        const readOnlyPosts = ['/admin/accounts/usage/batch', '/admin/accounts/today-stats/batch'];
        if (req.method !== 'GET' && !(req.method === 'POST' && readOnlyPosts.includes(p))) { res.statusCode=403; res.end(JSON.stringify({code:403,message:'只读皮肤预览：业务写入已禁用'})); return; }
        let data = {};
        if (p === '/admin/compliance') data={required:false,version:'local-preview'};
        else if (p === '/admin/accounts/usage/batch') data={usage:{},errors:{}};
        else if (p === '/admin/accounts/today-stats/batch') data={stats:{}};
        else if (p === '/announcements') data=[];
        else if (/\/me$|\/profile$/.test(p)) data=user;
        else if (p.includes('/settings')) data=settings;
        else if (p === '/admin/usage') {
          const filtered=usageRecords.filter(r=>(!url.searchParams.get('user_id')||String(r.user_id)===url.searchParams.get('user_id'))&&(!url.searchParams.get('model')||r.model===url.searchParams.get('model'))&&(!url.searchParams.get('account_id')||String(r.account_id)===url.searchParams.get('account_id')));
          const page=Number(url.searchParams.get('page')||1),size=Number(url.searchParams.get('page_size')||20);data={items:filtered.slice((page-1)*size,page*size),total:filtered.length,page,page_size:size,pages:Math.ceil(filtered.length/size)};
        }
        else if (p === '/admin/usage/stats') data={total_requests:43,total_tokens:64500,total_input_tokens:51600,total_output_tokens:12900,total_cache_tokens:8600,total_cache_creation_tokens:0,total_cache_read_tokens:8600,total_cost:1.29,total_actual_cost:1.29,total_account_cost:1.29,average_duration_ms:850,endpoints:[],upstream_endpoints:[],endpoint_paths:[]};
        else if (p === '/admin/usage/search-users') data=[{id:1,email:'preview@example.test'},{id:2,email:'team@example.test'}].filter(u=>u.email.includes(url.searchParams.get('q')||''));
        else if (p === '/admin/usage/search-api-keys') data=[{id:1,name:'演示 API Key',user_id:1}];
        else if (p === '/admin/dashboard/models') data={models};
        else if (p === '/admin/dashboard/snapshot-v2') data={trend:[{date:'2026-09-28',requests:43,input_tokens:51600,output_tokens:12900,tokens:64500,total_cost:1.29}],groups:[],models};
        else if (/\/admin\/ops\/(request-errors|errors|upstream-errors)$/.test(p)) data={items:[],total:0,page:1,page_size:20};
        else if (p === '/admin/accounts') data={items:records,total:records.length,page:1,page_size:20,pages:1};
        else if (/^\/admin\/accounts\/\d+\/models$/.test(p)) data=[{id:'preview-model',display_name:'本地模拟模型',type:'model'}];
        else if (/^\/admin\/accounts\/\d+$/.test(p)) data=records.find(r=>r.id===Number(p.split('/').pop())) || {};
        else if (p.includes('upstream-billing-rates')) data={items:[],rates:{}};
        else if (p.includes('/groups') || p.includes('/proxies') || p.includes('/subscriptions') || p.includes('/announcements')) data=p.endsWith('/all')||p.includes('subscriptions')?[]:{items:[],total:0,pages:0};
        else if (p.includes('/dashboard')) data={};
        else if (p.includes('/users')) data={items:[user],total:1,page:1,page_size:20,pages:1};
        else if (p.includes('/version')) data={version:'preview',latest_version:'preview'};
        else if (p.includes('/setup')) data={needs_setup:false};
        res.end(JSON.stringify({code:0,data}));
      });
    },
  }],
  server: {host:'127.0.0.1',port:4179,strictPort:true},
});
await server.listen();
console.log('Native Vue preview (synthetic data, no real backend): http://127.0.0.1:4179/admin/accounts');
