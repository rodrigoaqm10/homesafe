export function parseVisitCode(value: string) {
  const id = value
    .trim()
    .replace(/^HOME-SAFE:/i, '')
    .toLowerCase();
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id) ? id : null;
}
export function visitCode(id: string) {
  return 'HOME-SAFE:' + id;
}
