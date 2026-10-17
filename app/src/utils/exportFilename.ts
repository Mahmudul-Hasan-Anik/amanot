/** Keep readable Bengali/English names, removing filesystem-reserved characters. */
export function exportFilename(parts: Array<string | number | undefined>, extension: 'pdf' | 'csv', now = new Date()): string {
  const clean = (value: string | number) => String(value).normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-').replace(/[-.]+$/g, '').replace(/^-+/g, '').slice(0, 60);
  const label = parts.filter((p): p is string | number => p !== undefined && String(p).trim() !== '')
    .map(clean).filter(Boolean).join('_');
  // Android/Linux limit a filename component by UTF-8 bytes, not characters.
  let shortLabel = '', bytes = 0;
  for (const character of label) {
    const code = character.codePointAt(0)!;
    const width = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes + width > 190) break;
    shortLabel += character; bytes += width;
  }
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `${shortLabel || 'Amanot'}_${timestamp}.${extension}`;
}
