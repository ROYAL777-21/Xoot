import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(resolve('package.json'));
const { chromium } = require('playwright');
const out = resolve('../../outputs/xoot-live-status-20261015');
await mkdir(out,{recursive:true});
const evidence = {checkedAt:new Date().toISOString(),scope:'Read-only actual public production home/sign-in. No request interception, credentials, accounts, messages or hosted writes. Browser plugin/skill unavailable; installed Playwright used.',checks:[]};
const browser = await chromium.launch({headless:true});
const safeUrl = value => { try { const u=new URL(value);return u.origin+u.pathname; } catch { return '[invalid URL]'; } };
try {
  for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'Africa/Johannesburg'});
    const page=await context.newPage();
    let errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text().replace(/https?:\/\/[^\s'"]+/g,safeUrl));});
    for(const [screen,path] of [['home','/'],['signin','/auth']]) {
      errors=[];
      const response=await page.goto('https://xoot.co.za'+path,{waitUntil:'domcontentloaded',timeout:45000});
      await page.locator('h1,h2,input[type=email]').first().waitFor({state:'visible',timeout:30000});
      await page.evaluate(()=>document.fonts.ready);
      const metrics=await page.evaluate(()=>{
        const root=document.getElementById('root');
        const head=document.querySelector('h1,h2');
        return {title:document.title,heading:head?.textContent,configurationError:document.body.innerText.includes('Configuration Error'),overlay:!!document.querySelector('vite-error-overlay'),documentOverflow:document.documentElement.scrollWidth>innerWidth,rootOverflow:!!root&&root.scrollWidth>root.clientWidth,emailInput:!!document.querySelector('input[type=email]'),headerBookLabels:[...document.querySelectorAll('header a,header button')].filter(e=>e.getBoundingClientRect().width&&/book/i.test(e.textContent)).map(e=>e.textContent.trim()),headingFont:head?getComputedStyle(head).fontFamily:null};
      });
      const filename='production-'+screen+'-'+viewport.width+'.png';
      await page.screenshot({path:resolve(out,filename)});
      evidence.checks.push({screen,viewport,url:safeUrl(page.url()),status:response?.status(),filename,errors:[...errors],...metrics});
      if(screen==='home'&&!metrics.configurationError) {
        const signIn=page.getByRole('link',{name:/^Sign in$/i}).first();
        if(await signIn.isVisible()) {
          await signIn.click();
          await page.locator('input[type=email]').waitFor({state:'visible',timeout:20000});
          evidence.checks.push({screen:'home-to-signin',viewport,url:safeUrl(page.url()),emailVisible:true});
        }
      }
    }
    const stampResponse=await context.request.get('https://xoot.co.za/build-info.json',{headers:{'Cache-Control':'no-cache'}});
    const contentType=stampResponse.headers()['content-type']??'';
    if(contentType.includes('json')) { const stamp=await stampResponse.json();evidence.buildInfo={commit:stamp.commit,builtAt:stamp.builtAt,pricingRule:stamp.pricingRule}; }
    else evidence.buildInfo={status:stampResponse.status(),contentType,url:safeUrl(stampResponse.url()),json:false};
    await context.close();
    await writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log('Observed production home/sign-in at '+viewport.width+'px');
  }
} catch (error) { evidence.failure=String(error);process.exitCode=1; }
finally { await browser.close();await writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({checks:evidence.checks.length,buildInfo:evidence.buildInfo,failure:evidence.failure??null})); }
