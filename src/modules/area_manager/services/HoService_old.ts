import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export interface HoChecklist {
  id: string;
  checklist_code: string;
  checklist_date: string;
  status: string | number;
  store_name: string;
  region: string;
  row_created_on: string;
  ho_visitor_name: string | null;
  ho_emp_code: string | null;
  ho_mobile_no?: string | null;
  ho_email?: string | null;
  approved_by_name?: string | null;
  approved_on?: string | null;
}
export interface HoDetail {
  id: string;
  area_category: string;
  question_text: string;
  marks: string;
  rating: string;
  complied: string | null;
  remark: string | null;
  file_name: string;
  original_file_name: string | null;
  point_status: string | null;
  store_remark: string | null;
}
export interface HoList {
  records: HoChecklist[];
  total: number;
  page: number;
  region: string;
}
export interface HoDetails {
  checklist: HoChecklist;
  details: HoDetail[];
}

interface ApiEnvelope {
  success: boolean;
  message?: string;
}

async function getHoBaseUrl(): Promise<string> {
  const company = await getSavedCompany();
  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers`;
}

async function getHoToken(): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }
  return token;
}

async function request<T>(
  action: "list" | "details" | "approve",
  query: Record<string, string> = {},
  body?: unknown,
): Promise<T> {
  const BASE = await getHoBaseUrl();
  let token = await getHoToken();

  const url = new URL(`${BASE}/ho_checklist.php`);
  url.searchParams.set("action", action);
  
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  // Cache-buster for GETs
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
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error("HO checklist request timed out. Please retry.");
        }
        throw new Error("Could not reach the HO checklist API.");
      }

      const text = await response.text();
      let payload: unknown;
      
      try {
        payload = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
          throw new Error("Sign in to your area manager account and try again.");
        }
        throw new Error(
          response.status === 404
            ? `HO checklist endpoint not found: ${url.toString()}`
            : `HO checklist API did not return JSON (HTTP ${response.status}).`,
        );
      }

      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        throw new Error("The HO checklist API returned an invalid response.");
      }

      const envelope = payload as ApiEnvelope;

      // Retry once on 401 with a fresh token
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
          typeof envelope.message === "string" && envelope.message
            ? envelope.message
            : `HO checklist request failed (${response.status}).`,
        );
      }

      return payload as T;
    }

    throw new Error("Unable to authenticate the HO checklist request. Sign in again.");
  } finally {
    clearTimeout(timeout);
  }
}

export const loadHoList = (page: number, search: string, company?: string) =>
  request<HoList>("list", {
    page: String(page),
    search: search,
    ...(company ? { company } : {}),
  });

export const loadHoDetails = (code: string) =>
  request<HoDetails>("details", { checklist_code: code });

export const approveHoChecklist = (code: string) =>
  request<{ message: string }>("approve", {}, { checklist_code: code });