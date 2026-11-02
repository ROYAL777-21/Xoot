// Real isolated browser regression: public email images may embed cross-origin,
// while every other resource retains the site's same-origin default. No provider calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const config=JSON.parse(await readFile('vercel.json','utf8'));
const flowers=await readFile('public/images/xoot-mail-flowers.png');
const wordmark=await readFile('public/images/xoot-wordmark.png');
const paths=['/images/xoot-wordmark.png','/images/xoot-mail-flowers.png'];
const overrides=config.headers.filter(r=>r.source!=='/(.*)'&&r.headers.some(h=>h.key.toLowerCase()==='cross-origin-resource-policy'&&h.value==='cross-origin'));
const headersFor=path=>Object.fromEntries(config.headers.filter(r=>r.source==='/(.*)'||r.source===path).flatMap(r=>r.headers.map(h=>[h.key.toLowerCase(),h.value])));
for(const path of ['/app/profile','/xooter/jobs','/assets/private.js','/images/unlisted.png'])assert.equal(headersFor(path)['cross-origin-resource-policy'],'same-origin',`${path} keeps its default isolation`);
const listen=server=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`));});
const close=server=>new Promise(resolve=>server.close(resolve));
const imageServer=createServer((request,response)=>{const path=new URL(request.url,'http://127.0.0.1').pathname;response.writeHead(200,{...headersFor(path),'content-type':'image/png'});response.end(path===paths[0]?wordmark:flowers);});
const documentServer=createServer((_request,response)=>{response.writeHead(200,{'content-type':'text/html'});response.end('<!doctype html><title>Isolated email artwork fixture</title>');});
let browser;
try{
 const [imageOrigin,documentOrigin]=await Promise.all([listen(imageServer),listen(documentServer)]);
 browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto(documentOrigin);
 const results=await page.evaluate(async({origin,paths})=>Promise.all([...paths,'/images/unlisted.png'].map(path=>new Promise(resolve=>{const image=new Image();const timer=setTimeout(()=>resolve({path,loaded:false,width:0}),4000);const done=loaded=>{clearTimeout(timer);resolve({path,loaded,width:image.naturalWidth});};image.onload=()=>done(true);image.onerror=()=>done(false);image.src=origin+path;}))),{origin:imageOrigin,paths});
 for(const result of results){assert.equal(result.loaded,paths.includes(result.path),`${result.path} external image policy`);if(result.loaded)assert.ok(result.width>0);}
 assert.deepEqual(overrides.map(r=>r.source).sort(),[...paths].sort(),'only the two public PNGs permit external embedding');
 console.log(JSON.stringify({check:'cross-origin-public-email-artwork',allowedImages:2,isolatedDefaultControls:4,unlistedImageBlocked:true,browser:'Chromium',providerCalls:0,passed:true}));
}finally{if(browser)await browser.close();await Promise.all([close(imageServer),close(documentServer)]);}
