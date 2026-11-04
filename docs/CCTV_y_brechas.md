# Cámaras y alcance pendiente

HomeSafe registra el inventario y las observaciones de cámaras. Los estados se verifican manualmente en el equipo del edificio y se muestran con fecha y hora. El portal no recibe señal de video ni valida conectividad del grabador todavía.

| Perfil | Permisos en esta fase |
| --- | --- |
| Conserjería | Consultar inventario e historial de su comunidad y registrar novedades del turno. |
| Administración | Lo anterior y alta de cámaras de áreas comunes. Requiere MFA. |
| Residente y visitante | Sin acceso al inventario, las observaciones ni las imágenes. |

Supabase aplica el aislamiento por comunidad, conserva quién registró cada observación y bloquea editar o eliminar el historial desde cuentas del portal. La aplicación no pide claves, direcciones de cámaras ni enlaces de video.

Para conectar el video necesitamos marca y modelo del grabador instalado. El grabador conserva las grabaciones y HomeSafe Connect se ejecutaría en la red privada del edificio. Antes de habilitar imágenes, definir permisos separados para vivo, grabaciones y exportación; registrar accesos a imágenes; acordar retención y validar con el equipo real. Recomendación: conserjería mira en vivo durante su turno; administración revisa imágenes solo cuando su autorización y una necesidad operativa lo justifiquen. Nada de eso está habilitado todavía.

Otras brechas identificadas en los documentos de producto y arquitectura: reservas, documentos privados, activos y mantenimiento, control físico de accesos y sensores, bitácora con cierre de turno, conciliación y pago en línea. La visión también contempla automatizaciones, votaciones, IA e integraciones. El avance de cámaras no completa esos módulos.
