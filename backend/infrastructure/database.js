import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export function openDatabase(path) {
  const db=new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(fileURLToPath(new URL('../../database/schema.sql',import.meta.url)),'utf8'));
  if(!db.prepare('SELECT id FROM points LIMIT 1').get()){
    const names=['Centro comunitario Norte','Parque del Encuentro','Estación de movilidad','Biblioteca del Barrio','Plaza Los Aromos','Punto de reciclaje','Centro cultural Sur','Paseo del Canal'];
    const coords=[[-33.432,-70.666],[-33.444,-70.651],[-33.450,-70.674],[-33.459,-70.653],[-33.472,-70.665],[-33.478,-70.643],[-33.468,-70.688],[-33.441,-70.695]];
    const insert=db.prepare('INSERT INTO points(id,name,category_id,commune_id,latitude,longitude,description,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
    names.forEach((name,i)=>insert.run('PT-'+String(i+1).padStart(3,'0'),name,i%3+1,1,...coords[i],
      'Registro sintético para explorar el visor territorial. Ubicación y atributos demostrativos sujetos a validación con LKV.',
      i===7?'borrador':'publicado',new Date().toISOString()));
  }
  return db;
}
