// Real components in an isolated synthetic provider. No real identity/JWT/backend/provider.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
const root = process.cwd(), fixtureRoot = join(root, '.render-check');
await mkdir(fixtureRoot, { recursive: true });
const fixture = await mkdtemp(join(fixtureRoot, 'xoot-customer-updates-'));
const evidence = process.env.XOOT_CUSTOMER_UPDATES_EVIDENCE_DIR ? resolve(process.env.XOOT_CUSTOMER_UPDATES_EVIDENCE_DIR) : null;
const portable = value => value.replaceAll('\\', '/');
const auth = join(fixture, 'auth.tsx'), api = join(fixture, 'api.tsx'), entry = join(fixture, 'entry.tsx');
await writeFile(auth, `const session={user:{id:'synthetic-customer-only'},access_token:'synthetic-no-provider-access'};export const useAuth=()=>({user:session.user,session,loading:false});`);
await writeFile(api, `let state={eligible:true,account_emails:true,setup_reminders:false,first_booking_reminders:false,revision:0,setup_started:false,setup_complete:false,optional_email_available:false,scheduling_enabled:false};
window.__customerFixtureCalls=[];export const supabase={functions:{invoke:async(name,options)=>{if(name!=='customer-communications')throw Error('Unexpected synthetic target');window.__customerFixtureCalls.push(options.body.action);if(options.body.action==='save')state={...state,...options.body.preferences,revision:state.revision+1};return{data:{success:true,data:{...state}},error:null};}}};`);
await writeFile(entry, `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{AppShell}from'${portable(join(root, 'src/components/xoot/AppShell.tsx'))}';import CustomerUpdates from'${portable(join(root, 'src/pages/app/CustomerUpdates.tsx'))}';import'${portable(join(root, 'src/index.css'))}';
const dark=new URLSearchParams(location.search).get('theme')==='dark';document.documentElement.className=dark?'dark':'light';document.documentElement.dataset.xootThemeScope='app';
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/app/profile/updates']}><div className={dark?'dark xoot-private-theme':'xoot-private-theme'}><AppShell><p style={{fontSize:11,textAlign:'center',padding:12}}>Isolated synthetic customer. No real account or provider.</p><CustomerUpdates/></AppShell></div></MemoryRouter>);`);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Customer updates — isolated layout check</title></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`;
let server, browser;
const results = [], errors = [], externalRequests = [];
try {
  await writeFile(join(fixture, 'index.html'), html);
  const outputDir = join(fixture, 'dist');
  await build({ configFile: false, root: fixture, publicDir: false, cacheDir: join(fixture, 'vite-cache'), logLevel: 'error', plugins: [react()],
    resolve: { alias: [{ find: '@/contexts/AuthContext', replacement: auth }, { find: '@/integrations/supabase/client', replacement: api }, { find: '@', replacement: join(root, 'src') }], dedupe: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    build: { outDir: outputDir, emptyOutDir: true } });
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  server = createHttpServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const file = pathname === '/__customer-updates-fixture' ? join(outputDir, 'index.html') : resolve(outputDir, '.' + pathname);
      if (!file.startsWith(outputDir + sep)) { res.writeHead(403); res.end(); return; }
      let data;
      try { data = await readFile(file); }
      catch {
        const publicRoot = join(root, 'public'), publicFile = resolve(publicRoot, '.' + pathname);
        if (!publicFile.startsWith(publicRoot + sep)) throw Error('Refused public path');
        data = await readFile(publicFile);
      }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true }); if (evidence) await mkdir(evidence, { recursive: true });
  for (const value of [{ width: 320, height: 740, theme: 'light' }, { width: 390, height: 844, theme: 'light' }, { width: 1024, height: 900, theme: 'light' }, { width: 390, height: 844, theme: 'dark' }, { width: 1024, height: 900, theme: 'dark' }]) {
    const context = await browser.newContext({ viewport: { width: value.width, height: value.height }, reducedMotion: 'reduce' });
    await context.route('**/*', route => { if (new URL(route.request().url()).origin === origin) return route.continue(); externalRequests.push(new URL(route.request().url()).origin); return route.abort(); });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${origin}/__customer-updates-fixture?theme=${value.theme}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Your updates', exact: true }).waitFor(); await page.getByRole('switch', { name: 'Account welcome email', exact: true }).waitFor(); await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
      background: getComputedStyle(document.querySelector('.xoot-app-shell')).backgroundColor,
      font: getComputedStyle(document.querySelector('#customer-update-heading')).fontFamily,
      labels: [...document.querySelectorAll('label[for^="customer-updates-"]')].map(e => ({ width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })) }));
    assert.equal(metrics.overflow, false, `${value.width}/${value.theme} has no horizontal overflow`);
    assert.ok(metrics.labels.every(label => label.width >= 44 && label.height >= 44), `${value.width}/${value.theme} switch labels are full tap targets: ${JSON.stringify(metrics.labels)}`);
    assert.equal(await page.getByRole('link', { name: 'Back to You' }).getAttribute('href'), '/app/profile');
    assert.equal(await page.getByRole('link', { name: /Your notifications/ }).getAttribute('href'), '/app/notifications');
    const reminder = page.getByRole('switch', { name: /A little help with your place/ }); assert.equal(await reminder.getAttribute('aria-checked'), 'false');
    await reminder.focus(); await page.keyboard.press('Space'); assert.equal(await reminder.getAttribute('aria-checked'), 'true');
    const save = page.getByRole('button', { name: 'Save choices', exact: true }); await save.click(); await page.getByText('Your choices are saved.', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__customerFixtureCalls.filter(action => action === 'enter')), ['enter'], 'shell entry is not repeated by state saves');
    assert.deepEqual(await page.evaluate(() => window.__customerFixtureCalls.filter(action => action === 'save')), ['save'], 'one deliberate save');
    if (evidence) await page.screenshot({ path: join(evidence, `customer-updates-${value.width}-${value.theme}.png`), fullPage: true });
    results.push({ ...value, ...metrics, keyboardSave: true, providerCalls: 0, passed: true }); await context.close();
  }
  assert.deepEqual(externalRequests, [], 'no real backend/provider calls'); assert.deepEqual(errors, [], 'no runtime or console errors');
  assert.notEqual(results.find(value => value.width === 390 && value.theme === 'light').background, results.find(value => value.width === 390 && value.theme === 'dark').background, 'private theme changes');
  const output = { kind: 'isolated-customer-updates', syntheticIdentity: true, genuineSession: false, errors, externalRequests, results, passed: true };
  if (evidence) await writeFile(join(evidence, 'results.json'), JSON.stringify(output, null, 2) + '\n'); console.log(JSON.stringify(output));
} finally {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  if (dirname(await realpath(fixture)) !== await realpath(fixtureRoot) || !basename(fixture).startsWith('xoot-customer-updates-')) throw Error('Unexpected temporary fixture path');
  await rm(fixture, { recursive: true, force: true });
}
