let publicKey,csrf;
export function configure(bootstrap){publicKey=bootstrap.publicKey;csrf=bootstrap.user?.csrf;}
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
export async function envelope(value,context){
  const rsa=await crypto.subtle.importKey('jwk',publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=new TextEncoder().encode(JSON.stringify({value,at:Date.now(),nonce:crypto.randomUUID()}));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},aes,data);
  const key=await crypto.subtle.encrypt({name:'RSA-OAEP'},rsa,await crypto.subtle.exportKey('raw',aes));
  return {key:b64(key),iv:b64(iv),data:b64(encrypted)};
}
export async function request(path,{method='GET',data,blob=false}={}){
  const headers={'X-LKV-Request':'1'};
  if(csrf)headers['X-CSRF-Token']=csrf;
  if(data!==undefined)headers['Content-Type']='application/json';
  const response=await fetch('/api'+path,{method,headers,credentials:'same-origin',body:data===undefined?undefined:JSON.stringify(data)});
  if(!response.ok){let message='No se pudo completar la operación.';try{message=(await response.json()).error||message;}catch{}const error=new Error(message);error.status=response.status;throw error;}
  return blob?response.blob():response.json();
}
