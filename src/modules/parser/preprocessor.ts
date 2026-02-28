export function preprocessResumeText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/•\s*/g, '• ')
    .replace(/([.!?])\s*([A-Z])/g, '$1\n$2')
    .trim();
}

export function truncateToTokenLimit(text: string, maxTokens: number = 6000): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  const start = text.slice(0, Math.floor(maxChars * 0.7));
  const end = text.slice(-Math.floor(maxChars * 0.3));
  return `${start}\n\n[...content truncated...]\n\n${end}`;
}
