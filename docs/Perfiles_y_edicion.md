# Perfiles reales y edición de registros

Migración requerida: 202611030004_profile_experiences_and_editing.sql (aplicada por el propietario).

Administrador: Unidades y residentes permite editar nombre, correo y teléfono de contacto; corregir la relación con la unidad y el nombre de una unidad. Las correcciones requieren MFA, validan comunidad y rechazan versiones antiguas. La auditoría guarda los nombres de los campos modificados, sin copiar datos de contacto. El correo de contacto no cambia el correo de inicio de sesión ni otorga permisos.

Residente: navegación propia con Mi hogar, Mi cuenta, visitas, encomiendas, solicitudes y comunicados. Mi cuenta consulta cobros, abonos, reversos, saldo pendiente y vencido de la unidad vinculada a su membresía. Los totales incluyen todo el historial; las listas muestran hasta 100 registros. Un error de consulta muestra indisponibilidad, nunca un saldo cero supuesto. La administración debe emitir los cobros para que aparezcan. Los pagos se registran manualmente por administración; no hay pasarela de pagos activa.

Conserjería: recepción con conteos de visitas vigentes, visitas dentro, encomiendas pendientes y solicitudes activas. Puede registrar visitas, ingresos/salidas, recepción/entrega de encomiendas y gestionar solicitudes. La bitácora muestra eventos operacionales, sin movimientos financieros. No se implementaron notas manuales ni cierre formal de turno.

Validación: TypeScript, 20 pruebas de aplicación, lint y compilación de producción. Prueba SQL aislada de correcciones, auditoría, concurrencia, aislamiento por unidad y restricciones por rol/MFA. La comprobación de flujos completos con sesiones reales de los tres usuarios queda pendiente; no se utilizaron sus contraseñas ni códigos de autenticación.
