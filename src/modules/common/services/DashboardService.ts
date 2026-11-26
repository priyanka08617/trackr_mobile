import { APP_CONFIG } from "@/constants/config";
import { readApiJson } from "@/services/apiResponse";
import { fetchWithSession, getSessionSnapshot, subscribeSession } from "@/services/sessionService";
import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export { readApiJson };

// ==============================================
// ACCESS TOKEN
// ==============================================

async function getAccessToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Access token is missing. Please log in again.");
  }

  return token;
}

// ==============================================
// DASHBOARD BASE URL (from saved company)
// ==============================================

async function getDashboardBaseUrl(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  return company.api_url.replace(/\/+$/, ""); // already ends in /api/v1
}

export interface DashboardFilters {
  zone?: string;
  region?: string;
  store?: string;
}

export interface DashboardFilterOption {
  value: string;
  label: string;
}

export interface DashboardFilterOptions {
  zones: DashboardFilterOption[];
  regions: DashboardFilterOption[];
  stores: DashboardFilterOption[];
}

export interface DashboardAnnouncement {
  id: number | string;
  message: string;
}

export interface StoreActivityData {
  total_stores?: number;
  active_stores_today?: number;
  percent?: number;
}

export interface LiveEmployeeRow {
  id?: number | string;
  label?: string;
  value?: number | string;
}

export interface DashboardKpiRow {
  category: number | string;
  count: number | string;
  name?: string;
  icon?: string;
}

export interface WeeklyTrackerRow {
  percentage?: number;
  count?: number;
  total_entries?: number;
  is_live?: boolean;
  week_label?: string;
  week_range?: string;
}

export interface DashboardException {
  pending?: number;
  partial?: number;
  complete?: number;
  total?: number;
  register_id?: number | string;
  register_category?: number | string;
  category?: number | string;
}

export interface DashboardExceptionVoidRow {
  register_name?: string;
  register_category?: number | string;
  category?: number | string;
  total?: number;
  pending?: number;
  void?: number;
}

export interface DashboardExceptionVoidData {
  registers?: Record<string, DashboardExceptionVoidRow>;
  summary?: {
    total_pending?: number;
    total_void?: number;
    grand_total?: number;
  };
}

export interface YtdChartRow {
  month?: string;
  year?: string | number;
  total?: number;
  ytd?: number;
}

export interface YtdOpsRow {
  location?: string;
  total_ytd_ops_compliance?: number | string;
}

export interface DashboardSnapshot {
  announcements: DashboardAnnouncement[];
  storeActivity: StoreActivityData;
  liveEmployee: LiveEmployeeRow[];
  kpis: DashboardKpiRow[];
  trackerWeeks: WeeklyTrackerRow[];
  trackerTotal: number;
  registerWeeks: WeeklyTrackerRow[];
  registerTotal: number;
  exceptions: Record<string, DashboardException>;
  exceptionVoids: Record<string, DashboardExceptionVoidRow>;
  exceptionVoidSummary: NonNullable<DashboardExceptionVoidData["summary"]>;
  ytd: YtdChartRow[];
  ytdOps: YtdOpsRow[];
  criticalLocations: unknown[];
  warnings: string[];
}

// ==============================================
// DASHBOARD CATEGORY API
// ==============================================

async function postCategory<T>(
  category_type: string,
  filters: DashboardFilters,
  baseUrl: string,
  signal: AbortSignal,
): Promise<T> {
  const endpoint = `${baseUrl}/common/dashboard_api.php`;

  const response = await fetchWithSession(endpoint, {
    method: "POST",
    signal,

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      category_type,
      zone: filters.zone ?? "",
      region: filters.region ?? "",
      store: filters.store ?? "",
    }),
  });

  const data = await readApiJson(response, `Dashboard API (${category_type})`);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : `Dashboard request failed (${response.status}).`;

    throw new Error(message);
  }

  return data as T;
}

// ==============================================
// SAFELY LOAD INDIVIDUAL CATEGORIES
// ==============================================

async function safeCategory<T>(
  category_type: string,
  filters: DashboardFilters,
  baseUrl: string,
  signal: AbortSignal,
): Promise<{ value?: T; error?: string }> {
  try {
    return {
      value: await postCategory<T>(category_type, filters, baseUrl, signal),
    };
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : `Unable to load ${category_type}.`,
    };
  }
}

// ==============================================
// NORMALIZE API RESPONSE ROWS
// ==============================================

function responseRows<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "object" && value !== null && "data" in value) {
    const rows = (value as { data?: unknown }).data;

    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }

  return [];
}

// ==============================================
// LOAD ZONE, REGION AND STORE FILTERS
// ==============================================

