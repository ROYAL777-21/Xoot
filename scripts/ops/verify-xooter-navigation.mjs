// Actual shell in an isolated synthetic provider. No real user/session/backend is used.
// Browser plugin is not available in this execution context; use headless test Chromium.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from 'playwright';
const root=process.cwd();
const fixture=await mkdtemp(join(tmpdir(),'xoot-worker-nav-'));
const evidence=process.env.XOOT_NAV_EVIDENCE_DIR?resolve(process.env.XOOT_NAV_EVIDENCE_DIR):null;
const portable=p=>p.replaceAll('\\','/');
const auth=join(fixture,'auth.tsx'),entry=join(fixture,'entry.tsx');
await writeFile(auth,`export const useAuth=()=>({user:{id:'synthetic-nav-owner',email:'xooter@example.test'},signOut:async()=>{}});`);
await writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';import{XooterShell}from'${portable(join(root,'src/components/xooter/XooterShell.tsx'))}';import'${portable(join(root,'src/index.css'))}';
const dark=new URLSearchParams(location.search).get('theme')==='dark';
document.documentElement.className=dark?'dark':'light';document.documentElement.dataset.xootThemeScope='app';
function Page(){const path=useLocation().pathname;return <article style={{maxWidth:760,margin:'0 auto',padding:24}}><h1 style={{fontFamily:'var(--xoot-font-display)',fontSize:36,fontWeight:400}}>Your workspace</h1><p data-fixture-route>{path}</p><p style={{color:'var(--xoot-text-secondary)',fontSize:14,lineHeight:1.6}}>Isolated navigation preview. This synthetic account has no real jobs, balance or verification.</p><div style={{height:600}}/><footer data-fixture-end>End of navigation preview</footer></article>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/xooter/jobs']}><div className={dark?'dark xoot-private-theme':'xoot-private-theme'}><XooterShell updatesAvailable><Page/></XooterShell></div></MemoryRouter>);`);
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xooter navigation — isolated layout check</title></head><body><div id="root"></div><script type="module" src="/@fs/${portable(entry)}"></script></body></html>`;
let server,browser;
const results=[],errors=[],externalRequests=[];
try{
 server=await createServer({configFile:false,root,cacheDir:join(fixture,'vite-cache'),plugins:[react(),{name:'isolated-xooter-navigation',configureServer(s){s.middlewares.use(async(req,res,next)=>{if(!req.url?.startsWith('/__xooter-nav-fixture'))return next();res.setHeader('content-type','text/html');res.end(await s.transformIndexHtml(req.url,html));});}}],resolve:{alias:[{find:'@/contexts/AuthContext',replacement:auth},{find:'@',replacement:join(root,'src')}],dedupe:['react','react-dom','react/jsx-runtime','react/jsx-dev-runtime']},server:{host:'127.0.0.1',port:0,fs:{allow:[root,fixture,resolve(root,'../xoot/node_modules')]}}});
 await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});if(evidence)await mkdir(evidence,{recursive:true});
 const cases=[{width:320,height:740,theme:'light'},{width:390,height:844,theme:'light'},{width:768,height:1024,theme:'light'},{width:1024,height:900,theme:'light'},{width:1440,height:1000,theme:'light'},{width:390,height:844,theme:'dark'},{width:1440,height:1000,theme:'dark'}];
 for(const value of cases){
  const context=await browser.newContext({viewport:{width:value.width,height:value.height},reducedMotion:'reduce'});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();externalRequests.push(new URL(route.request().url()).origin);return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${origin}/__xooter-nav-fixture?theme=${value.theme}`);await page.getByRole('heading',{name:'Your workspace',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.title(),'Xooter navigation — isolated layout check');assert.equal(await page.locator('vite-error-overlay').count(),0);
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,shellBackground:getComputedStyle(document.querySelector('.xoot-worker-shell')).backgroundColor,font:getComputedStyle(document.querySelector('.xoot-worker-shell')).fontFamily}));
  assert.equal(metrics.overflow,false,`${value.width}/${value.theme} has no horizontal overflow`);assert.ok(metrics.font.includes('Plus Jakarta Sans'));
  const mobile=value.width<1024;
  const nav=page.getByRole('navigation',{name:mobile?'Xooter tabs':'Xooter workspace',exact:true});
  await nav.waitFor({state:'visible'});assert.equal(await page.getByRole('navigation',{name:mobile?'Xooter workspace':'Xooter tabs',exact:true}).isVisible(),false);
  assert.equal(await nav.getByRole('link',{name:'Jobs',exact:true}).getAttribute('aria-current'),'page');
  const dimensions=await nav.locator(mobile?':scope > a,:scope > details > summary':':scope > a').evaluateAll(elements=>elements.map(e=>({label:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  assert.ok(dimensions.every(x=>x.width>=44&&x.height>=44),`${value.width} navigation targets reach44px: ${JSON.stringify(dimensions)}`);
  await nav.getByRole('link',{name:'Training',exact:true}).click();await page.locator('[data-fixture-route]').filter({hasText:'/xooter/training'}).waitFor();assert.equal(await nav.getByRole('link',{name:'Training',exact:true}).getAttribute('aria-current'),'page');
  let accountMenu=false,escapeFocus=false,outsideTapCloses=false;
  if(mobile){
   const summary=page.locator('.xoot-worker-account-disclosure>summary');await summary.focus();await page.keyboard.press('Enter');
   const accountNav=page.getByRole('navigation',{name:'Your Xooter account',exact:true});await accountNav.waitFor({state:'visible'});
   assert.equal(await accountNav.getByRole('link',{name:'Verification',exact:true}).getAttribute('href'),'/xooter/kyc');assert.equal(await accountNav.getByRole('link',{name:'Your updates',exact:true}).getAttribute('href'),'/xooter/updates');accountMenu=true;
   if(evidence&&value.width===390)await page.screenshot({path:join(evidence,`mobile-account-${value.theme}.png`)});
   await page.keyboard.press('Escape');assert.equal(await page.locator('.xoot-worker-account-disclosure').getAttribute('open'),null);escapeFocus=await summary.evaluate(e=>e===document.activeElement);assert.equal(escapeFocus,true);
   await summary.click();await page.locator('main').getByRole('heading',{name:'Your workspace',exact:true}).click();outsideTapCloses=await page.locator('.xoot-worker-account-disclosure').getAttribute('open')===null;assert.equal(outsideTapCloses,true);
   await summary.click();await accountNav.getByRole('link',{name:'Profile',exact:true}).click();await page.locator('[data-fixture-route]').filter({hasText:'/xooter/profile'}).waitFor();assert.equal(await page.locator('.xoot-worker-account-disclosure').getAttribute('open'),null);
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
   const overlap=await page.evaluate(()=>document.querySelector('[data-fixture-end]').getBoundingClientRect().bottom>document.querySelector('.xoot-worker-tab-dock').getBoundingClientRect().top);assert.equal(overlap,false,'last content remains clear of the dock');
   await page.evaluate(()=>scrollTo(0,0));
  }
  if(evidence)await page.screenshot({path:join(evidence,`navigation-${value.width}-${value.theme}.png`)});
  results.push({...value,...metrics,navigationTargets:dimensions.length,accountMenu,escapeFocus,outsideTapCloses,passed:true});await context.close();
 }
 assert.deepEqual(externalRequests,[],'fixture never calls a live backend/provider');assert.deepEqual(errors,[],'no browser runtime/console errors');
 assert.notEqual(results.find(x=>x.width===390&&x.theme==='light').shellBackground,results.find(x=>x.width===390&&x.theme==='dark').shellBackground,'private-app theme actually changes');
 const output={kind:'isolated-xooter-navigation',browser:'Chromium',syntheticIdentity:true,realSessionUsed:false,providerCalls:0,externalRequests,errors,results,passed:true};
 if(evidence)await writeFile(join(evidence,'results.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
}finally{
 if(browser)await browser.close();if(server)await server.close();
 if(dirname(resolve(fixture))!==resolve(tmpdir())||!basename(fixture).startsWith('xoot-worker-nav-'))throw Error('Unexpected temporary fixture path');
 await rm(fixture,{recursive:true,force:true});
}
