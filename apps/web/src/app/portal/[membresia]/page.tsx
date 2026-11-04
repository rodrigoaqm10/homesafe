import { redirect } from 'next/navigation';
import { AdminPortal } from '@/components/admin-portal';
import { CameraPortal } from '@/components/camera-portal';
import { DailyLogbook } from '@/components/daily-logbook';
import { MemberPortal } from '@/components/member-portal';
import { hasCommunityPro } from '@/modules/identity/infrastructure/community-plan';
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
  const { client, member } = await requireMembership(membresia);
  const hasPro =
    member.role !== 'residente' && (await hasCommunityPro(client, member));
  const { dia, pagina, estado, seccion, operacion } = await searchParams;
  if (
    member.role !== 'residente' &&
    (seccion === 'bitacora' ||
      (seccion === 'operaciones' && operacion === 'bitacora'))
  )
    return (
      <DailyLogbook
        hasPro={hasPro}
        member={member}
        status={estado}
        day={dia}
        page={pagina}
      />
    );
  if (seccion === 'camaras' || operacion === 'camaras') {
    if (!hasPro) redirect('/portal/' + member.id);
    return <CameraPortal member={member} status={estado} />;
  }
  if (member.role === 'administrador' && seccion !== 'operaciones')
    return (
      <AdminPortal
        hasPro={hasPro}
        member={member}
        section={seccion ?? 'inicio'}
        status={estado}
      />
    );
  return (
    <MemberPortal
      hasPro={hasPro}
      member={member}
      section={member.role === 'administrador' ? operacion : seccion}
      status={estado}
    />
  );
}
