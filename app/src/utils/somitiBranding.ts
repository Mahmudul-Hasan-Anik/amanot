/** The editable registered name is authoritative; legacy translations may be stale. */
export function somitiName(info: {name?: string; nameEn?: string}, fallback: string): string {
  return info.name?.trim() || info.nameEn?.trim() || fallback;
}
