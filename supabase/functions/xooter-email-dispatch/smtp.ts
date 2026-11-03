import type {JourneyEmail} from './handler.ts';
type Transport={sendMail:(mail:Record<string,unknown>)=>Promise<unknown>;close:()=>void};
export function createBrevoSmtpSender(credentials:{user:string;password:string},connect:(options:Record<string,unknown>)=>Transport){
  return async(email:JourneyEmail):Promise<{messageId:string}>=>{
    if(!credentials.user || !credentials.password || credentials.user.length>254 || credentials.password.length>256
      || /[\r\n\0]/.test(credentials.user+credentials.password))throw Error('SMTP not configured');
    // Port2525 avoids Edge's blocked SMTP ports. STARTTLS is mandatory before authentication;
    // there is no plaintext, certificate bypass, caller-selected host or local-file/URL fallback.
    const transport=connect({host:'smtp-relay.brevo.com',port:2525,secure:false,requireTLS:true,
      tls:{servername:'smtp-relay.brevo.com',rejectUnauthorized:true,minVersion:'TLSv1.2'},
      auth:{user:credentials.user,pass:credentials.password},pool:false,logger:false,debug:false,
      connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:12_000,
      disableFileAccess:true,disableUrlAccess:true});
    const messageId=`<xoot-${email.eventId}@xoot.co.za>`;
    const close=()=>{try{transport.close();}catch{/* Cleanup must not replace a confirmed SMTP result. */}};
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      const pending=transport.sendMail({from:'Xoot <no-reply@xoot.co.za>',replyTo:'Xoot Support <support@xoot.co.za>',
        to:email.to[0].email,subject:email.subject,text:email.textContent,html:email.htmlContent,messageId,
        headers:{'X-Xoot-Event':email.eventId},disableFileAccess:true,disableUrlAccess:true});
      const timeout=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{close();reject(Error('SMTP outcome uncertain'));},16_000);});
      const info=await Promise.race([pending,timeout]) as {accepted?:unknown[];rejected?:unknown[];messageId?:unknown;response?:unknown};
      if(!Array.isArray(info.accepted) || info.accepted.length!==1 || info.accepted[0]!==email.to[0].email
        || !Array.isArray(info.rejected) || info.rejected.length || info.messageId!==messageId
        || typeof info.response!=='string' || !/^250(?:[ -])/.test(info.response))throw Error('SMTP outcome uncertain');
      return {messageId};
    }finally{clearTimeout(timer);close();}
  };
}
