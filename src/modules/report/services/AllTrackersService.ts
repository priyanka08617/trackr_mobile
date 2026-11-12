import { tableDateRange } from "./reportDateRange";
import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { loadLocationFilterOptions } from "./locationFilters";
import type { ReportColumn } from "./reportTableColumns";
import { readApiJson } from "../../common/services/DashboardService";
import { normalizeTrackerText } from "./trackerText";

const PAGE_SIZE = 50;

const REPORT_ENDPOINTS = {
  fmcg_de: {
    path: "/report/tracker_fmcg_de_view.php",
    exportPath: "/report/tracker_fmcg_de_export.php",
    method: "POST",
  },
  non_apps_dd: {
    path: "/report/tracker_non_apps_dd_view.php",
    exportPath: "/report/tracker_non_apps_dd_export.php",
    method: "POST",
  },
  snap_up_dd: {
    path: "/report/tracker_snap_up_dd_view.php",
    exportPath: "/report/tracker_snap_up_dd_export.php",
    method: "POST",
  },
  beauty_dd: {
    path: "/report/tracker_beauty_dd_view.php",
    exportPath: "/report/tracker_beauty_dd_export.php",
    method: "POST",
  },
  tso_dd: {
    path: "/report/tracker_tso_dd_view.php",
    exportPath: "/report/tracker_tso_dd_export.php",
    method: "POST",
  },
  store_incident_log: {
    path: "/report/tracker_store_incident_log_view.php",
    exportPath: "/report/tracker_store_incident_log_export.php",
    method: "POST",
  },
  jewellery_hair_accessories_dd: {
    path: "/report/tracker_jewellery_hair_accessories_dd_view.php",
    exportPath: "/report/tracker_jewellery_hair_accessories_dd_export.php",
    method: "POST",
  },
  unloading_payment: {
    path: "/report/tracker_unloading_payment_view.php",
    exportPath: "/report/tracker_unloading_payment_export.php",
    method: "POST",
  },
  canteen_fooding: {
    path: "/report/tracker_canteen_fooding_view.php",
    exportPath: "/report/tracker_canteen_fooding_export.php",
    method: "POST",
  },
  fmcg_price_mismatch: {
    path: "/report/tracker_fmcg_price_mismatch_view.php",
    exportPath: "/report/tracker_fmcg_price_mismatch_export.php",
    method: "POST",
  },
  grt_packet_readiness: {
    path: "/report/tracker_grt_packet_readiness_view.php",
    exportPath: "/report/tracker_grt_packet_readiness_export.php",
    method: "POST",
  },
  ist_packet_readiness: {
    path: "/report/tracker_ist_packet_readiness_view.php",
    exportPath: "/report/tracker_ist_packet_readiness_export.php",
    method: "POST",
  },
  near_to_expiry: {
    path: "/report/tracker_near_to_expiry_view.php",
    exportPath: "/report/tracker_near_to_expiry_export.php",
    method: "POST",
  },
  damage_apparel: {
    path: "/report/tracker_damage_apparel_view.php",
    exportPath: "/report/tracker_damage_apparel_export.php",
    method: "POST",
  },
  missing_tag: {
    path: "/report/tracker_missing_tag_view.php",
    exportPath: "/report/tracker_missing_tag_export.php",
    method: "POST",
  },
  sensor_tag: {
    path: "/report/tracker_sensor_tag_view.php",
    exportPath: "/report/tracker_sensor_tag_export.php",
    method: "POST",
  },
  monthly_lp_global_count: {
    path: "/common/monthly_lp_global_count.php",
    exportPath: "/report/tracker_monthly_lp_global_count_export.php",
    method: "GET",
  },
} as const;

export type TrackerId = keyof typeof REPORT_ENDPOINTS;

export interface TrackerLink {
  id: TrackerId;
  name: string;
  url?: string;
}

export interface TrackerReportRow extends Record<string, unknown> {
  id: string;
}

