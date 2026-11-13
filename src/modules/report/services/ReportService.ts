import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getFasciaReportEndpoint(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers/fascia_plan_report.php`;
}

async function getFasciaReportToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

// ==============================================
// TYPES
// ==============================================

export interface FasciaReportStore {
  id: string | number;
  store_name: string;
  region: string;
  zone: string;
}

export interface FasciaReportFilters {
  from: string;
  to: string;
  zone: string;
  region: string;
  store: string;
  status: string;
}

export interface FasciaReportRow {
  id: string | number;
  fascia_date: string;
  store_name: string;
  region: string;
  zone: string;
  division_group: string;
  division: string;
  section: string;
  department: string;
  season_flag: string;
  floor: string;
  fascia_plan: string;
  actual_fascia: string | null;
  submitted_by: string;
  submitted_on: string | null;
  status: string;
}

export interface FasciaReportPage {
  records: FasciaReportRow[];
  total: number;
}

// ==============================================
// REQUEST — Bearer token, 401 retry, timeout
// ==============================================

async function request<T>(
  action: string,
  params: Record<string, string> = {},
): Promise<T> {
  const ENDPOINT = await getFasciaReportEndpoint();
  let token = await getFasciaReportToken();

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ action, ...params }).toString();

  // Cache-buster for GET requests (this endpoint is always GET)
  url.searchParams.set(
    "_request",
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              action === "export"
                ? "text/csv, application/json"
                : "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error(
            "Fascia Report request timed out. Please retry.",
          );
        }
        throw new Error("Could not reach the Fascia Report API.");
      }

      const body = await response.text();

      // ── CSV export success path ──────────────────────
      if (
        response.ok &&
        action === "export" &&
        /text\/csv/i.test(response.headers.get("content-type") ?? "")
      ) {
        return body as T;
      }

      // ── JSON path ────────────────────────────────────
      let result: { success?: boolean; message?: string } & Record<
        string,
        unknown
      >;
      try {
        result = JSON.parse(body.replace(/^\uFEFF/, ""));
      } catch {
        // Retry once on 401 with fresh token
        if (response.status === 401 && attempt === 0) {
          const refreshed = await getAuthToken();
          if (refreshed) {
            token = refreshed;
            continue;
          }
        }
        if (
          response.redirected ||
          /<html\b|<!doctype\s+html/i.test(body)
        ) {
          throw new Error(
            "Sign in to your area manager account and try again.",
          );
        }
        throw new Error(
          `Fascia Report API did not return JSON (HTTP ${response.status}). Check deployment or sign in again.`,
        );
      }

      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
      ) {
        throw new Error("Fascia Report API returned an invalid response.");
      }

      // Retry once on 401 with fresh token
      if (
        response.status === 401 &&
        attempt === 0 &&
        /access token/i.test(result.message ?? "")
      ) {
        const refreshed = await getAuthToken();
        if (refreshed) {
          token = refreshed;
          continue;
        }
      }

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message ||
            `Unable to load Fascia Report (HTTP ${response.status}).`,
        );
      }

      if (action === "export") {
        throw new Error("The server did not return a CSV file.");
      }

      return result as T;
    }

    throw new Error(
      "Unable to authenticate the Fascia Report request. Sign in again.",
    );
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new Error("Fascia Report request timed out. Please retry.");
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

// ==============================================
// PUBLIC API
// ==============================================

export const loadFasciaReportOptions = () =>
  request<{ stores: FasciaReportStore[] }>("options");

export const loadFasciaReport = (filters: FasciaReportFilters, offset = 0) =>
  request<FasciaReportPage>("report", {
    ...filters,
    offset: String(offset),
    limit: "50",
  });

export const exportFasciaReport = (filters: FasciaReportFilters) =>
  request<string>("export", { ...filters });