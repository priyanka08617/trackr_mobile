/** Remove transport padding before the header and emit exactly one Excel UTF-8 BOM. */
export function prepareReportCsv(csv: string): string {
  const content = csv
    .replace(/^(?:[\uFEFF \t]*(?:\r\n|\n|\r))+/, "")
    .replace(/^\uFEFF+/, "");
  return `\uFEFF${content}`;
}
