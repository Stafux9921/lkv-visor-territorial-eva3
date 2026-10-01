export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function text(value, field, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw new AppError(422, field + ': longitud no válida.');
  if (/[<>\u0000-\u001f]/u.test(value)) throw new AppError(422, field + ': contiene caracteres no permitidos.');
  return value.trim();
}
export function credentials(input) {
  if (!input || typeof input !== 'object') throw new AppError(422, 'Datos de acceso no válidos.');
  const username = text(input.username, 'Usuario', 3, 40).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(username)) throw new AppError(422, 'El usuario admite letras, números, punto y guion.');
  if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128)
    throw new AppError(422, 'La contraseña debe tener entre 12 y 128 caracteres.');
  return { username, password: input.password };
}
export function pointData(input) {
  if (!input || typeof input !== 'object') throw new AppError(422,'Registro no válido.');
  const number = (v,min,max,label) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v<min || v>max)
      throw new AppError(422,label + ': valor no válido.');
    return v;
  };
  const status = input.status;
  if (!['publicado','borrador','retirado'].includes(status)) throw new AppError(422,'Estado no válido.');
  const categoryId=number(input.categoryId,1,3,'Categoría');
  if(!Number.isInteger(categoryId)) throw new AppError(422,'Categoría no válida.');
  return {
    name:text(input.name,'Nombre',3,100), description:text(input.description,'Descripción',3,1200),
    categoryId, communeId:1,
    latitude:number(input.latitude,-90,90,'Latitud'), longitude:number(input.longitude,-180,180,'Longitud'), status
  };
}
export function contactData(input) {
  if (!input || typeof input !== 'object') throw new AppError(422,'Contacto no válido.');
  const name=text(input.name,'Nombre del contacto',2,100);
  const email=text(input.email,'Correo',5,120);
  const phone=text(input.phone,'Teléfono',8,20);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(422,'Correo no válido.');
  if (!/^\+?[0-9 ()-]{8,20}$/.test(phone)) throw new AppError(422,'Teléfono no válido.');
  return {name,email,phone};
}
