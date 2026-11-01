// Reuse only the four consented normal Auth sessions; no credentials, keys or payloads logged.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createDeviceKeyPair,encryptChatMessage,decryptChatMessage} from '../../src/lib/e2ee-chat.ts';
import {verifyStagingTestIdentities} from './verify-staging-test-identities.mjs';
export async function verifyBookingCommunications({base,key,tokens,bookingA}) {
  if(String(base).replace(/\/$/,'')!=='https://fxmxyabdjqviqbcxmvlp.supabase.co' || process.env.XOOT_TEST_SYNTHETIC_CONSENT!=='YES')throw new Error('Only consented named staging fixtures are permitted');
  await verifyStagingTestIdentities({base,key,tokens});
  let phase='auth_subjects',lastStatus=null,lastCount=null,lastErrorCode=null;
  const receipt=data=>writeFile(new URL('../../.staging-communications-result.local',import.meta.url),JSON.stringify(data),{mode:0o600});
  const request=async(label,path,body,method='POST')=>{
    const r=await fetch(new URL(path,base),{method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),headers:{apikey:key,authorization:'Bearer '+tokens[label],...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    let data=null;try{data=await r.json();}catch{/* empty response */}
    lastStatus=r.status;lastCount=Array.isArray(data)?data.length:null;
    lastErrorCode=typeof data?.code==='string'&&/^[0-9A-Z]{5}$/.test(data.code)?data.code:null;
    return{status:r.status,data};
  };
  const edge=(label,name,body)=>request(label,'/functions/v1/'+name,body);
  const ids={};for(const label of Object.keys(tokens)){const r=await request(label,'/auth/v1/user',null,'GET');assert.equal(r.status,200);ids[label]=r.data.id;}
  const devices={};
  try {
    for(const label of ['customerA','workerA']){
      phase='public_key_publication';
      const deviceId=process.env[label==='customerA'?'XOOT_TEST_CHAT_CUSTOMER_A_DEVICE':'XOOT_TEST_CHAT_WORKER_A_DEVICE'];
      if(!new RegExp('^xoot-staging-chat-'+bookingA+'-[a-f0-9-]{36}$').test(deviceId??''))throw new Error('Parent-owned fresh test device ID required before publication');
      devices[label]=await createDeviceKeyPair(deviceId);
      const d=devices[label];const r=await request(label,'/rest/v1/user_encryption_keys',{user_id:ids[label],device_id:d.deviceId,public_jwk:d.publicJwk,key_version:d.keyVersion});
      assert.ok([200,201,204].includes(r.status),'Own test public-key publication must work through normal RLS');
    }
    phase='participant_key_read';const publicKeys=await edge('customerA','get-booking-public-keys',{booking_id:bookingA});assert.equal(publicKeys.status,200);
    for(const label of ['customerA','workerA'])assert.ok(publicKeys.data.data.keys.some(k=>k.user_id===ids[label]&&k.device_id===devices[label].deviceId),'Assigned participants must receive the registered test public keys');
    phase='outsider_key_denial';for(const label of ['customerB','workerB'])assert.ok([403,404].includes((await edge(label,'get-booking-public-keys',{booking_id:bookingA})).status),'Unrelated key lookup must be denied');
    const recipients=['customerA','workerA'].map(label=>({userId:ids[label],deviceId:devices[label].deviceId,publicJwk:devices[label].publicJwk,keyVersion:devices[label].keyVersion}));
    for(const [sender,receiver] of [['customerA','workerA'],['workerA','customerA']]){
      const direction=sender==='customerA'?'customer_to_worker':'worker_to_customer';phase=direction+'_encrypt';
      const d=devices[sender],plain='Synthetic staging chat acceptance '+crypto.randomUUID();
      const body=await encryptChatMessage({plaintext:plain,bookingId:bookingA,senderId:ids[sender],senderDeviceId:d.deviceId,senderPrivateJwk:d.privateJwk,senderPublicJwk:d.publicJwk,recipients});
      assert.ok(!body.includes(plain));
      phase=direction+'_send';const sent=await edge(sender,'send-booking-message',{booking_id:bookingA,encrypted_body:body});assert.equal(sent.status,201,'Authorised encrypted send must succeed');
      const messageId=sent.data.data.message.id;
      const path='/rest/v1/messages?id=eq.'+encodeURIComponent(messageId)+'&select=id,body';
      phase=direction+'_read';const received=await request(receiver,path,null,'GET');assert.equal(received.status,200);assert.equal(received.data.length,1);assert.equal(received.data[0].body,body);
      phase=direction+'_decrypt';
      assert.equal(await decryptChatMessage({body:received.data[0].body,currentUserId:ids[receiver],currentDeviceId:devices[receiver].deviceId,privateJwk:devices[receiver].privateJwk}),plain);
      for(const outsider of ['customerB','workerB']){
        phase='outsider_read_send_denial';
        const hidden=await request(outsider,path,null,'GET');assert.equal(hidden.status,200);assert.deepEqual(hidden.data,[],'Unrelated account must not read the ciphertext row');
        assert.ok([403,404].includes((await edge(outsider,'send-booking-message',{booking_id:bookingA,encrypted_body:body})).status),'Unrelated sender must be denied');
      }
    }
    phase='plaintext_denial';assert.equal((await edge('customerA','send-booking-message',{booking_id:bookingA,body:'Synthetic plaintext must be rejected'})).status,400);
    console.log('PASS: real normal-JWT customer/Xooter encrypted send, stored ciphertext, assigned recipient read and actual library decrypt in both directions');
    console.log('PASS: unrelated customer/Xooter key, read and send access denied; plaintext rejected');
    phase='participant_voice_closed';for(const label of ['customerA','workerA']){
      const r=await edge(label,'twilio-token',{bookingId:bookingA,capability:'voice'});assert.equal(r.status,200);assert.equal(r.data.configured,false);assert.equal(r.data.reason,'feature_disabled');assert.equal(r.data.token,undefined);
    }
    phase='outsider_voice_denial';for(const label of ['customerB','workerB'])assert.ok([403,404].includes((await edge(label,'twilio-token',{bookingId:bookingA,capability:'voice'})).status));
    console.log('PASS: real participant voice gate remains off without credentials; unrelated voice access denied; no provider call made');
    await receipt({bodyChecks:'passed'});
  }catch{
    // Fixed phase names and protocol metadata only. Never persist errors, content or credentials.
    await receipt({bodyChecks:'failed',phase,status:lastStatus,rows:lastCount,errorCode:lastErrorCode});
    throw new Error('Staging communications boundary failed; local non-sensitive receipt recorded');
  }finally{
    await revokeEveryChatTestDevice(devices,async(label,d)=>{
      const r=await request(label,'/rest/v1/user_encryption_keys?user_id=eq.'+ids[label]+'&device_id=eq.'+encodeURIComponent(d.deviceId),{revoked_at:new Date().toISOString()},'PATCH');
      assert.ok([200,204].includes(r.status),'Revoke only this run test device');
    });
  }
}
export async function revokeEveryChatTestDevice(devices,revoke){
  const results=await Promise.allSettled(Object.entries(devices).map(([label,d])=>revoke(label,d)));
  if(results.some(result=>result.status==='rejected'))throw new Error('Test chat device cleanup not confirmed');
}
