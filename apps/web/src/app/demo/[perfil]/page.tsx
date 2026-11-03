import { notFound } from 'next/navigation';
import { RoleWorkspace } from '@/components/role-workspace';
import type { Role } from '@/modules/community/domain/demo-workflows';
export default async function Page({
  params,
}: {
  params: Promise<{ perfil: string }>;
}) {
  const { perfil } = await params;
  if (!['residente', 'conserje', 'administrador'].includes(perfil)) notFound();
  return <RoleWorkspace key={perfil} role={perfil as Role} />;
}