export async function loadDashboardFilterOptions(
  zone = "",
  region = "",
): Promise<DashboardFilterOptions> {
  const baseUrl = await getDashboardBaseUrl();
  const zoneFiltersEndpoint = `${baseUrl}/area_manager/views/fetch_zones_regions.php`;
  const token = await getAccessToken();

  const query = new URLSearchParams();

  if (zone) {
    query.set("zone", zone);
  }

  if (region) {
    query.set("region", region);
  }

  const queryString = query.toString();

  const url = queryString
    ? `${zoneFiltersEndpoint}?${queryString}`
    : zoneFiltersEndpoint;

  const response = await fetchWithSession(url, {
    method: "GET",

    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await readApiJson(response, "Dashboard filters");

  if (!response.ok || typeof data !== "object" || data === null) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : `Unable to load dashboard filters (${response.status}).`;

    throw new Error(message);
  }

  const result = data as {
    zones?: unknown[];
    regions?: unknown[];
    stores?: {
      id?: string | number;
      name?: string;
    }[];
  };

  const makeOptions = (values: unknown[] = []): DashboardFilterOption[] =>
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => ({
        value,
        label: value,
      }));

  return {
    zones: makeOptions(result.zones),

    regions: makeOptions(result.regions),

    stores: (result.stores ?? [])
      .filter(
        (store) => store.id !== undefined && typeof store.name === "string",
      )
      .map((store) => ({
        value: String(store.id),
        label: store.name as string,
      })),
  };
}

// ==============================================
// LOAD COMPLETE DASHBOARD SNAPSHOT
// ==============================================

async function loadSnapshot(
  filters: DashboardFilters,
  baseUrl: string,
  signal: AbortSignal,
): Promise<DashboardSnapshot> {
  const [
    announcementResult,
    activityResult,
    liveEmployeeResult,
    kpiResult,
    trackerResult,
    registerResult,
    exceptionResult,
    exceptionVoidResult,
    ytdResult,
    ytdOpsResult,
    criticalResult,
  ] = await Promise.all([
    safeCategory<{
      announcements?: DashboardAnnouncement[];
    }>("announcement", filters, baseUrl, signal),

    safeCategory<{
      data?: StoreActivityData;
    }>("store_activity_today_percent", filters, baseUrl, signal),

    safeCategory<{
      data?: LiveEmployeeRow[];
    }>("live_employee", filters, baseUrl, signal),

    safeCategory<{
      data?: DashboardKpiRow[];
    }>("fetch_register_kpi", filters, baseUrl, signal),

    safeCategory<{
      data?: WeeklyTrackerRow[];
      total_trackers?: number;
    }>("trackr_weekly_fill", filters, baseUrl, signal),

    safeCategory<{
      data?: WeeklyTrackerRow[];
      total_registers?: number;
    }>("weekly_register_tracker", filters, baseUrl, signal),

    safeCategory<{
      data?: Record<string, DashboardException>;
    }>("exception_window", filters, baseUrl, signal),

    safeCategory<{
      success?: boolean;
      data?: DashboardExceptionVoidData;
    }>("exception_void", filters, baseUrl, signal),

    safeCategory<YtdChartRow[]>("ytd_chart", filters, baseUrl, signal),

    safeCategory<{
      data?: YtdOpsRow[];
    }>("ytd_ops_dashboard", filters, baseUrl, signal),

    safeCategory<{
      data?: unknown[];
    }>("critical_indicator_dashboard", filters, baseUrl, signal),
  ]);


  const results = [
    announcementResult,
    activityResult,
    liveEmployeeResult,
    kpiResult,
    trackerResult,
    registerResult,
    exceptionResult,
    exceptionVoidResult,
    ytdResult,
    ytdOpsResult,
    criticalResult,
  ];

  const warnings = results.flatMap((result) =>
    result.error ? [result.error] : [],
  );

  if (warnings.length === results.length) {
    throw new Error(warnings[0] ?? "Unable to load dashboard data.");
  }

  // ============================================
  // RETURN DASHBOARD DATA
  // ============================================

  return {
    announcements: announcementResult.value?.announcements ?? [],
    storeActivity: activityResult.value?.data ?? {},
    liveEmployee: responseRows<LiveEmployeeRow>(liveEmployeeResult.value),
    kpis: kpiResult.value?.data ?? [],
    trackerWeeks: trackerResult.value?.data ?? [],
    trackerTotal: trackerResult.value?.total_trackers ?? 0,
    registerWeeks: registerResult.value?.data ?? [],
    registerTotal: registerResult.value?.total_registers ?? 0,
    exceptions: exceptionResult.value?.data ?? {},
    exceptionVoids: exceptionVoidResult.value?.data?.registers ?? {},
    exceptionVoidSummary: exceptionVoidResult.value?.data?.summary ?? {},
    ytd: responseRows<YtdChartRow>(ytdResult.value),
    ytdOps: responseRows<YtdOpsRow>(ytdOpsResult.value),
    criticalLocations: responseRows(criticalResult.value),
    warnings,
  };
}

export async function loadDashboardSnapshot(
  filters: DashboardFilters = {},
  signal?: AbortSignal,
): Promise<DashboardSnapshot> {
  const scope = getSessionSnapshot();
  const controller = new AbortController();
  const abort = () => controller.abort();
  const unsubscribe = subscribeSession(abort);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort);
  const timeout = setTimeout(abort, APP_CONFIG.requestTimeout);

  try {
    const baseUrl = await getDashboardBaseUrl();
    if (controller.signal.aborted || scope !== getSessionSnapshot()) throw new Error("Dashboard request cancelled.");
    const result = await loadSnapshot(filters, baseUrl, controller.signal);
    if (scope !== getSessionSnapshot()) throw new Error("Login session changed. Please try again.");
    return result;
  } finally {
    clearTimeout(timeout);
    unsubscribe();
    signal?.removeEventListener("abort", abort);
  }
}
