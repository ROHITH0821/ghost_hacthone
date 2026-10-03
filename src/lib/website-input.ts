/** UI validation only; the server crawler must still enforce network safety. */
export function normalizeWebsiteInput(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return null;
    return url.href;
  } catch { return null; }
}
export function safeAppRedirect(input: string | null): string {
  if (!input || !input.startsWith('/') || input.startsWith('//') || /[\\\u0000-\u001f]/.test(input)) return '/dashboard/overview';
  return input;
}
