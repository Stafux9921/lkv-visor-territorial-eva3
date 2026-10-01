# Registro de correcciones
## COR-01 Correspondencia entre esquema y sentencias INSERT
Detección real: la primera ejecución se detuvo con ERR_SQLITE_ERROR: table points has 10 columns but 11 values were supplied. Evidencia: evidencias/testing-antes-sql.tap.

Antes, database.js y point-service.js usaban INSERT INTO points VALUES(?,?,?,?,?,?,?,?,?,1,?). La lista tenía un valor adicional respecto del esquema. Se corrigieron ambas sentencias con una lista explícita de nueve columnas y nueve parámetros; version usa el DEFAULT 1 definido en schema.sql.

Después, la carga inicial y la creación de puntos pasaron CP01 y CP07, y se ejecutaron los 17 casos de la batería. Evidencia: evidencias/testing-final.tap. La corrección evita depender del orden implícito de columnas y aporta a la integridad de la información y al mantenimiento seguro.

## COR-02 Conservación de texto largo en PDF
La ampliación de CP10 con 130 caracteres X consecutivos detectó que el ajuste por expresión regular conservaba solo 85. Evidencia: evidencias/testing-antes-pdf.tap. Se sustituyó por un recorrido que conserva cada carácter y utiliza métricas Helvetica para limitar el ancho. También se ajustó el interlineado para admitir descripciones extensas. La regresión conserva 130 de 130 caracteres y la batería vuelve a aprobarse. Evidencia: evidencias/testing-final.tap.

## Verificación del guion de interfaz
La prueba inicial de navegador suponía que el primer registro sería Centro comunitario Norte. El repositorio ordena por nombre y muestra Biblioteca del Barrio. Se corrigió la expectativa del guion para esperar una ficha válida sin alterar el producto. Esta modificación corresponde al instrumento de prueba y no se presenta como vulnerabilidad del sistema.
