import { build } from 'vite';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { composePublicHtml, publicHtmlPath } from './public-html.mjs';

const root=process.cwd();
const dist=resolve(root,'dist');
// Keep the temporary SSR bundle outside the deployable artifact and node_modules-resolvable.
const scratch=await mkdtemp(join(root,'.xoot-public-render-'));
try {
  const template=await readFile(join(dist,'index.html'),'utf8');
  await build({ build:{ ssr:resolve(root,'scripts/seo/public-entry.tsx'),outDir:scratch,emptyOutDir:false,copyPublicDir:false,manifest:false,ssrManifest:false,rolldownOptions:{output:{entryFileNames:'public-entry.mjs',manualChunks:undefined}} },logLevel:'warn' });
  const originalFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Public prerender must not read network or customer data');};
  try {
    const {publicRoutes,renderPublicPage}=await import(pathToFileURL(join(scratch,'public-entry.mjs')).href);
    const sitemap=await readFile(join(dist,'sitemap.xml'),'utf8');
    const sitemapPaths=[...sitemap.matchAll(/<loc>https:\/\/xoot\.co\.za([^<]*)<\/loc>/g)].map(match=>match[1]||'/').sort();
    const renderPaths=publicRoutes.map(route=>route.path).sort();
    if(JSON.stringify(sitemapPaths)!==JSON.stringify(renderPaths))throw new Error('Public render routes and sitemap disagree');
    const manifest=JSON.parse(await readFile(join(dist,'.vite/manifest.json'),'utf8'));
    const collectCss=(key,seen=new Set())=>{
      if(seen.has(key))return[];seen.add(key);
      const item=manifest[key];if(!item)return[];
      return [...(item.css??[]),...(item.imports??[]).flatMap(dep=>collectCss(dep,seen))];
    };
    // Vercel serves the filesystem index before rewrites. Render home there and
    // retain the untouched client shell separately for private/transactional routes.
    await writeFile(join(dist,'_spa.html'),template);
    let count=0;
    for(const route of publicRoutes){
      const {html,head}=renderPublicPage(route.path);
      const css=collectCss(route.module);
      for(const file of css)await readFile(join(dist,file));
      const output=composePublicHtml(template,{path:route.path,html,head,css});
      const target=join(dist,publicHtmlPath(route.path));
      if(!resolve(target).startsWith(dist+sep))throw new Error('Public render target escaped dist');
      await mkdir(resolve(target,'..'),{recursive:true});
      await writeFile(target,output);
      count++;
    }
    console.log(`Prerendered ${count} public pages with actual React content; private routes retain the client shell.`);
  } finally {globalThis.fetch=originalFetch;}
} finally {
  const expected=resolve(root)+sep+'.xoot-public-render-';
  if(!resolve(scratch).startsWith(expected))throw new Error('Refusing cleanup outside public-render scratch');
  await rm(scratch,{recursive:true,force:true});
}
