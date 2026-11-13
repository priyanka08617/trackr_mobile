import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { trackerPlainText } from "../../report/services/trackerText";

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
  console.log("Report Bank service started");

  // STEP 1: Get selected company
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // STEP 2: Get access token
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  // STEP 3: Build company-specific endpoint
  // Company api_url already ends in /api/v1
  const baseUrl = company.api_url.replace(/\/+$/, "");

  const endpoint = `${baseUrl}/common/report_bank_areamanager.php`;

  console.log("Report Bank API URL:", endpoint);

  // STEP 4: Call company PHP API
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Report Bank HTTP status:", response.status);
  } catch {
    throw new Error("Could not reach the Company Report Bank API.");
  }

  // STEP 5: Read response
  const body = await response.text();

  let payload: ReportBankResponse;

  try {
    payload = JSON.parse(body.replace(/^\uFEFF/, "")) as ReportBankResponse;
  } catch {
    throw new Error(
      `Report Bank API returned invalid JSON (HTTP ${response.status}). Check the PHP API response.`,
    );
  }

  // STEP 6: Validate authentication
  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error(
      payload.message || "You are not authorized to access the Report Bank.",
    );
  }

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.reports)
  ) {
    throw new Error(
      payload.message ||
        `Unable to load Report Bank (HTTP ${response.status}).`,
    );
  }

  // STEP 7: Prepare report data
  return payload.reports.map((item) => ({
    id: Number(item.id),

    applicable_for: trackerPlainText(item.applicable_for || ""),

    function_type: trackerPlainText(item.function_type || ""),

    report_link: String(item.report_link || "").trim(),

    available_in_report_bank: trackerPlainText(
      item.available_in_report_bank || "",
    ),

    frequency_to_check_the_report: trackerPlainText(
      item.frequency_to_check_the_report || "",
    ),
  }));
}
