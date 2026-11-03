export type Role = 'residente' | 'conserje' | 'administrador';
export type VisitStatus =
  | 'Autorizada'
  | 'Ingresada'
  | 'Finalizada'
  | 'Cancelada';
export type Visit = {
  id: string;
  name: string;
  unit: string;
  date: string;
  status: VisitStatus;
};
export type Parcel = {
  id: string;
  carrier: string;
  unit: string;
  status: 'Recibida' | 'Entregada';
};
export type Request = {
  id: string;
  title: string;
  unit: string;
  status: 'Pendiente' | 'En curso' | 'Resuelta';
};
export type Entry = { id: string; text: string; role: Role; at: string };
export type DemoState = {
  visits: Visit[];
  parcels: Parcel[];
  requests: Request[];
  entries: Entry[];
};
export const roleNames: Record<Role, string> = {
  residente: 'Residente',
  conserje: 'Conserje',
  administrador: 'Administrador',
};
export const demoUnit = 'A-502';
export function initialState(): DemoState {
  return {
    visits: [
      {
        id: 'visit-1',
        name: 'Visita de muestra',
        unit: demoUnit,
        date: '2026-11-05',
        status: 'Autorizada',
      },
      {
        id: 'visit-2',
        name: 'Técnico de muestra',
        unit: 'B-204',
        date: '2026-11-05',
        status: 'Ingresada',
      },
    ],
    parcels: [
      {
        id: 'parcel-1',
        carrier: 'Empresa de muestra',
        unit: demoUnit,
        status: 'Recibida',
      },
      {
        id: 'parcel-2',
        carrier: 'Correo de muestra',
        unit: 'B-204',
        status: 'Recibida',
      },
    ],
    requests: [
      {
        id: 'request-1',
        title: 'Revisar iluminación del pasillo',
        unit: demoUnit,
        status: 'Pendiente',
      },
      {
        id: 'request-2',
        title: 'Ajustar cierre de portón',
        unit: 'Áreas comunes',
        status: 'En curso',
      },
    ],
    entries: [],
  };
}
/** Demo rules only: production must derive role/unit from verified server identity. */
export function visitTransition(
  visit: Visit,
  next: VisitStatus,
  role: Role,
  unit: string,
): Visit {
  const operational = role === 'conserje' || role === 'administrador';
  const allowed =
    (next === 'Cancelada' &&
      visit.status === 'Autorizada' &&
      (role === 'administrador' ||
        (role === 'residente' && visit.unit === unit))) ||
    (operational &&
      ((visit.status === 'Autorizada' && next === 'Ingresada') ||
        (visit.status === 'Ingresada' && next === 'Finalizada')));
  if (!allowed)
    throw new Error(
      'La transición no está permitida para este perfil y estado.',
    );
  return { ...visit, status: next };
}
export function visibleRecords<T extends { unit: string }>(
  records: T[],
  role: Role,
  unit: string,
): T[] {
  return role === 'residente'
    ? records.filter((r) => r.unit === unit)
    : records;
}
export function validateVisit(name: string, date: string) {
  if (name.trim().length < 3 || name.trim().length > 80)
    throw new Error('Usa un nombre de muestra de entre 3 y 80 caracteres.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error('Selecciona una fecha válida.');
}
