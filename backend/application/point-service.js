import { randomUUID } from 'node:crypto';
import { pointData,contactData,AppError } from '../domain/validation.js';
export class PointService {
  constructor(repository,vault){this.repo=repository;this.vault=vault;}
  list(admin){return this.repo.list(admin).map(p=>({...p,hasContact:!!this.repo.contact(p.id)}));}
  get(id,admin=false){
    const point=this.repo.find(id);
    if(!point || (!admin && point.status!=='publicado')) throw new AppError(404,'Punto no disponible.');
    return {...point,hasContact:!!this.repo.contact(id)};
  }
  save(input,userId,id=null){
    const p=pointData(input), contact=input.contact?contactData(this.vault.openEnvelope(input.contact,'contact')):null;
    return this.repo.transaction(()=>{
      const now=new Date().toISOString();
      if(id){
        const before=this.get(id,true);
        if(input.version!==before.version) throw new AppError(409,'El registro cambió. Recarga antes de guardar.');
        this.repo.db.prepare('UPDATE points SET name=?,category_id=?,latitude=?,longitude=?,description=?,status=?,version=version+1,updated_at=? WHERE id=?')
          .run(p.name,p.categoryId,p.latitude,p.longitude,p.description,p.status,now,id);
      }else{
        id=randomUUID();
        this.repo.db.prepare('INSERT INTO points(id,name,category_id,commune_id,latitude,longitude,description,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,p.name,p.categoryId,1,p.latitude,p.longitude,p.description,p.status,now);
      }
      if(contact){
        this.repo.db.prepare('INSERT INTO contacts VALUES(?,?,?,?) ON CONFLICT(point_id) DO UPDATE SET name_cipher=excluded.name_cipher,email_cipher=excluded.email_cipher,phone_cipher=excluded.phone_cipher')
          .run(id,...['name','email','phone'].map(field=>this.vault.encrypt(contact[field],id+':'+field)));
      }
      this.repo.audit(userId,'guardar_punto',id);
      return this.get(id,true);
    });
  }
  reveal(id,field,userId){
    this.get(id,true);
    if(!['name','email','phone'].includes(field)) throw new AppError(422,'Campo no permitido.');
    const contact=this.repo.contact(id);
    if(!contact) throw new AppError(404,'No existe contacto.');
    const value=this.vault.decrypt(contact[field+'_cipher'],id+':'+field);
    this.repo.audit(userId,'revelar_'+field,id);
    return {value,hideAfterSeconds:15};
  }
}
