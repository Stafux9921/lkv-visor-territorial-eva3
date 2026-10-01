# Controles de seguridad del prototipo
Referencia temática: ISO/IEC 27001:2022 (gestión de riesgos), ISO/IEC 27002:2022 (controles) e ISO/IEC 25010:2023 (calidad). No se afirma certificación ni conformidad integral.

- Contraseñas: scrypt N=131072, r=8, p=1, salt aleatoria de 16 bytes y resultado de 64 bytes. Comparación de tiempo constante. Nunca se descifran ni se devuelven.
- Contactos: nombre, correo y teléfono con AES-256-GCM, IV aleatorio de 12 bytes y etiqueta de autenticación. AAD asocia campo e identificador. La clave se genera localmente en runtime/encryption.key y no se versiona.
- Entrada: campos sensibles tipo password; ojo con aria-pressed. Web Crypto cifra el sobre antes del envío con AES-GCM y envuelve la clave con RSA-OAEP/SHA-256. Contexto, marca temporal y nonce limitan sustitución y repetición. No se conservan entradas en almacenamiento web.
- Revelado: POST autenticado por rol admin, control CSRF y auditoría. Respuesta no-store. Se oculta a los 15 segundos, al cambiar de vista y al perder foco. El usuario autorizado puede ver/copiar el dato durante ese lapso; el ojo es un control visual, no una barrera frente a quien controla el navegador.
- Sesiones: token aleatorio de 256 bits, hash del token en SQL, vencimiento absoluto de 30 minutos, cookie HttpOnly/SameSite=Strict, invalidación al salir o al iniciar otra sesión.
- API: origen y Host locales permitidos; JSON hasta 16 KiB; consultas preparadas; validación de tipos/rangos/longitudes; control de versión para evitar actualizaciones perdidas; limitación de intentos.
- Navegador: CSP, protección de marcos, nosniff, no-referrer, sin scripts remotos. El contenido del usuario se escribe con textContent.
- Archivos: scripts/start.ps1 restringe runtime en Windows mediante ACL. runtime y .qa quedan fuera de Git y ZIP.

## Transporte y límites
El servidor escucha solo en 127.0.0.1 y utiliza HTTP local para la demostración. El cifrado de carga útil no reemplaza TLS: antes de exponer una instalación en red deben habilitarse HTTPS y cookies Secure, configurar el origen permitido y sustituir la gestión local de claves por un almacén protegido. Un atacante con control de la máquina y de la clave puede leer los contactos; el cifrado no protege de un host comprometido. No se deben introducir datos reales en esta versión académica.

## Respaldo y recuperación
node scripts/backup.js crea una copia SQLite consistente con VACUUM INTO dentro de runtime/backups. La copia conserva contactos cifrados. Se debe resguardar encryption.key separadamente y de forma restringida. Para restaurar: detener el servidor, conservar copia del runtime actual, crear un directorio nuevo y restaurar allí lkv.sqlite y su encryption.key coincidente; iniciar con LKV_DATA_DIR apuntando a ese directorio; comprobar integridad, acceso y revelado antes de usarlo. No sobrescribir una instalación activa.
