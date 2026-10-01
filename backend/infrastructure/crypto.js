import { randomBytes, createCipheriv, createDecipheriv, createHash, generateKeyPairSync,
  privateDecrypt, constants, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppError } from '../domain/validation.js';
const scrypt=promisify(scryptCallback);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export async function hashPassword(password, salt=randomBytes(16).toString('hex')) {
  const hash=await scrypt(password,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024});
  return ['scrypt',salt,hash.toString('hex')].join('$');
}
export async function verifyPassword(password,stored) {
  const [,salt,expected]=stored.split('$');
  const result=await hashPassword(password,salt);
  return timingSafeEqual(Buffer.from(result.split('$')[2],'hex'),Buffer.from(expected,'hex'));
}
export class CryptoVault {
  constructor(directory) {
    const path=join(directory,'encryption.key');
    if(!existsSync(path)) writeFileSync(path,randomBytes(32),{mode:0o600,flag:'wx'});
    this.key=readFileSync(path);
    if(this.key.length!==32) throw new Error('Clave de cifrado inválida.');
    const pair=generateKeyPairSync('rsa',{modulusLength:3072});
    this.privateKey=pair.privateKey;
    this.publicKey=pair.publicKey.export({format:'jwk'});
    this.usedNonces=new Map();
  }
  encrypt(value,aad) {
    const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',this.key,iv);
    cipher.setAAD(Buffer.from(aad));
    const body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
    return [iv,cipher.getAuthTag(),body].map(b=>b.toString('base64')).join('.');
  }
  decrypt(value,aad) {
    const [iv,tag,body]=value.split('.').map(s=>Buffer.from(s,'base64'));
    const decipher=createDecipheriv('aes-256-gcm',this.key,iv);
    decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8');
  }
  openEnvelope(envelope,context) {
    try {
      if(!envelope || !['key','iv','data'].every(k=>typeof envelope[k]==='string')) throw Error();
      const key=privateDecrypt({key:this.privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.key,'base64'));
      const bytes=Buffer.from(envelope.data,'base64'), iv=Buffer.from(envelope.iv,'base64');
      if(key.length!==32 || iv.length!==12 || bytes.length<17) throw Error();
      const dec=createDecipheriv('aes-256-gcm',key,iv);
      dec.setAAD(Buffer.from(context)); dec.setAuthTag(bytes.subarray(-16));
      const payload=JSON.parse(Buffer.concat([dec.update(bytes.subarray(0,-16)),dec.final()]).toString('utf8'));
      const now=Date.now();
      for(const [n,time] of this.usedNonces) if(now-time>120000) this.usedNonces.delete(n);
      if(typeof payload.nonce!=='string' || payload.nonce.length<20 || typeof payload.at!=='number' ||
        Math.abs(now-payload.at)>120000 || this.usedNonces.has(payload.nonce)) throw Error();
      this.usedNonces.set(payload.nonce,now);
      return payload.value;
    } catch { throw new AppError(400,'Datos cifrados inválidos o vencidos. Vuelve a intentar.'); }
  }
}
