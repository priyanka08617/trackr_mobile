const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["\u00e2\u20ac\u201d", "\u2014"],
  ["\u00e2\u20ac\u201c", "\u2013"],
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u2122", "\u2019"],
  ["\u00e2\u20ac\u02dc", "\u2018"],
  ["\u00e2\u20ac\u0153", "\u201c"],
  ["\u00e2\u20ac\ufffd", "\u201d"],
  ["\u00e2\u20ac\u00a2", "\u2022"],
  ["\u00e2\u201a\u00b9", "\u20b9"],
  ["\u00e2\u201a\u00ac", "\u20ac"],
  ["\u00c3\u2014", "\u00d7"],
  ["\u00c2\u00b7", "\u00b7"],
  ["\u00c2\u00b0", "\u00b0"],
  ["\u00c2\u00a9", "\u00a9"],
  ["\u00c2\u00ae", "\u00ae"],
  ["\u00c2\u00b1", "\u00b1"],
  ["\u00c2\u00a0", " "],
];

export function normalizeTrackerText(value: string): string {
  return MOJIBAKE_REPLACEMENTS.reduce(
    (text, [broken, corrected]) => text.replaceAll(broken, corrected),
    value,
  );
}

export function trackerPlainText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  const source = typeof value === "object" ? JSON.stringify(value) : String(value);
  const decoded = source
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|mdash|ndash|hellip|rsquo|lsquo|rdquo|ldquo|bull|trade|copy|reg|deg|plusmn|euro|pound|yen|times|divide);/gi, (entity, code: string) => {
      const normalized = code.toLowerCase();
      if (normalized.startsWith("#x")) {
        const point = parseInt(normalized.slice(2), 16);
        return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      }
      if (normalized.startsWith("#")) {
        const point = parseInt(normalized.slice(1), 10);
        return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      }
      const named: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", rsquo: "\u2019",
        lsquo: "\u2018", rdquo: "\u201d", ldquo: "\u201c", bull: "\u2022",
        trade: "\u2122", copy: "\u00a9", reg: "\u00ae", deg: "\u00b0",
        plusmn: "\u00b1", euro: "\u20ac", pound: "\u00a3", yen: "\u00a5",
        times: "\u00d7", divide: "\u00f7",
      };
      return named[normalized] ?? entity;
    })
    .replace(/<[^>]*>/g, " ");
  return normalizeTrackerText(decoded).replace(/\s+/g, " ").trim();
}

export function isPickerCancellation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return /cancel|dismiss|abort/i.test(String(error));
  }
  const value = error as { code?: unknown; message?: unknown; name?: unknown };
  return /cancel|dismiss|abort/i.test(
    [value.code, value.message, value.name].map(String).join(" "),
  );
}
