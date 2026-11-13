import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getFasciaBaseUrl(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers/`;
}

async function getFasciaToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

// ==============================================
// TYPES
// ==============================================

export interface FasciaPlan {
  id: string;
  start_date: string;
  end_date: string;
  store_id: string;
  store_name: string;
  row_created_on: string;
  status: string;
}

export interface FasciaDetail {
  id: string;
  division_group: string;
  division: string;
  section: string;
  department: string;
  season_flag: string;
  floor: string;
  fascia_plan: string;
  actual_fascia: string | null;
  status: string;
  submited_by: string | null;
  submitted_name: string | null;
  submited_on: string | null;
}

export interface FasciaInput {
  division_group: string;
  division: string;
  section: string;
  department: string;
  season_flag: string;
  floor: string;
  fascia_plan: string;
}

export const emptyDetail = (): FasciaInput => ({
  division_group: "",
  division: "",
  section: "",
  department: "",
  season_flag: "",
  floor: "",
  fascia_plan: "",
});

// ==============================================
// REQUEST — Bearer token, 401 retry, timeout
// ==============================================

export async function fasciaRequest<T>(
  action: "view" | "options" | "add" | "edit" | "delete",
  body?: unknown,
  query: Record<string, string> = {},
): Promise<T> {
  const BASE = await getFasciaBaseUrl();
  let token = await getFasciaToken();

  const url = new URL(`fascia_plan_${action}.php`, BASE);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }

  // Cache-buster for GETs (same pattern as import.ts / festive services)
  if (body === undefined) {
    url.searchParams.set(
      "_request",
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: body === undefined ? "GET" : "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error("Fascia request timed out. Please retry.");
        }
        throw new Error("Could not reach the fascia API.");
      }

      const text = await response.text();
      let result: { success?: boolean; message?: string } & Record<
        string,
        unknown
      >;
      try {
        result = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        // Retry once on 401 with fresh token
        if (response.status === 401 && attempt === 0) {
          const refreshed = await getAuthToken();
          if (refreshed) {
            token = refreshed;
            continue;
          }
        }
        if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
          throw new Error(
            "Sign in to your area manager account and try again.",
          );
        }
        throw new Error(
          `Fascia API did not return JSON (HTTP ${response.status}). Check deployment or sign in again.`,
        );
      }

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("Fascia API returned an invalid response.");
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
            `Unable to load fascia plan (HTTP ${response.status}).`,
        );
      }

      return result as T;
    }

    throw new Error(
      "Unable to authenticate the fascia request. Sign in again.",
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Fascia request timed out. Please retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
