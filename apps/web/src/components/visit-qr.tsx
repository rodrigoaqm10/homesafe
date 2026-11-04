'use client';
import { useRef, useState } from 'react';
import {
  parseVisitCode,
  visitCode,
} from '@/modules/community/domain/visit-code';

export function VisitQr({ id }: { id: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  return (
    <details
      className="visit-code"
      onToggle={async (event) => {
        if (!event.currentTarget.open || !canvas.current) return;
        try {
          const qr = await import('qrcode');
          if (canvas.current)
            await qr.toCanvas(canvas.current, visitCode(id), { width: 220 });
        } catch {
          setFailed(true);
        }
      }}
    >
      <summary>Mostrar QR de la visita</summary>
      <canvas ref={canvas} aria-label="Código QR de la autorización" />
      {failed && <p>No se pudo mostrar el QR. Usa el código manual.</p>}
      <p>
        Código manual: <code>{id}</code>
      </p>
    </details>
  );
}

export function VisitLookup({
  actionPath,
  admin,
  code,
}: {
  actionPath: string;
  admin: boolean;
  code?: string;
}) {
  const [value, setValue] = useState(code ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form method="get" action={actionPath} className="secure-form visit-lookup">
      <input
        type="hidden"
        name="seccion"
        value={admin ? 'operaciones' : 'visitas'}
      />
      {admin && <input type="hidden" name="operacion" value="visitas" />}
      <label>
        Buscar por QR o código de visita
        <input
          name="codigo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={64}
          required
          autoComplete="off"
        />
      </label>
      <label>
        Fotografiar o cargar el QR
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage('');
            try {
              const bitmap = await createImageBitmap(file);
              const scale = Math.min(
                1,
                1200 / Math.max(bitmap.width, bitmap.height),
              );
              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, Math.round(bitmap.width * scale));
              canvas.height = Math.max(1, Math.round(bitmap.height * scale));
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                bitmap.close();
                throw new Error('CANVAS_UNAVAILABLE');
              }
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close();
              const { data, width, height } = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const { default: scan } = await import('jsqr');
              const decoded = parseVisitCode(
                scan(data, width, height)?.data ?? '',
              );
              if (!decoded) throw new Error('INVALID_QR');
              setValue(decoded);
              setMessage('Código leído. Pulsa Buscar visita.');
            } catch {
              setMessage(
                'No se pudo leer el QR. Prueba con otra foto o ingresa el código manual.',
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {message && <p role="status">{message}</p>}
      <button type="submit" className="button primary" disabled={busy}>
        Buscar visita
      </button>
    </form>
  );
}
