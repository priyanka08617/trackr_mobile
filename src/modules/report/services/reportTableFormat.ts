import { trackerPlainText } from "./trackerText";

function normalizedKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
}

function stageField(key: string): { stage: number; order: number } | undefined {
  const match =
    /^s(\d+)_(name|emp_name|employee_name|created_on|created_at)$/.exec(
      normalizedKey(key),
    );
  return match
    ? { stage: Number(match[1]), order: /name$/.test(match[2]) ? 0 : 1 }
    : undefined;
}

export function trackerTableRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const explicitNames = new Set(
    Object.keys(row).flatMap((key) => {
      const stage = stageField(key);
      return stage?.order === 0 ? [stage.stage] : [];
    }),
  );
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizedKey(key);
    if (normalized === "store_id" || normalized === "storeid") continue;
    const name = /^(?:main_)?s(\d+)(?:_emp(?:loyee)?_?code)?$/.exec(normalized);
    if (name) {
      if (!explicitNames.has(Number(name[1])))
        result[`S${name[1]} Name`] = value;
      continue;
    }
    const timestamp = /^main_s(\d+)_(created_on|created_at)$/.exec(normalized);
    if (timestamp) {
      result[`S${timestamp[1]} Created On`] = value;
      continue;
    }
    // Monthly global-count uses creator/verifier aliases for the same stages.
    if (normalized === "created_by" && !explicitNames.has(1)) {
      result["S1 Name"] = value;
    } else if (normalized === "verified_by" && !explicitNames.has(2)) {
      result["S2 Name"] = value;
    } else if (
      normalized === "created_on" &&
      Object.keys(row).some((field) => normalizedKey(field) === "created_by")
    ) {
      result["S1 Created On"] = value;
    } else if (
      (normalized === "verified_on" || normalized === "verified_n") &&
      Object.keys(row).some((field) => normalizedKey(field) === "verified_by")
    ) {
      result["S2 Created On"] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function reportTableColumns(rows: Record<string, unknown>[]): string[] {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  ).filter(
    (key) =>
      !/^(id|store_id|storeid|dt_row_id|sl|s_no|sr_no|serial_no|serial_number|s\d+(?:_emp(?:loyee)?_?code)?)$/.test(
        normalizedKey(key),
      ),
  );
  const details = columns.filter((key) => !stageField(key));
  const stages = columns
    .filter((key) => stageField(key))
    .sort((left, right) => {
      const a = stageField(left)!;
      const b = stageField(right)!;
      return a.stage - b.stage || a.order - b.order;
    });
  return [...details, ...stages];
}

export function reportTableLabel(key: string): string {
  const normalized = normalizedKey(key);
  const stage = stageField(key);
  if (stage)
    return `S${stage.stage} ${stage.order === 0 ? "Name" : "Created On"}`;
  if (normalized === "verified_n") return "Verified On";
  return normalized
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export function reportTableValue(key: string, value: unknown): string {
  const text = trackerPlainText(value);
  const normalized = normalizedKey(key);
  if (
    !/(^|_)(date|created_on|created_at|verified_on|verified_n|updated_on|updated_at)($|_)/.test(
      normalized,
    )
  )
    return text;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(text);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}${iso[4].replace(/^T/, " ")}`;
  const named = /^(\d{1,2})[\s-]+([a-z]+)[,\s-]+(\d{4}|\d{2})(.*)$/i.exec(text);
  if (named) {
    const month = MONTHS.indexOf(named[2].slice(0, 3).toLowerCase()) + 1;
    if (month) {
      const year = named[3].length === 2 ? `20${named[3]}` : named[3];
      return `${named[1].padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}${named[4]}`;
    }
  }
  return text;
}
