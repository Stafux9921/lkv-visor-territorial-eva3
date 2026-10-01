# LKV Visor Territorial Municipal
Prototipo funcional EVA3, versión 1.0.0. Proyecto académico INACAP basado en la planificación EVA2 y Scrum adaptado. Todos los registros de ejemplo son sintéticos; las estimaciones son referenciales.

Repositorio privado: https://github.com/Stafux9921/lkv-visor-territorial-eva3

## Ejecutar en Visual Studio Code
1. Abre la carpeta del proyecto o lkv-eva3.code-workspace.
2. Comprueba Node.js 24.2 o posterior con `node --version`. No se necesitan paquetes npm, Java ni Python para ejecutar la aplicación.
3. En la terminal PowerShell, ejecuta `powershell -ExecutionPolicy Bypass -File scripts/start.ps1`. El script configura permisos sobre runtime y arranca el servidor. Alternativamente, `node backend/server.js`.
4. Abre http://127.0.0.1:3000.
5. Pulsa **Acceso al equipo** y crea la cuenta administradora inicial con una contraseña de 12 a 128 caracteres. No existe una contraseña predefinida.
6. Detén el servidor con Ctrl+C.

Si el puerto está ocupado: `$env:PORT='3002'; node backend/server.js`.
El código usa SQLite incluido en Node. Python se utilizó para preparar el informe; PlantUML/Java, solo para renderizar los diagramas. El frontend utiliza JavaScript, que es un lenguaje distinto de Java.

## Recorrido para presentar
- Explorar mapa y puntos; buscar Biblioteca y filtrar categorías.
- Abrir ficha; descargar PDF y comprobar la advertencia referencial.
- Acceder como administrador; crear un punto con un contacto ficticio.
- Comprobar que nombre, correo y teléfono se ocultan al escribir; usar el ojo para mostrar/ocultar.
- Guardar; verificar que la ficha permanece enmascarada. Pulsar el ojo, observar el valor y esperar 15 segundos.
- Editar un punto y cambiarlo a borrador o retirado; cerrar sesión y comprobar que no es público.
- Consultar administración y su registro de eventos.
- Mostrar la vista móvil y el directorio como alternativa al mapa.

## Estructura
- frontend/: presentación HTML, CSS, JavaScript y mapa SVG sin servicios externos.
- backend/domain/: validación y errores de aplicación.
- backend/application/: casos de uso de puntos y contactos.
- backend/infrastructure/: SQL, repositorio, cifrado y generación de PDF.
- backend/server.js: composición, rutas, sesiones y controles HTTP.
- database/schema.sql: esquema normalizado con claves y restricciones.
- tests/: pruebas automatizadas de API, integridad y seguridad.
- scripts/: inicio, respaldo y ejecución de pruebas con evidencia.
- docs/: arquitectura, seguridad, diagramas editables y resultados.
- entrega/: informe final Word.
- runtime/: base de datos y clave local, generadas al ejecutar. Nunca subir.
- .qa/: herramientas, credenciales temporales y datos de pruebas locales. Nunca subir.

## Pruebas
`node --test tests/security.test.js`
`node scripts/run-tests.js` guarda el resultado en docs/evidencias/testing-final.tap.
17 casos CP01-CP17 y un contenedor (el ejecutor informa 18 tests en total).
El guion visual reproducible se encuentra en tests/browser.test.cjs; requiere Playwright y un navegador Edge instalado. Es una dependencia de desarrollo opcional, no del producto. Ejecutar sobre una instancia de prueba vacía en puerto 3001, con LKV_DATA_DIR separado; nunca sobre datos de trabajo.

## Datos y límites
Modelo en 3FN, una comuna piloto sin identidad municipal confirmada. Mapa local esquemático: no es cartografía oficial ni un GIS. La descarga genera un PDF actualizado y registra su versión; no hay archivo histórico del contenido. La administración permite crear, editar, publicar y retirar, sin borrado físico de puntos.

AES-256-GCM protege contactos en disco; Web Crypto protege la carga sensible antes de enviarla; las contraseñas se almacenan con scrypt. El ojo solo controla visibilidad y requiere autorización del servidor para datos guardados. Consulta docs/seguridad.md para los límites del cifrado y recuperación.

Servidor solo local. Para producción se requieren HTTPS, cookie Secure, revisión de configuración y claves, respaldo fuera del equipo, pruebas de carga y validación con LKV. No se afirma certificación ISO ni cumplimiento completo de WCAG. No usar datos personales reales.

## Entrega académica
Informe Word, ZIP sin secretos, fuentes UML, esquema SQL y evidencias reales. El repositorio es privado; el propietario debe dar acceso al docente y al equipo por los canales acordados. Los archivos de referencia originales no se publican. La participación individual, validación de cliente, sección y número de grupo deben confirmarse antes de la entrega institucional.

## Propiedad y uso
La propuesta LKV establece la titularidad y créditos del proyecto. Este repositorio no incorpora una licencia de código abierto ni concede derechos adicionales sobre antecedentes de LKV.
