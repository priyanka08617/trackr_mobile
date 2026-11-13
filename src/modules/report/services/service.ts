import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export interface Plan {
  id: string;
  zone: string;
  region: string;
  date: string;
  actualDate: string;
  planned: string[];
  actual: string[];
  plannedNames: string;
  actualNames: string;
  status: 1 | 2;
  manager: string;
}
export interface LocationOption {
  id: string;
  name: string;
  source: string;
}
export interface PlanOptions {
  zones: string[];
  regions: string[];
  options: LocationOption[];
}
export interface VisitInput {
  date: string;
  locations: string[];
}

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getPlanBaseUrl(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers/`;
}

async function getPlanToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export async function planRequest<T>(
  action: string,
  body?: unknown,
  query: Record<string, string> = {},
): Promise<T> {
  const BASE = await getPlanBaseUrl();
  const token = await getPlanToken();

  const url = new URL(`work_plan_travel_plan_${action}.php`, BASE);
  for (const [key, value] of Object.entries(query))
    if (value) url.searchParams.set(key, value);
  if (body === undefined)
    url.searchParams.set(
      "_request",
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url.toString(), {
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
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      throw new Error(
        response.status === 404
          ? `Work plan endpoint not found: ${url.toString()}`
          : `Work plan API did not return JSON (HTTP ${response.status}). Please sign in again or retry.`,
      );
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      throw new Error("Invalid work plan API response.");
    const result = payload as { success?: boolean; message?: string };
    if (!response.ok || result.success !== true)
      throw new Error(
        result.message || `Work plan request failed (HTTP ${response.status}).`,
      );
    return payload as T;
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError")
      throw new Error("Work plan request timed out. Please retry.");
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}
export async function listPlans(
  status: 1 | 2,
  page: number,
  from: string,
  to: string,
) {
  const result = await planRequest<{
    records: Record<string, unknown>[];
    total: number;
  }>("view", undefined, {
    status: String(status),
    limit: "20",
    offset: String((page - 1) * 20),
    from_date: from,
    to_date: to,
  });
  if (!Array.isArray(result.records) || !Number.isFinite(Number(result.total)))
    throw new Error("Invalid work plan list response.");
  return {
    total: Number(result.total),
    records: result.records.map(
      (row): Plan => ({
        id: String(row.id),
        zone: String(row.zone ?? ""),
        region: String(row.region ?? ""),
        date: String(row.wptp_date ?? ""),
        actualDate: String(row.actual_visit_date ?? "").replace(
          /^0000-00-00$/,
          "",
        ),
        status: Number(row.status) === 2 ? 2 : 1,
        planned: Array.isArray(row.planned_locations)
          ? row.planned_locations.map(String)
          : [],
        actual: Array.isArray(row.actual_locations)
          ? row.actual_locations.map(String)
          : [],
        plannedNames: String(row.planned_location_names ?? ""),
        actualNames: String(row.actual_location_names ?? ""),
        manager: String(row.rm_name ?? row.rm_code ?? ""),
      }),
    ),
  };
}
