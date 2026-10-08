const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPassword(
  value: string,
  minimumLength = 8,
): boolean {
  return value.length >= minimumLength;
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function getEmailError(value: string): string | undefined {
  if (!isRequired(value)) {
    return "Email is required.";
  }
  return isValidEmail(value) ? undefined : "Enter a valid email address.";
}

export function getPasswordError(
  value: string,
  minimumLength = 8,
): string | undefined {
  if (!isRequired(value)) {
    return "Password is required.";
  }
  return isValidPassword(value, minimumLength)
    ? undefined
    : `Password must be at least ${minimumLength} characters.`;
}
