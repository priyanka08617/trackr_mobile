import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { trackerPlainText } from "./trackerText";

export interface ReportBankItem {
  id: number;
  applicable_for: string;
  function_type: string;
  report_link: string;
  available_in_report_bank: string;
  frequency_to_check_the_report: string;
}

interface ReportBankResponse {
  success: boolean;
  message?: string;
  reports?: ReportBankItem[];
}

export async function loadReportBank(): Promise<ReportBankItem[]> {
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to view store contacts.");
  }

  // The company API URL already ends in /api/v1.
  const endpoint = `${baseUrl}/common/report_bank_areamanager.php`;

  let response: Response;
  let body: string;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    body = await response.text();
  } catch {
    throw new Error("Could not reach the Report Bank API.");
  }

  if (response.status === 401) {
    throw new Error(
      "Your login token has expired or is invalid. Please log in again.",
    );
  }

  if (response.status === 404) {
    throw new Error(`Report Bank API not found (HTTP 404) at ${endpoint}.`);
  }

  let payload: ReportBankResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    if (response.status === 403) {
      throw new Error("You are not authorized to view the Report Bank.");
    }

    throw new Error(
      `Report Bank API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (response.status === 403) {
    throw new Error(
      message || "You are not authorized to view the Report Bank.",
    );
  }

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.reports)
  ) {
    throw new Error(
      message || `Unable to load the Report Bank (HTTP ${response.status}).`,
    );
  }

  return payload.reports.map((item) => ({
    id: Number(item.id),
    applicable_for: trackerPlainText(item.applicable_for ?? ""),
    function_type: trackerPlainText(item.function_type ?? ""),
    report_link: (item.report_link ?? "").trim(),
    available_in_report_bank: trackerPlainText(
      item.available_in_report_bank ?? "",
    ),
    frequency_to_check_the_report: trackerPlainText(
      item.frequency_to_check_the_report ?? "",
    ),
  }));
}
