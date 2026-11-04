import { AdminPortal } from '@/components/admin-portal';
import { CameraPortal } from '@/components/camera-portal';
import { DailyLogbook } from '@/components/daily-logbook';
import { MemberPortal } from '@/components/member-portal';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export const metadata = { title: 'Mi comunidad' };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ membresia: string }>;
  searchParams: Promise<{
    dia?: string;
    pagina?: string;
    estado?: string;
    seccion?: string;
    operacion?: string;
  }>;
}) {
  const { membresia } = await params;
  const { member } = await requireMembership(membresia);
  const { dia, pagina, estado, seccion, operacion } = await searchParams;
  if (
    member.role !== 'residente' &&
    (seccion === 'bitacora' ||
      (seccion === 'operaciones' && operacion === 'bitacora'))
  )
    return (
      <DailyLogbook member={member} status={estado} day={dia} page={pagina} />
    );
  if (seccion === 'camaras' && member.role !== 'residente')
    return <CameraPortal member={member} status={estado} />;
  if (member.role === 'administrador' && seccion !== 'operaciones')
    return (
      <AdminPortal
        member={member}
        section={seccion ?? 'inicio'}
        status={estado}
      />
    );
  return (
    <MemberPortal
      member={member}
      section={member.role === 'administrador' ? operacion : seccion}
      status={estado}
    />
  );
}
