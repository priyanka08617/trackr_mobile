import { getAuthToken } from "../storage/authStorage";
import { getSavedCompany } from "../storage/companyStorage";

// ==========================================
// DASHBOARD CATEGORIES
// ==========================================

export type DashboardCategory =
  | "exception_window"
  | "store_activity_today_percent"
  | "exception_void"
  | "fetch_register_kpi"
  | "ytd_chart"
  | "ytd_ops_dashboard"
  | "live_employee"
  | "live_log_in"
  | "announcement"
  | "critical_indicator_dashboard"
  | "trackr_weekly_fill"
  | "weekly_register_tracker"
  | "kpi_register_and_tracker";

// ==========================================
// DASHBOARD FILTERS
// ==========================================

export interface DashboardFilters {
  zone?: string;
  region?: string;
  store?: string;
  month?: string;
  todate?: string;
}

// ==========================================
// COMMON RESPONSE TYPES
// ==========================================

export interface DashboardResponse<T = unknown> {
  success?: boolean;
  message?: string;
  warning?: string;
  category_type?: DashboardCategory;
  data?: T;
  source?: string;
  level_type?: string;
  current_month?: string;
  [key: string]: unknown;
}

// ==========================================
// DASHBOARD DATA TYPES
// ==========================================

export interface StoreActivityData {
  total_stores: number;
  active_stores_today: number;
  percent: number;
  source: string;
}

export interface RegisterKPI {
  name: string;
  icon: string;
  count: number;
  category: number;
  source: string;
}

export interface LiveEmployeeData {
  id?: number;
  label: string;
  value: number;
}

export interface LiveLoginData {
  active_users: number;
  active_stores: number;
}

export interface ExceptionData {
  total: number;
  complete: number;
  partial: number;
  pending: number;
  verification: number;
  source?: string;
}

export interface Announcement {
  id: number;
  message: string;
}

export interface WeeklyTrackerData {
  count: number;
  percentage: number;
  is_live: boolean;
  historical: number;
  live_today: number;
  week_label: string;
  week_number: number;
}

export interface WeeklyRegisterData {
  week_range: string;
  total_entries: number;
  percentage: number;
  is_live: boolean;
  filled_registers: number;
  total_registers: number;
  week_number: number;
}

// ==========================================
// COMMON DASHBOARD API FUNCTION
// ==========================================

export async function fetchDashboardData<T = unknown>(
  categoryType: DashboardCategory,
  filters: DashboardFilters = {},
): Promise<DashboardResponse<T>> {
  const company = await getSavedCompany();
  const token = await getAuthToken();

  if (!company?.api_url) {
    throw new Error("Company not selected. Please select a company.");
  }

  if (!token) {
    throw new Error("Session not found. Please login again.");
  }

  const apiUrl = company.api_url.replace(/\/+$/, "");

  try {
    const response = await fetch(`${apiUrl}/common/dashboard.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": token,
      },
      body: JSON.stringify({
        category_type: categoryType,
        ...filters,
      }),
    });

    const result: DashboardResponse<T> = await response.json();

    if (response.status === 401) {
      throw new Error("Session expired or invalid. Please login again.");
    }

    if (response.status === 403) {
      throw new Error(result.message || "Dashboard access denied.");
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message ||
          result.warning ||
          `Dashboard API error (${response.status})`,
      );
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Unable to load Dashboard data.");
  }
}

// ==========================================
// STORE ACTIVITY TODAY
// ==========================================

export async function getStoreActivity(
  filters: DashboardFilters = {},
): Promise<StoreActivityData> {
  const response = await fetchDashboardData<StoreActivityData>(
    "store_activity_today_percent",
    filters,
  );

  if (!response.data) {
    throw new Error("Store activity data not found.");
  }

  return response.data;
}

// ==========================================
// EXCEPTION WINDOW
// ==========================================

export async function getExceptionWindow(filters: DashboardFilters = {}) {
  return fetchDashboardData<Record<string, ExceptionData>>(
    "exception_window",
    filters,
  );
}

// ==========================================
// EXCEPTION VOID
// ==========================================

export async function getExceptionVoid(filters: DashboardFilters = {}) {
  return fetchDashboardData("exception_void", filters);
}

// ==========================================
// REGISTER KPI
// ==========================================

export async function getRegisterKPI(filters: DashboardFilters = {}) {
  return fetchDashboardData<RegisterKPI[]>("fetch_register_kpi", filters);
}

// ==========================================
// YTD CHART
// ==========================================

export async function getYTDChart(filters: DashboardFilters = {}) {
  return fetchDashboardData("ytd_chart", filters);
}

// ==========================================
// YTD OPERATIONS DASHBOARD
// ==========================================

export async function getYtdOpsDashboard(filters: DashboardFilters = {}) {
  return fetchDashboardData("ytd_ops_dashboard", filters);
}

// ==========================================
// LIVE EMPLOYEE
// ==========================================

export async function getLiveEmployee(filters: DashboardFilters = {}) {
  return fetchDashboardData<LiveEmployeeData[]>("live_employee", filters);
}

// ==========================================
// LIVE LOGIN
// ==========================================

export async function getLiveLogin(filters: DashboardFilters = {}) {
  return fetchDashboardData<LiveLoginData>("live_log_in", filters);
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================

export async function getAnnouncements() {
  const response = await fetchDashboardData("announcement");

  return response as DashboardResponse & {
    count?: number;
    announcements?: Announcement[];
  };
}

// ==========================================
// CRITICAL INDICATOR DASHBOARD
// ==========================================

export async function getCriticalIndicator(filters: DashboardFilters = {}) {
  return fetchDashboardData("critical_indicator_dashboard", filters);
}

// ==========================================
// TRACKR WEEKLY FILL
// ==========================================

export async function getTrackrWeeklyFill(filters: DashboardFilters = {}) {
  return fetchDashboardData<WeeklyTrackerData[]>("trackr_weekly_fill", filters);
}

// ==========================================
// WEEKLY REGISTER TRACKER
// ==========================================

export async function getWeeklyRegisterTracker(filters: DashboardFilters = {}) {
  return fetchDashboardData<WeeklyRegisterData[]>(
    "weekly_register_tracker",
    filters,
  );
}

// ==========================================
// KPI REGISTER AND TRACKER
// ==========================================

export async function getKpiRegisterTracker(filters: DashboardFilters = {}) {
  return fetchDashboardData("kpi_register_and_tracker", filters);
}
