# Trazabilidad de requisitos a la versión 1.0.0
| Requisito EVA2 | Implementación EVA3 | Evidencia |
|---|---|---|
| RF01 mapa y puntos | SVG local interactivo y conjunto de una comuna | CP01; captura 01 |
| RF02 selección | pines y tarjetas con ficha | navegación |
| RF03 ficha | PointService.get y panel de detalle | CP01; navegación |
| RF04 informe | PDF desde la versión vigente | CP10 |
| RF05 descarga | respuesta application/pdf | CP10; informe-ejemplo.pdf |
| RF06 advertencia | aviso en interfaz y PDF | CP10; captura 01 |
| RF07 administración | crear, editar, publicar y retirar | CP07, CP09 |
| RF08 filtros | texto y categoría, mapa y tarjetas | navegación |
| RF09 perfiles | admin y consultor en backend; acceso público de lectura | CP14 |
| RF10 multicomuna | fuera de esta versión, catálogo preparado | decisión de alcance |
| RNF03 accesibilidad | etiquetas, foco, Tab, lista, 360 px | prueba parcial; no auditoría AA completa |
| RNF04 seguridad | sesión, rol, cifrado, CSRF; HTTP restringido a loopback | CP02-CP17; HTTPS pendiente para red |
| RNF05 trazabilidad | eventos sin contactos en texto | CP08 |
| RNF06 mantenibilidad | separación por capas y dependencias inyectadas | código y UML |
| RNF08 integridad | CHECK, FK y validación de servidor | CP06, CP12 |
