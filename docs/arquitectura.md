# Arquitectura y datos
La aplicación es un monolito modular con cliente web separado. frontend/ contiene HTML, CSS y módulos JavaScript ES; backend/ expone la API y entrega los archivos estáticos desde una lista cerrada. El mismo origen simplifica las sesiones y evita habilitar CORS. No es un sistema distribuido ni un servicio SaaS desplegado.

## Dependencias
Presentación → API HTTP → PointService → PointRepository → SQLite.
PointService recibe repositorio y CryptoVault por constructor. Las validaciones viven en domain/; la criptografía, SQL y PDF en infrastructure/. server.js compone dependencias, controla sesión y enruta peticiones. Esta adaptación utiliza funciones y objetos de datos, sin crear clases vacías para cada tabla.

## Tercera forma normal
Cada tabla tiene clave primaria y valores atómicos (1FN). No hay claves compuestas que creen dependencias parciales (2FN). Categoría, comuna y rol se almacenan una vez en catálogos; sus nombres no se duplican en puntos o usuarios (3FN). Las claves foráneas preservan integridad. contacts tiene PK/FK point_id y representa cero o un contacto por punto. reports conserva point_version como hecho histórico del evento, no como copia actualizable del punto. No almacena el PDF histórico: cada nueva descarga genera la versión vigente. audit_events conserva actor, operación, entidad y fecha, sin valores privados.

## Límites explícitos
Una comuna sintética; mapa esquemático sin georreferenciación oficial, proveedor externo ni teselas. Los objetos de PointRepository se serializan como JSON; las etiquetas category y commune son proyecciones mediante JOIN, no columnas duplicadas. SQLite es apropiado para el volumen local; una operación municipal concurrente requeriría revisar PostgreSQL/PostGIS, TLS, monitoreo, gestión de claves y recuperación.
