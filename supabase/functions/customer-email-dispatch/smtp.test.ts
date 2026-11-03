import {describe,it,expect,vi} from 'vitest';
import {createCustomerBrevoSmtpSender} from './smtp';
import {buildCustomerJourneyEmail} from './handler';
const id='10000000-0000-4000-8000-000000000001',to='synthetic@example.test';
const email=buildCustomerJourneyEmail({id,email:to,first_name:'Synthetic',kind:'customer_welcome',title:'Welcome',body:'A private next step.',route:'/app'},'https://xoot.co.za',false);
describe('SMTP transport boundary',()=>{
  it('requires validated STARTTLS on the fixed relay and one recipient',async()=>{
    const sendMail=vi.fn().mockResolvedValue({accepted:[to],rejected:[],messageId:`<xoot-customer-${id}@xoot.co.za>`,response:'250 queued'}),close=vi.fn(),connect=vi.fn(()=>({sendMail,close}));
    expect(await createCustomerBrevoSmtpSender({user:'synthetic-user',password:'synthetic-password'},connect)(email)).toEqual({messageId:`<xoot-customer-${id}@xoot.co.za>`});
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({host:'smtp-relay.brevo.com',port:2525,requireTLS:true,pool:false,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,tls:{servername:'smtp-relay.brevo.com',rejectUnauthorized:true,minVersion:'TLSv1.2'}}));
    expect(sendMail).toHaveBeenCalledOnce();expect(sendMail.mock.calls[0][0]).toMatchObject({to,from:'Xoot <no-reply@xoot.co.za>',replyTo:'Xoot Support <support@xoot.co.za>'});expect(close).toHaveBeenCalled();
  });
  it.each([{accepted:[],rejected:[to],response:'550 rejected'},{accepted:[to],rejected:[],response:'354 continue'},{accepted:['other@example.test'],rejected:[],response:'250 queued'}])('rejects incomplete or wrong envelope acceptance',async info=>{const close=vi.fn(),sendMail=vi.fn().mockResolvedValue({...info,messageId:`<xoot-customer-${id}@xoot.co.za>`});await expect(createCustomerBrevoSmtpSender({user:'synthetic-user',password:'synthetic-password'},()=>({sendMail,close}))(email)).rejects.toThrow('uncertain');expect(sendMail).toHaveBeenCalledOnce();expect(close).toHaveBeenCalled();});
  it('does not connect without private credentials',async()=>{const connect=vi.fn();await expect(createCustomerBrevoSmtpSender({user:'',password:''},connect)(email)).rejects.toThrow('not configured');expect(connect).not.toHaveBeenCalled();});
  it('closes after failure without resending',async()=>{const sendMail=vi.fn().mockRejectedValue(Error('synthetic failure')),close=vi.fn();await expect(createCustomerBrevoSmtpSender({user:'synthetic-user',password:'synthetic-password'},()=>({sendMail,close}))(email)).rejects.toThrow();expect(sendMail).toHaveBeenCalledOnce();expect(close).toHaveBeenCalled();});
});
