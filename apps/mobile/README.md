# Home Safe móvil

Aplicación Expo para iOS y Android. Inicia sesión con las mismas cuentas de la web. La membresía verificada determina los accesos disponibles. Administración requiere el código TOTP configurado previamente en la web.

## Ejecutar

Desde esta carpeta:

    npm install
    npx expo start

Abre el proyecto con una versión compatible de Expo Go. Android Studio puede ejecutar un dispositivo virtual. La configuración local usa únicamente la URL y la clave pública de Supabase, copiadas de la web al archivo .env ignorado por Git.

## Primera entrega

Login, selección de accesos, consulta de información por rol, cuenta del residente, QR de visitas existentes, encomiendas, solicitudes, comunicados, dashboard administrativo y lectura de bitácora. Conserjería puede escribir anotaciones. Modo claro y oscuro. Liquid Glass nativo en equipos iOS compatibles y superficies opacas en Android.

Quedan pendientes los formularios móviles de visitas y solicitudes, lectura de QR desde la cámara, entrega de encomiendas, notificaciones push, comprobantes y pago conectado a la pasarela. La primera entrega no registra asistencia ni valida presencia física.

Para una futura asistencia, separar notas de bitácora de entrada/salida y relevo. Hora del servidor, turno asignado y prueba de presencia desde infraestructura del edificio. Conservar auditoría de correcciones y revisión administrativa. Una nota escrita desde el teléfono no acredita llegada.

## Verificación

    npm run typecheck
    npm run lint
    npx expo export --platform ios --platform android

El funcionamiento de Liquid Glass y el almacenamiento seguro necesitan validación en dispositivos reales.

## Estado de validación, 5 de noviembre de 2026

TypeScript y ESLint aprobados. Expo Doctor: 20/20. Exportación JavaScript/Hermes de iOS, Android y web aprobada; no equivale a una compilación nativa firmada ni a pruebas en teléfonos.

La auditoría de dependencias detecta cinco avisos moderados transitivos en las herramientas de Expo (glob y minimatch), sin avisos altos ni críticos en la auditoría de producción. Pendientes de actualización compatible; no se aplicó la degradación a SDK 52 sugerida por npm.

## Presencia y relevo: diseño pendiente

Cada persona utilizará su cuenta. Las notas deben conservar autor y hora del servidor; no acreditan asistencia. El futuro módulo de entrada/salida tendrá su propio registro, turno asignado y eventos de corrección auditados. Una confirmación de dos conserjes no impide la colusión. GPS, una red Wi-Fi o un QR compartible tampoco bastan por sí solos. Para mayor garantía se integrará un terminal fijo o control de acceso del edificio que registre la presencia de manera independiente; excepciones y discrepancias requieren revisión administrativa. No se activa todavía una función de marcación desde el móvil.
