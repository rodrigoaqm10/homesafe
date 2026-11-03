export const residentNavigation = [
  ['inicio', 'Mi hogar'],
  ['cuenta', 'Mi cuenta'],
  ['visitas', 'Mis visitas'],
  ['encomiendas', 'Mis encomiendas'],
  ['solicitudes', 'Mis solicitudes'],
  ['comunicados', 'Comunicados'],
] as const;
export const conciergeNavigation = [
  ['recepcion', 'Recepción'],
  ['visitas', 'Visitas y accesos'],
  ['encomiendas', 'Encomiendas'],
  ['solicitudes', 'Solicitudes'],
  ['bitacora', 'Bitácora de actividad'],
  ['comunicados', 'Comunicados'],
] as const;
export function portalSection(role: string, value: string | undefined) {
  const navigation =
    role === 'residente' ? residentNavigation : conciergeNavigation;
  return navigation.some(([id]) => id === value)
    ? (value as string)
    : navigation[0][0];
}
