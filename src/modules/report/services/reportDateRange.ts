/** Table requests show the first seven calendar days from the selected start date. */
export function tableDateRange(from: string, to: string): { from: string; to: string } {
  const start = new Date(`${from}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 6);
  const latest = start.toISOString().slice(0, 10);
  return { from, to: to < latest ? to : latest };
}

export function exceedsTableDateRange(from: string, to: string): boolean {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end - start > 6 * 86_400_000;
}
