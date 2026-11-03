# HomeSafe Real

Plataforma de gestión residencial con experiencias de residente, conserje y administrador.

## Aplicación web

Next.js y TypeScript. La aplicación está en `apps/web`.

```sh
cd apps/web
npm ci
npm run dev
```

Copia `.env.example` a `.env.local` y configura la URL y clave pública del proyecto Supabase. No uses una clave secreta o service role para la aplicación. `APP_ORIGIN` solo es necesario para una URL de desarrollo local explícita; en producción las cookies son Secure por defecto.

## Acceso

- `/`: presentación.
- `/demo`: experiencias con datos ficticios en memoria.
- `/acceso`: inicio de sesión real.
- `/portal`: membresías asignadas.
- `/portal/[membresia]`: espacio privado. Administración requiere MFA y dispone de finanzas, registros, auditoría y supervisión operativa.

Registrar una persona residente no crea una cuenta ni una membresía. La asignación inicial de accesos debe realizarla un administrador autorizado del proyecto.

## Base de datos

Aplicar en orden las tres migraciones de `supabase/migrations`. Activan RLS, relaciones por cliente/comunidad, funciones transaccionales, auditoría y finanzas manuales. Las referencias de recibo son únicas por comunidad; los abonos no se editan ni se borran desde la API. Las correcciones son reversiones.

`supabase/tests/bootstrap-local.sql` emula Auth únicamente en PostgreSQL QA. Nunca ejecutarlo en Supabase. `rls.sql` y `finance.sql` usan datos de pruebas y revierten la transacción; no ejecutarlos contra producción.

## Comprobación

```sh
npm run typecheck
npm test
npm run lint -- --diagnostic-level=error
npm run build
npm audit
```

## Despliegue

Vercel: framework Next.js, raíz `apps/web`, instalación `npm ci`, build `npm run build`. Variables de producción: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No subir `.env.local`, sesiones de Vercel, provisión personal ni secretos al repositorio. Configurar staging con un proyecto Supabase distinto antes de usar previews con datos reales.

## Alcance actual

Usuarios y membresías, visitas, encomiendas, incidencias, comunicados; registros de unidades y personas; cobros por unidad, abonos manuales, reversiones, gastos y auditoría. No procesa tarjetas ni ejecuta movimientos bancarios. La contabilidad completa, pasarela, prorrateos, conciliación, reservas, archivos privados, mantenimiento e integraciones siguen pendientes.

Los documentos técnicos describen el modelo actual, no todas las funciones futuras de la visión de producto. No existe garantía de ausencia total de vulnerabilidades; antes del lanzamiento comercial se requieren revisión independiente, restauración de respaldos, monitoreo y pruebas operativas.
