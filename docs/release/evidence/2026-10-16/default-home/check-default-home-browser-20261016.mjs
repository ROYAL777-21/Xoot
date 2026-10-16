import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Isolated component QA only. These adapters never ship or contact a hosted backend.
const repo = process.cwd(), out = resolve('../../outputs/xoot-default-home-20261016/browser');
const require = createRequire(resolve(repo, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
const { transform } = require('esbuild'), { chromium } = require('playwright');
await mkdir(out, { recursive: true });
const owner = '10000000-0000-4000-8000-000000000001';
const target = '20000000-0000-4000-8000-000000000002';
const emptyDetails = { gate_code:'', alarm_code:'', access_notes:'', access_instructions:'', parking_instructions:'', pet_notes:'', cleaning_preferences:'', fragile_areas:'', favourite_products:'' };
const records = [
  { ...emptyDetails, id:'20000000-0000-4000-8000-000000000001', user_id:owner, label:'First test home', address:'10 Test Street, Johannesburg', is_default:true, archived_at:null },
  { ...emptyDetails, id:target, user_id:owner, label:'Second test home', address:'20 Test Street, Johannesburg', is_default:false, archived_at:null },
];
const adapters = {
  'virtual:home-auth': `export const useAuth=()=>({user:{id:${JSON.stringify(owner)},email:'fixture@example.invalid'},loading:false,signOut:async()=>{}});`,
  'virtual:home-wallet': `export const useXootCred=()=>({availableBalance:0,loading:false,error:null,refresh:async()=>{}});`,
  'virtual:home-db': `
    const rows=${JSON.stringify(records)}, owner=${JSON.stringify(owner)};
    const qa=window.__homeQA={calls:[],fail:false,delay:false,release:null,rows};
    export const isSupabaseConfigured=false;
    export const supabase={
      from(table){let predicates=[],columns='*',orders=[];
        const result=()=>{let data=table==='household_profiles'?rows:table==='profiles'?[{id:owner,full_name:'Test Customer',avatar_url:null,phone:'',address:''}]:[];
          data=data.filter(row=>predicates.every(([key,value])=>row[key]===value));
          for(const [key,ascending] of [...orders].reverse())data=[...data].sort((a,b)=>(a[key]>b[key]?1:a[key]<b[key]?-1:0)*(ascending?1:-1));
          return data.map(row=>columns==='*'?{...row}:Object.fromEntries(columns.split(',').filter(key=>key in row).map(key=>[key,row[key]])));
        };
        const q={select(value){columns=value;return q},eq(key,value){predicates.push([key,value]);return q},is(key,value){predicates.push([key,value]);return q},order(key,options){orders.push([key,options?.ascending!==false]);return q},range(start,end){return Promise.resolve({data:result().slice(start,end+1),error:null})},maybeSingle(){return Promise.resolve({data:result()[0]??null,error:null})}};return q;
      },
      async rpc(name,args){qa.calls.push({name,args:structuredClone(args)});if(qa.delay)await new Promise(done=>qa.release=done);
        if(qa.fail)return {data:null,error:{message:'Isolated failed confirmation'}};
        if(name!=='save_home'||args.p_expected_owner!==owner)throw new Error('Unexpected fixture RPC');
        let home=rows.find(row=>row.id===args.p_home_id);
        if(!home){home={id:args.p_home_id,user_id:owner,is_default:false,archived_at:null};rows.push(home)}
        Object.assign(home,args.p_details);
        if(args.p_selected===true){for(const row of rows)row.is_default=false;home.is_default=true}
        else if(args.p_selected===false)home.is_default=false;
        return {data:{id:home.id,is_default:home.is_default},error:null};
      }
    };`,
};
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Route,Routes}from'react-router-dom';import{ThemeProvider}from'next-themes';import{ConciergeProvider}from'@/contexts/ConciergeContext';import{AppShell}from'@/components/xoot/AppShell';import HomeEdit from'@/pages/app/HomeEdit';import Profile from'@/pages/app/Profile';import'@/index.css';createRoot(document.getElementById('root')).render(<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}><ConciergeProvider><MemoryRouter initialEntries={['/app/profile/homes/${target}']}><AppShell><Routes><Route path="/app/profile/homes/:id" element={<HomeEdit/>}/><Route path="/app/profile" element={<Profile/>}/></Routes></AppShell></MemoryRouter></ConciergeProvider></ThemeProvider>);`;
const plugin = {
  name:'isolated-default-home-qa',
  resolveId(id){if(id in adapters||id==='virtual:home-entry')return '\0'+id},
  async load(id){if(id.startsWith('\0')&&id.slice(1)in adapters)return adapters[id.slice(1)];if(id==='\0virtual:home-entry')return(await transform(entry,{loader:'tsx',jsx:'automatic'})).code},
  configureServer(server){server.middlewares.use(async(req,res,next)=>{
    if(new URL(req.url,'http://127.0.0.1').pathname!=='/__checks/home')return next();
    const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actual HomeEdit — isolated fixture QA</title></head><body><div id="root"></div><script type="module" src="/@id/__x00__virtual:home-entry"></script></body></html>';
    res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/__checks/home',html));
  })},
};
const server=await createServer({configFile:false,root:repo,publicDir:resolve(repo,'public'),plugins:[plugin,react()],server:{host:'127.0.0.1',port:5193,strictPort:true},resolve:{alias:[{find:'@/contexts/AuthContext',replacement:'virtual:home-auth'},{find:'@/integrations/supabase/client',replacement:'virtual:home-db'},{find:'@/hooks/useXootCred',replacement:'virtual:home-wallet'},{find:'@',replacement:resolve(repo,'src')}]}});
const evidence={checkedAt:new Date().toISOString(),scope:'Actual web HomeEdit/Profile/AppShell, isolated synthetic auth/database/wallet adapters. Real browser keyboard/layout only. No hosted requests/writes, auth success, SQL or native-device claim.',checks:[]};
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
let browser;
try {
  await server.listen();browser=await chromium.launch({headless:true});
  for(const viewport of [{width:320,height:844},{width:390,height:844},{width:768,height:844},{width:1024,height:844},{width:1440,height:1000},{width:1920,height:1080},{width:844,height:390}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'Africa/Johannesburg'});
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
    await page.goto('http://127.0.0.1:5193/__checks/home');
    await page.getByLabel('Address',{exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
    const metrics=await page.evaluate(()=>{
      const heading=document.querySelector('h1'),actions=document.querySelector('.xoot-you-form-actions'),root=document.getElementById('root');
      return {documentOverflow:document.documentElement.scrollWidth>innerWidth,rootOverflow:root.scrollWidth>root.clientWidth,headingFont:getComputedStyle(heading).fontFamily,headingTransform:getComputedStyle(heading).transform,headingFilter:getComputedStyle(heading).filter,actionsPosition:getComputedStyle(actions).position,actionsBottom:actions.getBoundingClientRect().bottom,viewportHeight:innerHeight};
    });
    assert(!metrics.documentOverflow&&!metrics.rootOverflow,'Horizontal overflow');
    assert(metrics.headingTransform==='none'&&metrics.headingFilter==='none','Persistent heading compositing');
    assert(metrics.actionsPosition==='fixed'&&Math.abs(metrics.actionsBottom-metrics.viewportHeight)<1,'Save controls not anchored');
    const screenshot=`home-edit-${viewport.width}x${viewport.height}.png`;await page.screenshot({path:resolve(out,screenshot)});
    const control=page.getByRole('switch',{name:/Default place/});
    assert(!await control.isChecked(),'Unexpected initial default');
    await page.getByLabel('Address',{exact:true}).focus();await page.keyboard.press('Tab');
    assert(await control.evaluate(node=>node===document.activeElement),'Default switch not keyboard reachable');
    await page.keyboard.press('Space');assert(await control.isChecked(),'Space did not toggle default');
    await page.getByRole('button',{name:'Save this place',exact:true}).press('Enter');
    await page.getByRole('link',{name:/Second test home.*Default/}).waitFor();
    const state=await page.evaluate(()=>({calls:window.__homeQA.calls,defaults:window.__homeQA.rows.filter(row=>row.is_default).map(row=>row.id)}));
    assert(state.calls.length===1&&state.calls[0].args.p_selected===true&&state.defaults.length===1&&state.defaults[0]===target,'UI did not submit explicit selection or reflect confirmed fixture result');
    if(viewport.width===390){
      await page.getByRole('link',{name:/First test home/}).click();await page.getByRole('switch',{name:/Default place/}).check();
      await page.evaluate(()=>{window.__homeQA.fail=true;window.__homeQA.delay=true});
      await page.getByRole('button',{name:'Save this place',exact:true}).click();
      await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
      assert(await page.getByRole('switch',{name:/Default place/}).isDisabled(),'Pending switch remains editable');
      await page.waitForFunction(()=>typeof window.__homeQA.release==='function');await page.evaluate(()=>window.__homeQA.release());
      await page.getByRole('alert').waitFor();
      assert(await page.getByLabel('Place name',{exact:true}).inputValue()==='First test home','Failure discarded draft');
      assert(await page.evaluate(()=>window.__homeQA.rows.find(row=>row.is_default)?.id)===target,'Failure changed fixture default');
      await page.screenshot({path:resolve(out,'home-edit-failed-confirmation-390.png')});
      await page.evaluate(()=>{window.__homeQA.fail=false;window.__homeQA.delay=false});
      await page.getByRole('button',{name:'Save this place',exact:true}).press('Enter');
      await page.getByRole('link',{name:/First test home.*Default/}).waitFor();
      evidence.checks.push({viewport,case:'pending/failure/draft/retry',result:'passed'});
    }
    assert(errors.length===0,'Runtime error: '+errors.join('; '));
    evidence.checks.push({viewport,screenshot,metrics,case:'actual keyboard toggle/save/confirmed default',result:'passed',errors});
    await context.close();console.log(`HomeEdit actual keyboard/layout ${viewport.width}x${viewport.height} passed`);
  }
} catch(error){evidence.failure=String(error);process.exitCode=1;console.error(evidence.failure)}
finally {if(browser)await browser.close();await server.close();await writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n')}
