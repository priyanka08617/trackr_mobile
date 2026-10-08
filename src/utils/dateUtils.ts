type DateValue = Date | string | number;

function toDate(value: DateValue): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date value.");
  }
  return date;
}

export function formatDate(
  value: DateValue,
  locale?: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value));
}

export function formatDateTime(value: DateValue, locale?: string): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toISOString(value: DateValue): string {
  return toDate(value).toISOString();
}
