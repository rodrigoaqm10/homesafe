import Link from 'next/link';
import { DemoWorkspace } from '@/components/demo-workspace';
export default function Page() {
  return (
    <>
      <div className="legacy-banner">
        <Link href="/demo/administrador">
          ← Volver al espacio del administrador
        </Link>
        <span>
          Vista financiera conceptual · Datos de muestra independientes
        </span>
      </div>
      <DemoWorkspace />
    </>
  );
}
