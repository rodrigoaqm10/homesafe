import Link from 'next/link';
import { logout } from '@/app/acceso/actions';
import { roleNames } from '@/modules/community/domain/demo-workflows';
import {
  type Membership,
  requireIdentity,
} from '@/modules/identity/infrastructure/session';
export const metadata = { title: 'Mis comunidades' };
export default async function Portal() {
  const { client } = await requireIdentity();
  const { data, error } = await client
    .from('community_memberships')
    .select('id,organization_id,community_id,profile_id,role,unit_id,status')
    .eq('status', 'active');
  const members = (data ?? []) as Membership[];
  return (
    <main className="profile-picker">
      <header className="picker-header">
        <Link className="brand" href="/">
          HOMESAFE REAL
        </Link>
        <form action={logout}>
          <button className="text-link" type="submit">
            Cerrar sesión ↗
          </button>
        </form>
      </header>
      <section className="picker-intro">
        <span className="eyebrow">ACCESO VERIFICADO</span>
        <h1>
          Tu comunidad.
          <br />
          <em>Tu espacio.</em>
        </h1>
        <p>
          Estos son los accesos asignados a tu cuenta. La administración
          requiere verificación en dos pasos.
        </p>
      </section>
      {error ? (
        <section className="panel">
          <h2>Estamos preparando tu comunidad.</h2>
          <p className="panel-note">
            La conexión de usuarios está disponible. Falta completar la
            configuración de datos y permisos de HomeSafe.
          </p>
        </section>
      ) : members.length === 0 ? (
        <section className="panel">
          <h2>Tu cuenta aún no tiene una comunidad.</h2>
          <p className="panel-note">
            Solicita a la administración que asigne tu membresía. No puedes
            asignarte un perfil desde esta pantalla.
          </p>
        </section>
      ) : (
        <div className="profile-grid">
          {members.map((m) => (
            <Link className="profile-card" href={`/portal/${m.id}`} key={m.id}>
              <span className="small-label">MEMBRESÍA ACTIVA</span>
              <h2>{roleNames[m.role] ?? 'Comunidad'}</h2>
              <p>Acceso asignado a tu comunidad.</p>
              <span className="profile-enter">Abrir mi espacio ↗</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
