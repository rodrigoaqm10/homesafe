# Entrega administrativa y publicación

Fecha: 3 de noviembre de 2026.

- Sitio: https://homesafe-real.vercel.app
- Código: https://github.com/rodrigoaqm10/homesafe
- Vercel: proyecto homesafe-real, raíz apps/web, GitHub conectado.
- Entrar por /acceso y abrir la membresía administrativa. La demo sigue siendo un recorrido ficticio.
- Inicio administrativo separado de conserjería: visión general, finanzas, unidades y residentes, auditoría y supervisión operativa.
- Finanzas: cargos por unidad/período, pagos parciales manuales, referencia única, reversión, gastos y anulación. No integra una pasarela ni ejecuta transacciones bancarias.
- Migraciones 002 y 003 confirmadas como aplicadas por el titular.
- PostgreSQL local: pruebas RLS y financieras correctas, incluidos sobrepago, duplicados, reversión, MFA y acceso por rol.
- Aplicación: 20 pruebas, comprobación de tipos, lint sin errores y compilación correctos.
- GitHub Actions: Web checks completado correctamente.
- Público: portada y acceso HTTP 200 con HTTPS, CSP y X-Frame-Options DENY. Pantalla de 390 px sin desbordamiento horizontal de documento.
- No se completó un ingreso autenticado en el navegador del agente porque la sesión del usuario no estaba disponible; la contraseña y el código MFA deben introducirlos el titular.
- Documentos: resumen funcional de 3 páginas y manual técnico de 26 páginas; páginas renderizadas e inspeccionadas. El manual editable está en docs/Manual_Tecnico_Base_de_Datos.md.

Pendientes del alcance completo: contabilidad formal, conciliación, prorrateos, presupuestos, pasarela, archivos privados, reservas, mantenimiento, contratos, integraciones e IA. La aplicación móvil permanece pospuesta.
