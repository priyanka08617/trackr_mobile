import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

async function getVoidEndpoint(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers/void_api.php`;
}

async function getVoidToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

export interface VoidModule {
  table: string;
  name: string;
  category: number;
  pending: number;
  voided: number;
}

export interface VoidRecord {
  id: string;
  store_name: string;
  region: string;
  zone: string;
  requested_by: string;
  requested_on: string | null;
  reason: string | null;
  remark: string | null;
  approved_by: string;
  approved_on: string | null;
  product_count: number;
  fields: { label: string; value: string | number | null }[];
}

export interface VoidFilters {
  table: string;
  status: "pending" | "voided";
  from: string;
  to: string;
  search: string;
  page: number;
}

// ==============================================
// REQUEST — Bearer token, 401 retry, timeout
// ==============================================

async function request<T>(
  action: "options" | "list" | "approve",
  query: Record<string, string> = {},
  body?: unknown,
): Promise<T> {
  const ENDPOINT = await getVoidEndpoint();
  let token = await getVoidToken();

  const url = new URL(ENDPOINT);
  url.searchParams.set("action", action);
  Object.entries(query).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );

  // Cache-buster for GETs
  if (body === undefined) {
    url.searchParams.set(
      "_request",
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: body === undefined ? "GET" : "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error(
            "Void request timed out. Refresh before trying again.",
          );
        }
        throw new Error("Could not reach the void API.");
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
          if (refreshed) token = refreshed;
          continue;
        }
        if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
          throw new Error(
            "Sign in to your area manager account and try again.",
          );
        }
        throw new Error(
          `Void API did not return JSON (HTTP ${response.status}). Check deployment or sign in again.`,
        );
      }

      if (
        typeof result !== "object" ||
        result === null ||
        Array.isArray(result)
      ) {
        throw new Error("Void API returned an invalid response.");
      }

      // Retry once on 401 with fresh token
      if (
        response.status === 401 &&
        attempt === 0 &&
        /access token/i.test(result.message ?? "")
      ) {
        const refreshed = await getAuthToken();
        if (refreshed) token = refreshed;
        continue;
      }

      if (!response.ok || result.success !== true) {
        throw new Error(result.message || "Unable to load void requests.");
      }

      return result as T;
    }

    throw new Error("Unable to authenticate the void request. Sign in again.");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Void request timed out. Refresh before trying again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ==============================================
// PUBLIC API
// ==============================================

export const loadVoidOptions = () =>
  request<{ modules: VoidModule[]; regions: string[] }>("options");

export const loadVoidRecords = (filters: VoidFilters) =>
  request<{ records: VoidRecord[]; total: number; page: number }>(
    "list",
    Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    ),
  );

export const approveVoidRecords = (table: string, ids: string[]) =>
  request<{ message: string; approved: number }>("approve", {}, { table, ids });
