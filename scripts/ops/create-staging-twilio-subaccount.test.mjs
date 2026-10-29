import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const script=pathToFileURL(resolve('scripts/ops/create-staging-twilio-subaccount.mjs')).href;
function run(args,postAllowed=true){
  // Execute the real CLI with only provider transport replaced; never create resources.
  const code=`process.argv=['node','fixture',...${JSON.stringify(args)}];
    globalThis.fetch=async (url,options={})=>{
      if(options.method==='POST' && !${postAllowed})throw Error('Unexpected mutating provider request');
      let data;
      if(String(url).includes('FriendlyName='))data={accounts:[]};
      else if(String(url).endsWith('/Accounts.json'))data={sid:'AC-fixture',auth_token:'token-fixture'};
      else if(String(url).endsWith('/Keys.json'))data={sid:'SK-fixture',secret:'key-fixture'};
      else if(String(url).includes('/Applications/'))data={voice_url:'https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-twiml'};
      else if(String(url).endsWith('/Applications.json'))data={sid:'AP-fixture'};
      else if(String(url).endsWith('/Services'))data={sid:'IS-fixture'};
      else throw Error('Unexpected fixture request');
      return new Response(JSON.stringify(data));
    };await import(${JSON.stringify(script)});`;
  return spawnSync(process.execPath,['--input-type=module','--eval',code],{
    encoding:'utf8',env:{...process.env,XOOT_TWILIO_ACCOUNT_SID:'AC-parent-fixture',XOOT_TWILIO_AUTH_TOKEN:'parent-fixture'},
  });
}
test('confirmed CLI refuses missing private output before any mutation',()=>{
  const result=run(['--confirm'],false);
  assert.equal(result.status,1);assert.match(result.stderr,/requires --emit-env/);
  assert.doesNotMatch(result.stdout+result.stderr,/key-fixture|token-fixture|parent-fixture/);
});
test('real CLI writes once-only values privately and never prints credentials',()=>{
  const dir=mkdtempSync(join(tmpdir(),'xoot-twilio-cli-'));
  try{
    const file=join(dir,'private.env');const result=run(['--confirm','--emit-env',file]);
    assert.equal(result.status,0,result.stderr);
    assert.match(readFileSync(file,'utf8'),/TWILIO_API_KEY_SECRET=key-fixture/);
    assert.equal(readFileSync(file,'utf8').trim().split('\n').length,7);
    assert.doesNotMatch(result.stdout+result.stderr,/key-fixture|token-fixture|parent-fixture/);
    if(process.platform!=='win32')assert.equal(statSync(file).mode&0o777,0o600);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('existing private output is not overwritten or followed by provider creation',()=>{
  const dir=mkdtempSync(join(tmpdir(),'xoot-twilio-cli-'));
  try{
    const file=join(dir,'private.env');writeFileSync(file,'retain-existing');
    const result=run(['--confirm','--emit-env',file],false);
    assert.equal(result.status,1);assert.match(result.stderr,/Cannot create the private output file/);
    assert.equal(readFileSync(file,'utf8'),'retain-existing');
    assert.doesNotMatch(result.stdout,/creating the subaccount/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
