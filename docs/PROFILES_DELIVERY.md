# Entrega: tres perfiles web — 2026-11-03

## Rutas y comportamiento
- `/demo`: selector de residente, conserje y administrador. Es una demostración, nunca un selector de permisos reales.
- `/demo/residente`: hogar, visitas, encomiendas, solicitudes y comunicados; filtrado de muestra por unidad A-502.
- `/demo/conserje`: recepción, visitas, encomiendas, solicitudes y bitácora.
- `/demo/administrador`: comunidad, seguimiento de visitas, encomiendas, solicitudes y bitácora.
- `/demo/administrador/gestion`: panel financiero y directorio conceptual de la entrega anterior. Sus datos de muestra son independientes.

El contexto React de `/demo` comparte datos ficticios durante la navegación mediante enlaces. Recargar o abrir otra pestaña reinicia el estado. No se almacena en navegador ni servidor. Restablecer datos reinicia todos los perfiles.

## Funciones verificadas
Autorizar visita como residente, cambiar a conserje, registrar ingreso y salida, pasar a administración y encontrar las tres anotaciones en bitácora. Las solicitudes permiten pasar de pendiente a en curso y resuelta; conserjería puede registrar recepción/entrega de encomiendas. El residente consulta únicamente sus registros de muestra.

## Validación
- TypeScript y compilación de producción: correctos.
- Diez pruebas de dominio/autorización: correctas, incluyendo aislamiento por unidad, transiciones inválidas y fechas imposibles.
- Lint: sin errores (persisten advertencias de estilo CSS ya documentadas).
- Navegador: recorrido de visita entre los tres perfiles correcto; sin errores ni advertencias de consola en ese recorrido.
- Pantalla de 390 px: bitácora y navegación sin desbordamiento horizontal del documento.

## Límites y próximo bloque
No hay autenticación, RLS, persistencia, QR válido ni acceso físico. El rol y unidad de demo se eligen públicamente y no constituyen seguridad. No introducir información privada ni usar para operar un edificio. Preparar Supabase local o proyecto exclusivo, migraciones, autenticación SSR, membresías por comunidad/unidad, MFA y pruebas RLS antes de conectar datos reales.

Pendientes de producto: gastos y pagos reales, reservas, documentos privados, comunicaciones editables, usuarios, activos y mantenimiento, proveedores/contratos, integraciones y los restantes módulos del alcance. La app móvil sigue pospuesta.
