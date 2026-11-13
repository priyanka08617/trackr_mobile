import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getReportExportEndpoint(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/common/report_bank_export.php`;
}

async function getReportExportToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

// ==============================================
// EXPORT
// ==============================================

export async function exportAreaReport(
  reportName: string,
  fromDate: string,
  toDate: string,
): Promise<{ csv: string; filename: string }> {
  const ENDPOINT = await getReportExportEndpoint();
  let token = await getReportExportToken();

  const body = new URLSearchParams({
    report_name: reportName,
    from_date: fromDate,
    to_date: toDate,
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(ENDPOINT, {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "text/csv, application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            Authorization: `Bearer ${token}`,
          },
          body,
          signal: controller.signal,
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error("Report export timed out. Please retry.");
        }
        throw new Error("Could not reach the report export API.");
      }

      const content = await response.text();
      const contentType = response.headers.get("content-type") ?? "";

      // Retry once on 401 with a fresh token.
      if (response.status === 401 && attempt === 0) {
        // Only retry if the response looks like a token error, not a CSV.
        if (!/text\/csv/i.test(contentType)) {
          const refreshed = await getAuthToken();
          if (refreshed) {
            token = refreshed;
            continue;
          }
        }
      }

      // Success path — CSV body.
      if (
        response.ok &&
        !response.redirected &&
        /text\/csv/i.test(contentType)
      ) {
        const disposition =
          response.headers.get("content-disposition") ?? "";
        const filename =
          disposition
            .match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1]
            ?.replace(/^"|"$/g, "") ??
          `${reportName}-${fromDate}-to-${toDate}.csv`;

        return { csv: content, filename };
      }

      // Error path — try JSON message first.
      let message = "";
      try {
        const payload = JSON.parse(content.replace(/^\uFEFF/, "")) as {
          message?: string;
        };
        message = payload.message ?? "";
      } catch {
        /* The server may return plain text for export errors. */
      }
      if (message) throw new Error(message);

      if (
        response.redirected ||
        /<\s*(?:!doctype\s+html|html\b)/i.test(content)
      ) {
        throw new Error(
          "Sign in to your area manager account and try again.",
        );
      }

      throw new Error(`Report export failed (HTTP ${response.status}).`);
    }

    throw new Error(
      "Unable to authenticate the report export request. Sign in again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}