export const EMAIL_PATTERN =
  /^(?!.*\.\.)([A-Z0-9._%+-]+)@([A-Z0-9-]+\.)+[A-Z]{2,}$/i;

export const isValidEmail = (value) =>
  EMAIL_PATTERN.test(String(value || "").trim());

export const sanitizeLeadingWhitespace = (value) =>
  String(value || "").replace(/^\s+/g, "");
