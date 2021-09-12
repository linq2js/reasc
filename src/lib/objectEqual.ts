export function objectEqual(a: any, b: any) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  for (const k in a) {
    if (a[k] !== b[k]) return false;
  }
  for (const k in b) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
