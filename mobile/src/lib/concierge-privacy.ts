const stripUnsafeCharacters = (value: string) =>
  value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === '<' || character === '>' || character === '`' || character === '\\' ? ' ' : character;
    })
    .join('');

const sensitivePatterns: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /(?:\+?\d[\d\s().-]{6,}\d)\b/g,
  /\b\d{13}\b/g,
  /\b(?:\d[ -]*?){13,19}\b/g,
  /\b(?:gate|access|lockbox|alarm|door|garage|parking)\s*(?:code|pin|password|passcode)?\s*(?:is|:|-)?\s*[A-Z0-9#*-]{3,}\b/gi,
  /\b(?:password|passcode|otp|one[-\s]?time code|verification code|private key|service role)\s*(?:is|:|-)?\s*\S+/gi,
  /\b(?:api[_\s-]?key|secret|token)\s*(?:is|:|-)?\s*[\w._~:/+=-]{8,}\b/gi,
  /\b(?:sk|sbp|sb_secret|cfat|figd|cr)-[A-Za-z0-9._-]{8,}\b/g,
];

export const redactConciergeClientText = (value: unknown, maxLength = 900) => {
  if (typeof value !== 'string') return '';

  const normalised = stripUnsafeCharacters(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return sensitivePatterns.reduce((text, pattern) => text.replace(pattern, '[redacted]'), normalised);
};
