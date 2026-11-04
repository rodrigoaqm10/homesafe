import { AdminPortal } from '@/components/admin-portal';
import { CameraPortal } from '@/components/camera-portal';
import { MemberPortal } from '@/components/member-portal';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export const metadata = { title: 'Mi comunidad' };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ membresia: string }>;
  searchParams: Promise<{
    estado?: string;
    seccion?: string;
    operacion?: string;
  }>;
}) {
  const { membresia } = await params;
  const { member } = await requireMembership(membresia);
  const { estado, seccion, operacion } = await searchParams;
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
