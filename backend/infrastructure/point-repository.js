export class PointRepository {
  constructor(db){this.db=db;}
  select = 'SELECT p.*, c.name AS category, c.color, m.name AS commune FROM points p JOIN categories c ON c.id=p.category_id JOIN communes m ON m.id=p.commune_id';
  list(admin=false){return this.db.prepare(this.select+(admin?'':" WHERE p.status='publicado'")+' ORDER BY p.name').all();}
  find(id){return this.db.prepare(this.select+' WHERE p.id=?').get(id);}
  contact(id){return this.db.prepare('SELECT * FROM contacts WHERE point_id=?').get(id);}
  audit(userId,action,entityId){this.db.prepare('INSERT INTO audit_events(user_id,action,entity_id,created_at) VALUES(?,?,?,?)').run(userId,action,entityId,new Date().toISOString());}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
}