export interface TrackerReportPage {
  columns: ReportColumn[];
  rows: TrackerReportRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface TrackerFilters {
  from: string;
  to: string;
  region: string;
  zone: string;
  store: string;
}

export interface TrackerFilterOptions {
  regions: string[];
  zones: string[];
  stores: { id: string; name: string }[];
}

// ==============================================
// COMPANY BASE URL
// ==============================================

async function getTrackerBaseUrl(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  return company.api_url.replace(/\/+$/, ""); // already ends in /api/v1
}

export async function loadTrackerFilterOptions(
  region = "",
  zone = "",
): Promise<TrackerFilterOptions> {
  return loadLocationFilterOptions(region, zone);
}

export async function loadTrackerReportPage(
  trackerId: TrackerId,
  filters: TrackerFilters,
  offset: number,
): Promise<TrackerReportPage> {
  const baseUrl = await getTrackerBaseUrl();
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  const endpoint = REPORT_ENDPOINTS[trackerId];
  const tableRange = tableDateRange(filters.from, filters.to);
  const params = new URLSearchParams({
    draw: String(Math.floor(offset / PAGE_SIZE) + 1),
    start: String(offset),
    length: String(PAGE_SIZE),
    from: tableRange.from,
    to: tableRange.to,
    region: filters.region,
    zone: filters.zone,
    store: filters.store,
  });
  if (trackerId === "monthly_lp_global_count") {
    params.set("real_from", tableRange.from);
    params.set("real_to", tableRange.to);
  }

  const url = `${baseUrl}${endpoint.path}${endpoint.method === "GET" ? `?${params.toString()}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: endpoint.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(endpoint.method === "POST"
          ? {
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            }
          : {}),
      },
      body: endpoint.method === "POST" ? params.toString() : undefined,
    });
  } catch {
    throw new Error("Could not reach this tracker report.");
  }

  const payload = await readApiJson(
    response,
    `Tracker ${trackerId} report (${endpoint.path})`,
  );
  if (!response.ok || typeof payload !== "object" || payload === null) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : `Tracker report request failed (${response.status}).`;
    throw new Error(message);
  }
  if ("success" in payload && payload.success === false) {
    throw new Error(
      "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "The tracker report could not be loaded.",
    );
  }
  if ("error" in payload && payload.error) {
    throw new Error("The tracker report could not be loaded.");
  }

  const value = payload as {
    data?: unknown;
    columns?: unknown;
    recordsFiltered?: number | string;
    recordsTotal?: number | string;
  };
  if (!Array.isArray(value.data)) {
    throw new Error("The tracker report returned an unexpected response.");
  }

  const rows = value.data
    .slice(0, PAGE_SIZE)
    .filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null,
    )
    .map((row, index) => ({
      ...row,
      id: String(row.id ?? row.ID ?? `tracker-${offset + index}`),
    }));
  const total = Number(
    value.recordsFiltered ?? value.recordsTotal ?? rows.length,
  );

  const columns: ReportColumn[] = Array.isArray(value.columns)
    ? value.columns.flatMap((column: unknown) => {
        if (typeof column !== "object" || column === null) return [];
        const item = column as Record<string, unknown>;
        return typeof item.data === "string" && typeof item.title === "string"
          ? [{ data: item.data, title: item.title }]
          : [];
      })
    : [];

  return {
    columns,
    rows,
    total: Number.isFinite(total) ? total : rows.length,
    offset,
    limit: PAGE_SIZE,
  };
}

export async function requestTrackerCsv(
  trackerId: TrackerId,
  filters: TrackerFilters,
): Promise<{ csv: string; filename: string }> {
  const baseUrl = await getTrackerBaseUrl();
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  const endpoint = REPORT_ENDPOINTS[trackerId];
  const query = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    region: filters.region,
    zone: filters.zone,
    store: filters.store,
  });
  const response = await fetch(
    `${baseUrl}${endpoint.exportPath}?${query.toString()}`,
    {
      headers: {
        Accept: "text/csv",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const csv = normalizeTrackerText(await response.text());
  if (
    !response.ok ||
    response.redirected ||
    /<\s*(?:!doctype\s+html|html\b)/i.test(csv)
  ) {
    throw new Error(
      "The tracker export API did not return a CSV file. Check the manager session and export endpoint.",
    );
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename =
    disposition
      .match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)?.[1]
      ?.replace(/^\"|\"$/g, "") ?? `${trackerId}-report.csv`;
  return { csv, filename };
}