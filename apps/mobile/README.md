# Home Safe · app móvil

Expo SDK 58 para iOS y Android. Utiliza las mismas cuentas, comunidad y permisos que la web. Administración necesita MFA TOTP; el residente solo consulta su unidad.

## Abrir en Android

1. Abrir Android Studio → Device Manager.
2. Iniciar el dispositivo virtual, por ejemplo Medium Phone API 37.
3. Abrir PowerShell y ejecutar:

    cd "C:\Users\westk\OneDrive\Desktop\HomeSafeReal\apps\mobile"
    npx expo start --clear

4. Esperar el QR y pulsar A en esa terminal para abrir Android.

En un teléfono Android, instalar Expo Go compatible con SDK 58, conectar a la misma Wi-Fi y escanear el QR desde Expo Go. Si la red impide conectar, detener con Ctrl+C y usar npx expo start --tunnel. Para iPhone, usar la cámara para abrir el QR y la misma cuenta Expo en el teléfono y la CLI (npx expo login).

## Navegación y diseño

Cuatro accesos por perfil y Más en una barra inferior flotante. Menú adicional en la cabecera. Apariencia clara, oscura o automática, persistida en el teléfono. Iconos vectoriales, tipografía de sistema escalable, formularios separados y botones de al menos 48 px. Liquid Glass nativo en iOS compatible; Android utiliza una superficie opaca para conservar legibilidad.

## Funciones incorporadas

Residente: resumen de cuenta, cobros y saldos, pagos, descarga de comprobantes y envío al correo confirmado de la cuenta; autorización de visitas con fechas, patente y correo opcionales; visualización y compartir QR; cancelación de visitas autorizadas; consulta de encomiendas; creación y consulta de solicitudes; comunicados.

Conserjería: recepción con pendientes, visitas y confirmación de ingreso/salida; lectura de QR desde cámara y búsqueda manual; recepción y entrega de encomiendas; creación y seguimiento de solicitudes; escritura de bitácora y consulta por día; comunicados. En Pro: consulta de cámaras y registro de revisiones; borrador de resumen de turno con IA.

Administración: dashboard, cobros, abonos manuales, reversos con motivo, egresos y anulaciones; exportación PDF y Excel de todo el historial; unidades y edición de nombres; residentes y edición de contacto/relaciones; publicación de comunicados; solicitudes, visitas, encomiendas, auditoría y bitácora. En Pro: registro de cámaras, revisiones y resumen de turno.

El acceso de pago del residente informa que la pasarela todavía no está conectada. No registra pagos ficticios ni marca cobros como pagados al pulsarlo.

Los comprobantes son internos de Home Safe; no son documentos tributarios emitidos por el SII. Correo e IA dependen de la configuración y cuota de sus proveedores.

## Servicios y privacidad

Las operaciones usan RLS y RPC existentes. POST /api/mobile/services verifica token con Supabase, membresía activa y MFA administrativo. No utiliza service_role. Los tokens no se incluyen en URLs. Los documentos se descargan con Authorization y se eliminan del caché al cerrar el diálogo de compartir. No se almacenan claves SMTP/OpenAI en el móvil.

El correo de la visita se usa para enviar su autorización; no se añade a la tabla de visitas. Normal oculta cámaras e IA; la base y el servidor también bloquean esos accesos sin Pro.

La bitácora no acredita asistencia. Falta integrar una fuente de presencia independiente del edificio antes de habilitar marcaciones o relevos.

## Validación de esta revisión

TypeScript y ESLint, seis pruebas de validación móvil, veinte pruebas web, compilación Next, exportación Hermes para iOS/Android y Expo Doctor 20/20. Pruebas SQL locales de permisos, finanzas, edición, bitácora y CCTV aprobadas. Servicio HTTP comprobado con sesión ausente, token inválido, JSON incorrecto y tamaño excesivo. Revisión visual del acceso y menú de apariencia en navegador.

No equivale a una prueba de extremo a extremo con los tres usuarios reales en teléfonos ni a una compilación firmada. Cámara real, Liquid Glass, fechas, compartir archivos y almacenamiento seguro necesitan validación nativa. Persisten avisos moderados transitivos en herramientas de Expo; no se aplicaron degradaciones incompatibles.

## Pendientes antes de publicar en tiendas

Conexión y conciliación de pasarela de pago, notificaciones push, integración NVR/video, fuente de presencia para asistencia, pruebas nativas de los tres perfiles, revisión de seguridad independiente, firma y distribución mediante EAS/TestFlight/Google Play. La IA existente genera borradores de turno; no analiza imágenes ni identifica personas.

## Comprobaciones

    npm test
    npm run typecheck
    npm run lint
    npx expo-doctor
    npx expo export --platform all
