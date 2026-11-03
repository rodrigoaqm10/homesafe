# Alcance y condiciones de entrega

## En esta primera base
- Portada editorial, tonos piedra, azul profundo, bronce y verde sobrio.
- Panel responsive, cinco secciones, buscador, modal accesible y ciclo de incidencias de muestra.
- Respeto de movimiento reducido, navegación por teclado, etiquetas y estados vacíos.
- Cabeceras de seguridad y contrato de autorización con pruebas.

## Próximas entregas
1. Supabase local y migraciones: perfiles, organizaciones, comunidades, unidades, membresías y roles múltiples. Restricciones compuestas para impedir relaciones entre tenants. RLS y pruebas con dos organizaciones.
2. Autenticación SSR, invitaciones, recuperación, MFA administrativo, sesiones y límites de intentos. Conectar autorización a identidad verificada.
3. Residentes, visitas, encomiendas, bitácora, incidencias persistentes, comunicados, reservas y documentos privados versionados.
4. Finanzas: reglas de prorrateo y redondeo, cargos, pagos, imputaciones, reversiones, fondos, conciliación y cierres. Webhooks firmados e idempotentes. Elegir pasarela antes de integración real.
5. Activos, QR, mantenimiento, proveedores, contratos y SLA.
6. Seguridad física, HomeSafe Connect, CCTV compatible, accesos, dispositivos y sensores; validar con hardware real.
7. Automatizaciones con outbox, reintentos e idempotencia. IA y RAG con permisos y evaluación de filtración de datos. Score e insights con metodología explícita.
8. Especificar y desarrollar personal, votaciones, marketplace, white-label y benchmarking: están en la visión, no tienen todavía especificación suficiente.
9. Staging separado de producción, monitoreo, pruebas de restauración, carga, accesibilidad, revisión independiente de seguridad, piloto y lanzamiento.

Aplicación móvil pospuesta por instrucción del usuario. Mantener contratos API preparados.

## Definición de terminado
Cada módulo requiere reglas documentadas, estados de carga/vacío/error/éxito, permisos comprobados en servidor y RLS, pruebas positivas y negativas, auditoría donde corresponda y validación de flujos reales. Una pantalla de muestra no cuenta como módulo terminado.

## Decisiones
Next.js/Supabase/Vercel prevalecen sobre hosting alternativo. No publicar esta base como producción. No usar datos personales reales hasta verificar aislamiento. Tipografía de sistema para evitar dependencias remotas; incorporar fuentes locales licenciadas al refinar identidad.
