export function capitalizeWords(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function getInitials(value: string, maximumLength = 2): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, maximumLength)
    .map((word) => Array.from(word)[0]?.toLocaleUpperCase() ?? "")
    .join("");
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
