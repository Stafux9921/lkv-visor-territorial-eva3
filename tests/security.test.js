import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {webcrypto,randomUUID} from 'node:crypto';
import {createApp} from '../backend/server.js';
import {hashPassword} from '../backend/infrastructure/crypto.js';
import {pointPDF} from '../backend/infrastructure/pdf.js';
import {pointData} from '../backend/domain/validation.js';
const base=resolve('.qa');mkdirSync(base,{recursive:true});
const directory=mkdtempSync(join(base,'test-'));
let app,url,cookie='',csrf='',key;
const b64=x=>Buffer.from(x).toString('base64');
async function encrypted(value,context){
  const aes=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  const iv=webcrypto.getRandomValues(new Uint8Array(12));
  const rsa=await webcrypto.subtle.importKey('jwk',key,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const payload=Buffer.from(JSON.stringify({value,nonce:randomUUID(),at:Date.now()}));
  return {key:b64(await webcrypto.subtle.encrypt({name:'RSA-OAEP'},rsa,await webcrypto.subtle.exportKey('raw',aes))),iv:b64(iv),
    data:b64(await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:Buffer.from(context)},aes,payload))};
}
async function req(path,method='GET',data,options={}){
  const headers={'X-LKV-Request':'1',Origin:url,...options.headers};
  if(cookie)headers.Cookie=cookie;if(csrf)headers['X-CSRF-Token']=csrf;
  if(data!==undefined)headers['Content-Type']='application/json';
  if(options.anonymous){delete headers.Cookie;delete headers['X-CSRF-Token'];}
  if(options.noCsrf)delete headers['X-CSRF-Token'];
  const response=await fetch(url+'/api'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
  return response;
}
const sample={name:'Punto de prueba',categoryId:1,status:'publicado',latitude:-33.451,longitude:-70.669,description:'Información sintética para la prueba automatizada.'};
await test('Plan de pruebas EVA3',async t=>{
  app=await createApp({dataDir:directory});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+app.server.address().port;
  try{
    key=(await (await req('/bootstrap')).json()).publicKey;
    await t.test('CP01 Publicación inicial y ocultación de borradores',async()=>{const r=await req('/points'),data=await r.json();assert.equal(r.status,200);assert.equal(data.length,7);assert.ok(data.every(p=>p.status==='publicado'));});
    await t.test('CP02 Denegar escritura anónima',async()=>{assert.equal((await req('/points','POST',sample)).status,401);});
    await t.test('CP03 Rechazar credenciales sin cifrar',async()=>{assert.equal((await req('/setup','POST',{username:'admin',password:'not-a-secret-test'})).status,400);});
    await t.test('CP04 Configuración y cookie de sesión',async()=>{
      const r=await req('/setup','POST',await encrypted({username:'admin.pruebas',password:'Solo-Pruebas-2026!'},'credentials'));
      assert.equal(r.status,200);const c=r.headers.get('set-cookie');assert.match(c,/HttpOnly/);assert.match(c,/SameSite=Strict/);
      cookie=c.split(';')[0];csrf=(await r.json()).csrf;
      assert.match(app.db.prepare('SELECT password_hash FROM users').get().password_hash,/^scrypt\$/);
    });
    await t.test('CP05 Bloquear origen ajeno y CSRF ausente',async()=>{
      assert.equal((await req('/points','POST',sample,{headers:{Origin:'https://evil.invalid'}})).status,403);
      assert.equal((await req('/points','POST',sample,{noCsrf:true})).status,403);
    });
    await t.test('CP06 Validar coordenadas tipos y contenido HTML',async()=>{
      for(const change of [{latitude:91},{longitude:-181},{latitude:''},{name:'<script>alert(1)</script>'},{categoryId:1.5}])
        assert.equal((await req('/points','POST',{...sample,...change})).status,422);
      assert.throws(()=>pointData({...sample,latitude:NaN}));
    });
    let id;
    await t.test('CP07 Crear punto con contacto cifrado y comprobar persistencia',async()=>{
      const contact=await encrypted({name:'Persona Ficticia',email:'ficticio@example.invalid',phone:'+56912345678'},'contact');
      const r=await req('/points','POST',{...sample,contact});assert.equal(r.status,201);id=(await r.json()).id;
      const data=JSON.stringify(await (await req('/points')).json());assert.ok(!data.includes('Persona Ficticia'));assert.ok(!data.includes('ficticio@example.invalid'));
      const stored=app.db.prepare('SELECT * FROM contacts WHERE point_id=?').get(id);
      assert.ok(!JSON.stringify(stored).includes('Ficticia'));assert.equal(stored.email_cipher.split('.').length,3);
      assert.ok(!readFileSync(join(directory,'lkv.sqlite')).includes(Buffer.from('ficticio@example.invalid')));
    });
    await t.test('CP08 Revelado autorizado y evento sin datos sensibles',async()=>{
      assert.equal((await req('/points/'+id+'/reveal','POST',{field:'email'},{anonymous:true})).status,401);
      const r=await req('/points/'+id+'/reveal','POST',{field:'email'});assert.equal(r.status,200);assert.equal((await r.json()).value,'ficticio@example.invalid');
      const audit=JSON.stringify(await (await req('/audit')).json());assert.ok(audit.includes('revelar_email'));assert.ok(!audit.includes('ficticio@example.invalid'));
      assert.equal((await req('/points/'+id+'/reveal','POST',{field:'password_hash'})).status,422);
    });
    await t.test('CP09 Control de concurrencia y retiro de publicación',async()=>{
      assert.equal((await req('/points/'+id,'PUT',{...sample,version:1,status:'retirado'})).status,200);
      assert.equal((await req('/points/'+id,'PUT',{...sample,version:1})).status,409);
      assert.equal((await req('/points/'+id,'GET',undefined,{anonymous:true})).status,404);
    });
    await t.test('CP10 PDF referencial válido y sin datos privados',async()=>{
      const r=await req('/points/PT-001/report','POST',{}),bytes=Buffer.from(await r.arrayBuffer());
      assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');
      assert.match(bytes.toString('latin1'),/ESTIMACIÓN REFERENCIAL/);assert.ok(!bytes.toString().includes('Ficticia'));
      const longPDF=pointPDF({...app.service.get('PT-001'),description:'X'.repeat(130)},'test');
      assert.equal((longPDF.toString('latin1').match(/X/g)||[]).length,130,'El PDF no debe perder texto largo sin espacios');
    });
    await t.test('CP11 Rechazar sobres reutilizados o manipulados',async()=>{
      const enc=await encrypted({name:'Contacto Falso',email:'demo@example.invalid',phone:'+56912345678'},'contact');
      assert.equal((await req('/points','POST',{...sample,contact:enc})).status,201);
      assert.equal((await req('/points','POST',{...sample,contact:enc})).status,400);
      const other=await encrypted({name:'Contacto Falso',email:'demo@example.invalid',phone:'+56912345678'},'contact');other.data='AAAA'+other.data.slice(4);
      assert.equal((await req('/points','POST',{...sample,contact:other})).status,400);
    });
    await t.test('CP12 Integridad referencial y atomicidad ante datos inválidos',async()=>{
      const before=app.db.prepare('SELECT count(*) AS n FROM points').get().n;
      const contact=await encrypted({name:'Mal',email:'sin-arroba',phone:'abc'},'contact');
      assert.equal((await req('/points','POST',{...sample,contact})).status,422);
      assert.equal(app.db.prepare('SELECT count(*) AS n FROM points').get().n,before);
      assert.throws(()=>app.db.prepare('INSERT INTO contacts VALUES(?,?,?,?)').run('inexistente','x','y','z'));
    });
    await t.test('CP13 Cierre de sesión e invalidación del token',async()=>{
      assert.equal((await req('/logout','POST',{})).status,200);
      assert.equal((await req('/points','POST',sample)).status,401);
    });
    await t.test('CP14 Permisos del rol consultor',async()=>{
      cookie='';csrf='';
      app.db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(randomUUID(),'lector.pruebas',await hashPassword('Solo-Pruebas-2026!'),2,new Date().toISOString());
      const r=await req('/login','POST',await encrypted({username:'lector.pruebas',password:'Solo-Pruebas-2026!'},'credentials'));
      assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await r.json()).csrf;
      assert.equal((await req('/points','POST',sample)).status,403);
      assert.equal((await req('/points/'+id+'/reveal','POST',{field:'email'})).status,403);
    });
    await t.test('CP15 Expiración de sesión',async()=>{
      app.db.prepare('UPDATE sessions SET expires_at=0').run();
      assert.equal((await req('/audit')).status,401);
    });
    await t.test('CP16 Bloquear rutas internas y cabeceras seguras',async()=>{
      const r=await fetch(url+'/backend/server.js');assert.equal(r.status,404);
      const home=await fetch(url);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(home.headers.get('cache-control'),'no-store');
    });
    await t.test('CP17 Limitación de intentos de autenticación',async()=>{
      cookie='';csrf='';
      for(let i=0;i<9;i++)await req('/login','POST',{});
      assert.equal((await req('/login','POST',{})).status,429);
    });
  }finally{await app.close();}
});
