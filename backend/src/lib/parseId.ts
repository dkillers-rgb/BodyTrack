export function parseClientId(param: string | string[]): number | null {
  const id = parseInt(String(param), 10);
  if (Number.isNaN(id) || id < 1) return null;
  return id;
}
