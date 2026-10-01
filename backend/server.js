import http from 'node:http';
import { readFileSync,mkdirSync } from 'node:fs';
import { resolve,join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './infrastructure/database.js';
import { CryptoVault,hashPassword,verifyPassword,digest,token } from './infrastructure/crypto.js';
import { PointRepository } from './infrastructure/point-repository.js';
import { PointService } from './application/point-service.js';
import { pointPDF } from './infrastructure/pdf.js';
import { AppError,credentials } from './domain/validation.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function createApp({dataDir=process.env.LKV_DATA_DIR||join(root,'runtime')}={}){
  mkdirSync(dataDir,{recursive:true,mode:0o700});
  const db=openDatabase(join(dataDir,'lkv.sqlite')),vault=new CryptoVault(dataDir);
  const repo=new PointRepository(db),service=new PointService(repo,vault);
  const dummyHash=await hashPassword(token());
  const attempts=new Map(); let authBusy=0,setupBusy=false;
  const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],
    '/api.js':['api.js','text/javascript; charset=utf-8'],'/map.js':['map.js','text/javascript; charset=utf-8'],'/styles.css':['styles.css','text/css; charset=utf-8']};
  function session(req){
    const sid=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('lkv_session='))?.slice(12);
    if(!sid || sid.length>100) return null;
    return db.prepare('SELECT s.*,u.username,r.name AS role FROM sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id WHERE token_hash=? AND expires_at>?').get(digest(sid),Date.now())||null;
  }
  function requireAdmin(user){if(!user)throw new AppError(401,'Inicia sesión para continuar.');if(user.role!=='admin')throw new AppError(403,'No tienes permiso para esta acción.');}
  function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
  async function body(req){
    if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError(415,'Se requiere JSON.');
    let size=0,chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>16384)throw new AppError(413,'Solicitud demasiado grande.');chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError(400,'JSON no válido.');}
  }
  function limit(key,max=8){
    const now=Date.now();for(const [k,v] of attempts)if(now-v.at>60000)attempts.delete(k);
    const record=attempts.get(key)||{at:now,count:0};record.count++;attempts.set(key,record);
    if(record.count>max)throw new AppError(429,'Demasiados intentos. Espera un minuto.');
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try{
      const port=server.address()?.port;
      if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))throw new AppError(403,'Host no permitido.');
      const path=new URL(req.url,'http://localhost').pathname,user=session(req);
      if(req.method!=='GET'){
        if(req.headers.origin!=='http://'+req.headers.host || req.headers['x-lkv-request']!=='1')throw new AppError(403,'Origen de solicitud no permitido.');
        if(user && req.headers['x-csrf-token']!==user.csrf_token)throw new AppError(403,'Token de sesión no válido.');
      }
      if(req.method==='GET' && path==='/api/bootstrap')
        return json(res,200,{setupRequired:!db.prepare('SELECT id FROM users LIMIT 1').get(),publicKey:vault.publicKey,communes:db.prepare('SELECT * FROM communes').all(),categories:db.prepare('SELECT * FROM categories').all(),user:user?{username:user.username,role:user.role,csrf:user.csrf_token}:null});
      if(req.method==='POST' && ['/api/setup','/api/login'].includes(path)){
        limit(req.socket.remoteAddress+':auth');
        if(authBusy>=2)throw new AppError(429,'Acceso ocupado. Intenta nuevamente.');
        const input=credentials(vault.openEnvelope(await body(req),'credentials'));
        if(path==='/api/setup'){
          if(setupBusy || db.prepare('SELECT id FROM users LIMIT 1').get())throw new AppError(409,'La cuenta inicial ya fue configurada.');
          setupBusy=true;authBusy++;
          try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(randomUUID(),input.username,await hashPassword(input.password),1,new Date().toISOString());}
          finally{setupBusy=false;authBusy--;}
        }else{
          const found=db.prepare('SELECT * FROM users WHERE username=?').get(input.username);
          authBusy++;
          let valid;try{valid=await verifyPassword(input.password,found?.password_hash||dummyHash);}finally{authBusy--;}
          if(!found || !valid)throw new AppError(401,'Usuario o contraseña incorrectos.');
        }
        const found=db.prepare('SELECT u.*,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE username=?').get(input.username);
        const sid=token(),csrf=token();
        db.prepare('DELETE FROM sessions WHERE expires_at<=? OR user_id=?').run(Date.now(),found.id);
        db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(sid),found.id,csrf,Date.now()+30*60*1000);
        repo.audit(found.id,'iniciar_sesion',null);
        res.setHeader('Set-Cookie','lkv_session='+sid+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800');
        return json(res,200,{username:found.username,role:found.role,csrf});
      }
      if(req.method==='POST' && path==='/api/logout'){
        if(user)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(user.token_hash);
        res.setHeader('Set-Cookie','lkv_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});
      }
      if(req.method==='GET' && path==='/api/points')return json(res,200,service.list(user?.role==='admin'));
      if(req.method==='POST' && path==='/api/points'){
        requireAdmin(user);return json(res,201,service.save(await body(req),user.user_id));
      }
      const match=path.match(/^\/api\/points\/([a-zA-Z0-9-]+)(?:\/(report|reveal))?$/);
      if(match){
        const [,id,action]=match;
        if(req.method==='GET' && !action)return json(res,200,service.get(id,user?.role==='admin'));
        if(req.method==='PUT' && !action){requireAdmin(user);return json(res,200,service.save(await body(req),user.user_id,id));}
        if(req.method==='POST' && action==='reveal'){requireAdmin(user);const input=await body(req);return json(res,200,service.reveal(id,input.field,user.user_id));}
        if(req.method==='POST' && action==='report'){
          limit(req.socket.remoteAddress+':report',30);
          const point=service.get(id,user?.role==='admin'),idReport=randomUUID();
          const pdf=pointPDF(point,idReport);
          db.prepare('INSERT INTO reports VALUES(?,?,?,?)').run(idReport,id,point.version,new Date().toISOString());
          res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="LKV-'+id.slice(0,12)+'.pdf"'});return res.end(pdf);
        }
      }
      if(req.method==='GET' && path==='/api/audit'){requireAdmin(user);return json(res,200,db.prepare('SELECT a.id,a.action,a.entity_id,a.created_at,u.username FROM audit_events a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100').all());}
      if(req.method==='GET' && path==='/api/reports')return json(res,200,db.prepare("SELECT r.id,r.generated_at,r.point_version,p.name,p.id AS point_id FROM reports r JOIN points p ON p.id=r.point_id WHERE p.status='publicado' ORDER BY r.generated_at DESC LIMIT 50").all());
      if(req.method==='GET' && files[path]){
        const [name,type]=files[path];res.writeHead(200,{'Content-Type':type});return res.end(readFileSync(join(root,'frontend',name)));
      }
      throw new AppError(404,'Recurso no disponible.');
    }catch(error){
      if(res.headersSent){res.end();return;}
      json(res,error.status||500,{error:error.status?error.message:'No se pudo completar la operación.'});
    }
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  return {server,db,vault,service,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve();}))};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const app=await createApp();const port=Number(process.env.PORT||3000);
  app.server.listen(port,'127.0.0.1',()=>console.log('LKV disponible en http://127.0.0.1:'+port));
  app.server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'El puerto está ocupado. Define PORT con otro número.':'No se pudo iniciar el servidor.');process.exitCode=1;});
}
