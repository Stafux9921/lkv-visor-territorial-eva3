# Plan de pruebas ejecutado
Objetivo: verificar el MVP, rechazar entradas y acciones no autorizadas y comprobar navegación local. Entorno: Windows, Node 24.19, SQLite integrado, Edge automatizado; datos sintéticos aislados en .qa. No se realizan pruebas contra sistemas externos. Los resultados de la batería se conservan en evidencias/testing-final.tap; las capturas y navegacion.json registran el recorrido de navegador.

Criterio de salida: 17 casos CP de API/seguridad aprobados y recorrido UI aprobado; no errores JavaScript ni desbordamiento horizontal a 360 px. Se excluyen certificación de accesibilidad, pentest profesional, carga municipal, tolerancia a caída del host y aceptación del cliente.

Cada subprueba declara datos y aserciones en tests/security.test.js. Los códigos HTTP y consultas SQL utilizados verifican efectos persistidos, no solamente mensajes de interfaz. El conjunto de prueba se crea en un directorio nuevo en cada ejecución, por lo que no modifica runtime.

La primera ejecución falló antes de completar la carga por discrepancia en INSERT. Se conservaron resultado previo y resultado posterior. Los resultados representan ejecución automatizada; la revisión conjunta de los tres integrantes y la aceptación LKV permanecen como actividades del siguiente ciclo.
