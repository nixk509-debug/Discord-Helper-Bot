export function parseHexColor(input?: string | null) {
  if (!input?.trim()) return null;
  const value = input.trim().replace(/^#/, "");
  if (!/^[a-f0-9]{6}$/i.test(value)) return null;
  return parseInt(value, 16);
}
