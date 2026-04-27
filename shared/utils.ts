export function isJson(s: string): boolean {
  try { JSON.parse(s); return true } catch { return false }
}
