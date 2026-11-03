/** Convert a Santiago wall time to UTC, rejecting nonexistent/ambiguous DST times. */
export function santiagoToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Fecha inválida');
  const desired = Date.parse(`${value}:00Z`);
  if (
    !Number.isFinite(desired) ||
    new Date(desired).toISOString().slice(0, 16) !== value
  )
    throw new Error('Fecha inválida');
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  function wall(timestamp: number) {
    const parts = Object.fromEntries(
      format.formatToParts(new Date(timestamp)).map((p) => [p.type, p.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }
  let candidate = desired;
  for (let i = 0; i < 3; i++) {
    const rendered = Date.parse(`${wall(candidate)}:00Z`);
    candidate += desired - rendered;
  }
  if (
    wall(candidate) !== value ||
    wall(candidate - 3600000) === value ||
    wall(candidate + 3600000) === value
  )
    throw new Error(
      'Horario ambiguo por cambio de hora. Selecciona otro horario.',
    );
  return new Date(candidate).toISOString();
}
