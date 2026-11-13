import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

const PAGE_SIZE = 50;

export type OmniReturnStatus = "pending" | "complete";

export interface OmniReturnRecord {
  id: number;
  month: string;
  site_code: string;
  store_name: string;
  region: string;
  zone: string;
  order_id: string;
  market_place: string;
  store_delivery_date: string;
  awb_status: string;
  delivery_remark: string;
  ho_final_remark: string;
  store_remark: string;
  submitted_by: string;
  submitted_on: string;
  status: number;
}

export interface OmniReturnPage {
  records: OmniReturnRecord[];
  total: number;
  limit: number;
  offset: number;
}

interface OmniReturnResponse {
  success?: boolean;
  message?: string;
  records?: OmniReturnRecord[];
  total?: number | string | null;
  limit?: number | string | null;
  offset?: number | string | null;
}

async function requestOmniReturns(
  filename: string,
  params: URLSearchParams,
  accept: string,
  action: string,
) {
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to access Omni Returns.");
  }

  // The saved company API URL already ends in /api/v1.
  const endpoint = `${baseUrl}/common/${filename}?${params.toString()}`;

  let response: Response;
  let body: string;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
      },
    });

    body = await response.text();
  } catch {
    throw new Error(`Could not reach the Omni Return ${action} API.`);
  }

  if (response.status === 401) {
    throw new Error(
      "Your login token is invalid or expired. Please log in again.",
    );
  }

  if (response.status === 404) {
    throw new Error(`Omni Return ${action} endpoint not found (HTTP 404).`);
  }

  return { response, body };
}

export async function loadOmniReturns(
  status: OmniReturnStatus,
  offset: number,
  search = "",
): Promise<OmniReturnPage> {
  const params = new URLSearchParams({
    status,
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });

  const term = search.trim();
  if (term) params.set("search", term);

  const { response, body } = await requestOmniReturns(
    "pending_omni_returns.php",
    params,
    "application/json",
    "list",
  );

  let payload: OmniReturnResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    throw new Error(
      `Omni Return list API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.records)
  ) {
    const message =
      typeof payload.message === "string" ? payload.message.trim() : "";

    throw new Error(
      message ||
        `Unable to load Omni Return records (HTTP ${response.status}).`,
    );
  }

  return {
    records: payload.records,
    total: Number(payload.total ?? 0),
    limit: Number(payload.limit ?? PAGE_SIZE),
    offset: Number(payload.offset ?? offset),
  };
}

export async function exportOmniReturns(
  status: OmniReturnStatus,
  search = "",
): Promise<{ csv: string; filename: string }> {
  const params = new URLSearchParams({ status });

  const term = search.trim();
  if (term) params.set("search", term);

  const { response, body } = await requestOmniReturns(
    "pending_omni_returns_export.php",
    params,
    "text/csv",
    "export",
  );

  if (!response.ok) {
    throw new Error(`Omni Return export failed (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!/^text\/csv(?:\s*;|$)/i.test(contentType.trim())) {
    throw new Error("Omni Return export API did not return a CSV file.");
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const standardFilename = disposition
    .match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i)
    ?.slice(1)
    .find((value) => value !== undefined);

  let filename = standardFilename?.trim() || `omni-returns-${status}.csv`;
  const encodedFilename = disposition
    .match(/(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]+)/i)?.[1]
    ?.trim();

  if (encodedFilename) {
    try {
      filename = decodeURIComponent(encodedFilename) || filename;
    } catch {
      // Keep the standard or default filename if decoding fails.
    }
  }

  return { csv: body, filename };
}
