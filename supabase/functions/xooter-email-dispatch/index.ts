import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@10.3.1';
import {createXooterEmailDispatch} from './handler.ts';
import {createBrevoSmtpSender} from './smtp.ts';
const supabaseUrl=Deno.env.get('SUPABASE_URL')??'';
const databaseFetch:typeof fetch=(input,init)=>{
  const target=new URL(input instanceof Request?input.url:String(input));
  if(target.origin!==new URL(supabaseUrl).origin || target.username || target.password)throw Error('Database target refused');
  const signal=init?.signal ?? (input instanceof Request?input.signal:null);
  const deadline=AbortSignal.timeout(15_000);
  return fetch(input,{...init,redirect:'error',signal:signal?AbortSignal.any([signal,deadline]):deadline});
};
const smtpUser=Deno.env.get('BREVO_SMTP_USER')??'';
const smtpPassword=Deno.env.get('BREVO_SMTP_PASSWORD')??'';
const sendMail=createBrevoSmtpSender({user:smtpUser,password:smtpPassword},options=>nodemailer.createTransport(options));
Deno.serve(createXooterEmailDispatch({supabaseUrl,smtpConfigured:!!smtpUser && !!smtpPassword,appUrl:Deno.env.get('XOOT_LIFECYCLE_APP_URL')??''},
  key=>createClient(supabaseUrl,key,{global:{headers:{Authorization:`Bearer ${key}`},fetch:databaseFetch},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),sendMail));
