// Independent boundary around the preserved application. Never trust client identity headers.
import application from '../worker/index.js';
import {googleIdentity} from '../worker/google-auth.js';
const identityHeaders=['oai-authenticated-user-id','oai-authenticated-user-email','oai-authenticated-user-full-name'];
export default {async fetch(request,environment,context={}){
 const env={...environment,CUSTOMER_AUTH_PROVIDER:'google'},url=new URL(request.url);
 if(['/signin-with-chatgpt','/signout-with-chatgpt'].includes(url.pathname)){
  const target=url.searchParams.get('returnTo')||url.searchParams.get('return_to')||'/admin';
  const safe=target.startsWith('/')&&!target.startsWith('//')&&!/[\\\r\n]/.test(target)?target:'/admin';
  return Response.redirect(url.origin+'/auth/google?returnTo='+encodeURIComponent(safe),302);
 }
 const headers=new Headers(request.headers);for(const key of identityHeaders)headers.delete(key);
 const who=await googleIdentity(request,env,url);
 if(who){headers.set('oai-authenticated-user-id',who.id);headers.set('oai-authenticated-user-email',who.email);}
 const trustedRequest=new Request(request,{headers});
 if(url.pathname==='/api/storage/import'&&(!who||!env.ADMIN_EMAIL||who.email.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase()))return Response.json({error:'Administrator access required.'},{status:403});
 const response=await application.fetch(trustedRequest,env,context);
 if(/text\/html|application\/javascript/.test(response.headers.get('Content-Type')||'')){
  const h=new Headers(response.headers);h.delete('Content-Length');
  const html=(await response.text()).replaceAll('Sign in with ChatGPT','Sign in with Google');
  return new Response(html,{status:response.status,headers:h});
 }
 return response;
}};
