export type BookingChatSafetyResult = {
  allowed: boolean;
  flags: string[];
  message?: string;
};

const rules: Array<{ flag: string; pattern: RegExp; message: string }> = [
  {
    flag: "phone_number",
    pattern: /(?:\+?\d[\s().-]*){8,}/,
    message: "Keep phone numbers inside Xoot's protected contact and masked-calling flows.",
  },
  {
    flag: "email_address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    message: "Keep email addresses inside your Xoot profile and support flows.",
  },
  {
    flag: "off_platform",
    pattern: /\b(whatsapp|telegram|signal|instagram|facebook|dm me|call me directly|pay me direct|cash|eft)\b/i,
    message: "Keep booking communication and payments on Xoot for safety and support.",
  },
  {
    flag: "access_code",
    pattern: /\b(gate|alarm|lockbox|keypad|pin|code|otp|password)\b/i,
    message: "Put access codes and private household notes in protected booking fields, not chat.",
  },
  {
    flag: "payment_secret",
    pattern: /\b(card number|cvv|cvc|bank password|bank login|one[-\s]?time pin)\b/i,
    message: "Never send payment or banking secrets in chat.",
  },
];

export const getBookingChatSafety = (value: string): BookingChatSafetyResult => {
  const text = value.trim();
  if (!text) return { allowed: false, flags: ["empty"], message: "Message cannot be empty." };

  const matches = rules.filter((rule) => rule.pattern.test(text));
  if (matches.length === 0) return { allowed: true, flags: [] };

  return {
    allowed: false,
    flags: matches.map((match) => match.flag),
    message: matches[0].message,
  };
};
