export function clpAmount(raw: string): string {
  if (!/^[1-9][0-9]{0,12}$/.test(raw) || BigInt(raw) > BigInt('9000000000000'))
    throw new Error('INVALID_CLP');
  return raw;
}
export function money(raw: bigint | string | number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(BigInt(raw));
}
