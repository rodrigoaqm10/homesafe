import Link from 'next/link';
import { logout } from '@/app/acceso/actions';
import {
  conciergeNavigation,
  residentNavigation,
} from '@/modules/identity/domain/portal-navigation';
import type { Membership } from '@/modules/identity/infrastructure/session';
export function portalHref(member: Membership, section: string) {
  const base = '/portal/' + member.id;
  if (section === 'camaras' || section === 'bitacora')
    return base + '?seccion=' + section;
  return member.role === 'administrador'
    ? base + '?seccion=operaciones&operacion=' + section
    : base + '?seccion=' + section;
}
export function PortalShell({
  member,
  community,
  unit,
  section,
  title,
  subtitle,
  status,
  children,
}: {
  member: Membership;
  community: string;
  unit?: string;
  section: string;
  title: string;
  subtitle: string;
  status?: string;
  children: React.ReactNode;
}) {
  const resident = member.role === 'residente';
  const navigation = resident ? residentNavigation : conciergeNavigation;
  const profile = resident
    ? 'Residente'
    : member.role === 'administrador'
      ? 'Supervisión operativa'
      : 'Conserjería';
  return (
    <div
      className={
        'workspace live-role ' +
        (resident ? 'resident-workspace' : 'concierge-workspace')
      }
    >
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-symbol">H</span>
          <span>HOME SAFE</span>
        </Link>
        <div className="community-box">
          <span className="community-icon">LO</span>
          <span>
            {community}
            <small>
              {resident ? 'Mi unidad · ' + unit : 'Recepción y operación'}
            </small>
          </span>
        </div>
        <span className="sidebar-label">{profile.toUpperCase()}</span>
        <nav aria-label={'Módulos de ' + profile}>
          {navigation.map(([id, label]) => (
            <Link
              key={id}
              href={portalHref(member, id)}
              aria-current={section === id ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          {profile}
          <p>
            {resident ? 'Tu hogar, conectado.' : 'Cada turno, bien acompañado.'}
          </p>
          <Link href="/portal"> Mis accesos</Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <span>
            {community}
            <span className="muted">/</span>
            <strong>{resident ? unit : profile}</strong>
          </span>
          <div className="private-topnav">
            {member.role === 'administrador' && (
              <Link className="text-link" href={'/portal/' + member.id}>
                Administración
              </Link>
            )}
            <Link className="text-link" href="/portal">
              Mis accesos
            </Link>
            <form action={logout}>
              <button className="text-link" type="submit">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>
        <main className="workspace-content">
          <div className="page-top">
            <div>
              <span className="eyebrow">
                {resident
                  ? 'MI HOGAR · ACCESO PRIVADO'
                  : 'CONSERJERÍA · ACCESO PRIVADO'}
              </span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          {status === 'guardado' && (
            <p className="success-notice" role="status">
              El cambio se guardó correctamente.
            </p>
          )}
          {status === 'no_disponible' && (
            <p className="error-notice" role="alert">
              No se pudo completar la operación. Revisa los datos, la vigencia y
              el estado actual del registro.
            </p>
          )}
          {children}
          <footer className="workspace-footer">
            <span>Home Safe · {profile}</span>
            <Link href="/seguridad">Seguridad de mi cuenta</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
