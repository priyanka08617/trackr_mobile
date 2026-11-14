import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getFestiveHomeEndpoint(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers/festive_home_report.php`;
}

async function getFestiveHomeToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

// ==============================================
// TYPES
// ==============================================

export interface FestiveHomeChecklist {
  category_id: number;
  name: string;
  set_no: string;
  start_date: string;
  end_date: string;
}

export interface FestiveHomeStore {
  id: string | number;
  store_name: string;
  region: string;
  zone: string;
}

export interface FestiveHomeFilters {
  from: string;
  to: string;
  region: string;
  zone: string;
  store: string;
}

export interface FestiveHomeRecord {
  id: string | number;
  festive_date: string;
  store_name: string;
  region: string;
  zone: string;
  score: number;
  status: string | number;
  created_by: string;
  reviewed_by: string;
  s1_created_on: string | null;
  s2_created_on: string | null;
  answers: Record<string, number | null>;
}

export interface FestiveHomeReport {
  checklist: FestiveHomeChecklist | null;
  questions: { id: string | number; question: string }[];
  records: FestiveHomeRecord[];
  total: number;
}

export interface FestiveHomeOptions {
  checklist: FestiveHomeChecklist | null;
  stores: FestiveHomeStore[];
}

// ==============================================
// REQUEST — Bearer token, 401 retry, timeout
// ==============================================

function request(action: "options", params?: Record<string, string>): Promise<FestiveHomeOptions>;
function request(action: "report", params?: Record<string, string>): Promise<FestiveHomeReport>;
function request(action: "export", params?: Record<string, string>): Promise<string>;
async function request(
  action: "options" | "report" | "export",
  params: Record<string, string> = {},
): Promise<unknown> {
  const ENDPOINT = await getFestiveHomeEndpoint();
  let token = await getFestiveHomeToken();

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ action, ...params }).toString();

  // Cache-buster for GET-style requests
  url.searchParams.set(
    "_request",
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

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
          throw new Error("Festive report request timed out. Please retry.");
        }
        throw new Error("Could not reach the festive report API.");
      }

      const text = await response.text();

      // ── CSV export path ────────────────────────────────
      if (
        response.ok &&
        action === "export" &&
        /text\/csv/i.test(response.headers.get("content-type") ?? "")
      ) {
        return text;
      }

      // ── JSON path ──────────────────────────────────────
      let payload: unknown;
      try {
        payload = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        // Retry once on 401 with fresh token
        if (
          response.status === 401 &&
          attempt === 0
        ) {
          const refreshed = await getAuthToken();
          if (refreshed) token = refreshed;
          continue;
        }
        if (response.status === 404) {
          throw new Error(
            "Festive report API is missing. Deploy festive_home_report.php to the server.",
          );
        }
        if (
          response.redirected ||
          /<html\b|<!doctype\s+html/i.test(text)
        ) {
          throw new Error(
            "Sign in to your area manager account and try again.",
          );
        }
        throw new Error(
          `Festive report API returned an invalid response (HTTP ${response.status}).`,
        );
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new Error(
          "The festive report API returned an invalid response.",
        );
      }

      const envelope = payload as { success?: boolean; message?: string };

      // Retry once on 401 with fresh token
      if (
        response.status === 401 &&
        attempt === 0 &&
        /access token/i.test(envelope.message ?? "")
      ) {
        const refreshed = await getAuthToken();
        if (refreshed) token = refreshed;
        continue;
      }

      if (!response.ok || envelope.success !== true) {
        throw new Error(
          envelope.message ||
            `Unable to load festive report (HTTP ${response.status}).`,
        );
      }

      if (action === "export") {
        throw new Error(
          "No active festive checklist is available to export.",
        );
      }

      return payload;
    }

    throw new Error(
      "Unable to authenticate the festive report request. Sign in again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ==============================================
// PUBLIC API
// ==============================================

export async function loadFestiveHomeOptions(): Promise<FestiveHomeOptions> {
  return request("options");
}

export async function loadFestiveHomeReport(
  filters: FestiveHomeFilters,
  offset = 0,
): Promise<FestiveHomeReport> {
  return request("report", {
    ...filters,
    offset: String(offset),
    limit: "50",
  });
}

export async function exportFestiveHomeReport(
  filters: FestiveHomeFilters,
): Promise<string> {
  return request("export", { ...filters });
}
