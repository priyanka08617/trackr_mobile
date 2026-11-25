import { fetchWithSession } from "@/services/sessionService";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import AreaPage from "@/components/AreaPage";
import DateField from "@/components/DateField";
import SelectField, { type SelectOption } from "@/components/SelectField";
import DynamicDataTable from "@/components/table/DynamicAutoDataTable";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { loadLocationFilterOptions } from "../services/locationFilters";
import { prepareReportCsv } from "../services/reportCsv";
import {
  exceedsTableDateRange,
  tableDateRange,
} from "../services/reportDateRange";
import {
  REGISTER_TABLE_COLUMNS,
  staticReportCells,
} from "../services/reportTableColumns";
import { isPickerCancellation } from "../services/trackerText";
import { usePagination } from "../services/usePagination";

const REPORTS = {
  alteration: {
    title: "Alteration Report",
    statusLabel: "Remark",
    statuses: ["Used", "Not Used"],
  },
  footfall: {
    title: "Footfall Report",
    statusLabel: "Remark",
    statuses: ["Complete", "Partial"],
    extraLabel: "Alert Type",
    extras: ["High Footfall", "Low Footfall"],
  },
  exchange: { title: "Exchange Report" },
  electricity: {
    title: "Electricity Report",
    statusLabel: "Remark",
    statuses: ["Low PF", "Unusual", "No Data"],
  },
  generator: {
    title: "Generator Report",
    statusLabel: "Remark",
    statuses: ["Unusual", "No Data", "Partial", "Wrong Data", "Mall Store"],
  },
  hk_sg: { title: "HK & SG Report" },
  lost_found: { title: "Lost & Found Report" },
  scrap: { title: "Scrap Report" },
  global_count: { title: "Global Count Report" },
  pi: { title: "PI Report" },
  key_movement: { title: "Key Movement Report" },
  fmcg_price_mismatch: {
    title: "FMCG Price Mismatch",
    extraLabel: "Search",
    searchOnly: true,
  },
} as const;

export type RegisterReportId = keyof typeof REPORTS;
type ReportConfig = (typeof REPORTS)[RegisterReportId];
type ReportRow = Record<string, unknown> & { id: string };
type ReportFilters = {
  fromDate: string;
  toDate: string;
  region: string;
  zone: string;
  store: string;
  status: string;
  extra: string;
  search?: string;
};

const REPORT_PAGE_SIZE = 50;
// company.api_url already ends in /api/v1, so these are relative to that.
const REGISTER_API_BASE = "report/";
const REPORT_ENDPOINTS: Record<
  RegisterReportId,
  { path: string; exportPath: string; method: "POST" }
> = {
  alteration: {
    path: `${REGISTER_API_BASE}register_alteration_view.php`,
    exportPath: `${REGISTER_API_BASE}register_alteration_export.php`,
    method: "POST",
  },
  footfall: {
    path: `${REGISTER_API_BASE}register_footfall_view.php`,
    exportPath: `${REGISTER_API_BASE}register_footfall_export.php`,
    method: "POST",
  },
  exchange: {
    path: `${REGISTER_API_BASE}register_exchange_view.php`,
    exportPath: `${REGISTER_API_BASE}register_exchange_export.php`,
    method: "POST",
  },
  electricity: {
    path: `${REGISTER_API_BASE}register_electricity_view.php`,
    exportPath: `${REGISTER_API_BASE}register_electricity_export.php`,
    method: "POST",
  },
  generator: {
    path: `${REGISTER_API_BASE}register_generator_view.php`,
    exportPath: `${REGISTER_API_BASE}register_generator_export.php`,
    method: "POST",
  },
  hk_sg: {
    path: `${REGISTER_API_BASE}register_hk_sg_view.php`,
    exportPath: `${REGISTER_API_BASE}register_hk_sg_export.php`,
    method: "POST",
  },
  lost_found: {
    path: `${REGISTER_API_BASE}register_lost_found_view.php`,
    exportPath: `${REGISTER_API_BASE}register_lost_found_export.php`,
    method: "POST",
  },
  scrap: {
    path: `${REGISTER_API_BASE}register_scrap_view.php`,
    exportPath: `${REGISTER_API_BASE}register_scrap_export.php`,
    method: "POST",
  },
  global_count: {
    path: `${REGISTER_API_BASE}register_global_count_view.php`,
    exportPath: `${REGISTER_API_BASE}register_global_count_export.php`,
    method: "POST",
  },
  pi: {
    path: `${REGISTER_API_BASE}register_pi_view.php`,
    exportPath: `${REGISTER_API_BASE}register_pi_export.php`,
    method: "POST",
  },
  key_movement: {
    path: `${REGISTER_API_BASE}register_key_movement_view.php`,
    exportPath: `${REGISTER_API_BASE}register_key_movement_export.php`,
    method: "POST",
  },
  fmcg_price_mismatch: {
    path: `${REGISTER_API_BASE}register_fmcg_price_mismatch_view.php`,
    exportPath: `${REGISTER_API_BASE}register_fmcg_price_mismatch_export.php`,
    method: "POST",
  },
};

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getRegisterBaseUrl(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  return company.api_url.replace(/\/+$/, ""); // already ends in /api/v1
}

async function getRegisterToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

async function readRegisterJson(
  response: Response,
  endpoint: string,
): Promise<unknown> {
  const body = await response.text();
  let payload: unknown;
  try {
    payload = body.trim() ? JSON.parse(body.replace(/^\uFEFF/, "")) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const serverMessage =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "";
    if (response.status === 404)
      throw new Error(
        "Unable to load this report right now. Please try again.",
      );
    if (response.status >= 500)
      throw new Error(
        `Register API server error (HTTP ${response.status}) at ${endpoint}. ${serverMessage || "Check the PHP error log and deploy the complete register API files."}`,
      );
    throw new Error(
      serverMessage ||
        `Register request failed (HTTP ${response.status}) at ${endpoint}.`,
    );
  }
  if (payload === null)
    throw new Error(
      `Register API did not return JSON at ${endpoint}. Check your login session and server deployment.`,
    );
  return payload;
}
function todayInputDate(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

function rowsFromResponse(value: unknown, maximumRows?: number): ReportRow[] {
  const rawRows = Array.isArray(value)
    ? value
    : typeof value === "object" &&
        value !== null &&
        "data" in value &&
        Array.isArray(value.data)
      ? value.data
      : null;
  if (!rawRows)
    throw new Error("The report API returned an unexpected response format.");
  const rows =
    maximumRows === undefined ? rawRows : rawRows.slice(0, maximumRows);
  return rows
    .filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null,
    )
    .map((row, index) => ({
      ...row,
      id: String(row.id ?? row.ID ?? `report-${index}`),
    }));
}

async function fetchReportRows(
  reportId: RegisterReportId,
  filters: ReportFilters,
  offset = 0,
  limit = REPORT_PAGE_SIZE,
  signal?: AbortSignal,
): Promise<{ rows: ReportRow[]; total: number }> {
  const baseUrl = await getRegisterBaseUrl();
  const token = await getRegisterToken();

  const endpoint = REPORT_ENDPOINTS[reportId];
  const tableRange = tableDateRange(filters.fromDate, filters.toDate);
  const params = new URLSearchParams({
    from: tableRange.from,
    to: tableRange.to,
    region: filters.region,
    zone: filters.zone,
    store: filters.store,
    status: filters.status,
    alertType: reportId === "footfall" ? filters.extra : "",
    draw: String(Math.floor(offset / limit) + 1),
    start: String(offset),
    length: String(limit),
    search: filters.search ?? "",
  });
  const url = `${baseUrl}/${endpoint.path}`;
  const response = await fetchWithSession(url, {
    method: endpoint.method,
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });
  const data = await readRegisterJson(response, endpoint.path);
  if (
    !response.ok ||
    (typeof data === "object" &&
      data !== null &&
      "success" in data &&
      data.success === false)
  ) {
    throw new Error(
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : `Report request failed (${response.status}).`,
    );
  }
  const rows = rowsFromResponse(data, limit);
  const total = Number(
    (data as { recordsFiltered?: unknown }).recordsFiltered ?? rows.length,
  );
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

// ========================================================================================

function ReportTable({
  reportId,
  rows,
  offset,
  currentPage,
  pageSize,
  total,
  goToPage,
  loading,
}: {
  reportId: RegisterReportId;
  rows: ReportRow[];
  offset: number;
  currentPage: number;
  pageSize: number;
  total: number;
  loading: boolean;
  goToPage: (page: number) => void;
}) {
  const { height } = useWindowDimensions();

  const columns = REGISTER_TABLE_COLUMNS[reportId];

  const tableColumns = useMemo(
    () => [
      {
        title: "#",
        dataIndex: "serial",
        width: 60,
        align: "center" as const,
        searchable: false,
      },
      ...columns.map((column) => ({
        title: column.title,
        dataIndex: column.data,
        width: Math.max(88, column.title.length * 8 + 24),
        searchable: true,
      })),
    ],
    [columns],
  );

  const tableData = useMemo(
    () =>
      rows.map((row, index) => {
        const cells = staticReportCells(row, columns);

        const data: Record<string, unknown> = {
          id: row.id,
          serial: offset + index + 1,
        };

        columns.forEach((column, columnIndex) => {
          data[column.data] = cells[columnIndex] ?? "-";
        });

        return data;
      }),
    [rows, columns, offset],
  );

  return (
    <DynamicDataTable
      columns={tableColumns}
      data={tableData}
      height={Math.max(240, Math.min(560, height * 0.6))}
      // refreshKey={`${reportId}-${offset}-${rows.length}`}
      refreshKey={reportId}
      showPagination={true}
      serverSidePagination={true}
      currentPage={currentPage}
      pageSize={pageSize}
      totalRecords={total}
      onPageChange={goToPage}
      loading={loading}
      showSearch={false}
      showColumnFilter={false}
    />
  );
}
// ==============================================================================
function validDay(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value
    ? parsed
    : undefined;
}

export default function RegisterReportScreen({
  reportId,
}: {
  reportId: RegisterReportId;
}) {
  const report: ReportConfig = REPORTS[reportId];
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [store, setStore] = useState("");
  const [regionOptions, setRegions] = useState<SelectOption[]>([]);
  const [zoneOptions, setZones] = useState<SelectOption[]>([]);
  const [storeOptions, setStores] = useState<SelectOption[]>([]);
  const [fromDate, setFromDate] = useState(todayInputDate);
  const [toDate, setToDate] = useState(todayInputDate);
  const [status, setStatus] = useState("");
  const [extra, setExtra] = useState("");
  const [search, setSearch] = useState("");
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const pageSize = REPORT_PAGE_SIZE;
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    fromDate: todayInputDate(),
    toDate: todayInputDate(),
    region: "",
    zone: "",
    store: "",
    status: "",
    extra: "",
  });
  const [error, setError] = useState<string>();
  const [exportMessage, setExportMessage] = useState<string>();
  const queryKey = useMemo(
    () => JSON.stringify([reportId, appliedFilters]),
    [appliedFilters, reportId],
  );

  const fetchPage = useCallback(
    async (requestedPage: number, limit: number, signal: AbortSignal) => {
      const result = await fetchReportRows(
        reportId,
        appliedFilters,
        (requestedPage - 1) * limit,
        limit,
        signal,
      );
      return { data: result.rows, total: result.total };
    },
    [appliedFilters, reportId],
  );
  const {
    data: rows,
    total,
    page: currentPage,
    loading,
    error: pageError,
    goToPage,
  } = usePagination<ReportRow>({
    queryKey,
    limit: pageSize,
    fetchPage,
  });
  const offset = (currentPage - 1) * pageSize;

  const visibleError = error ?? pageError;

  useEffect(() => {
    let active = true;
    loadLocationFilterOptions(region, zone)
      .then((data) => {
        if (!active) return;
        setRegions(data.regions.map((value) => ({ value, label: value })));
        setZones(data.zones.map((value) => ({ value, label: value })));
        setStores(
          data.stores.map((item) => ({ value: item.id, label: item.name })),
        );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load location filters.",
          );
      });
    return () => {
      active = false;
    };
  }, [region, zone]);

  function loadReport(filters: ReportFilters, searchText = "") {
    const from = validDay(filters.fromDate);
    const to = validDay(filters.toDate);
    if (from === undefined || to === undefined) {
      setError("Enter valid dates using YYYY-MM-DD.");
      return;
    }
    if (
      filters.toDate > todayInputDate() ||
      to < from ||
      (to - from) / 86400000 + 1 > 31
    ) {
      setError(
        "Choose an end date on or after the start date, within a 31-day range.",
      );
      return;
    }
    setError(undefined);
    setExportMessage(undefined);
    setAppliedFilters({ ...filters, search: searchText.trim() });
  }

  function filterReport() {
    void loadReport(
      { fromDate, toDate, region, zone, store, status, extra },
      search,
    );
  }
  async function exportReport() {
    const from = validDay(fromDate);
    const to = validDay(toDate);
    if (
      from === undefined ||
      to === undefined ||
      to < from ||
      (to - from) / 86400000 + 1 > 31
    ) {
      setError("Choose a valid date range of 31 days or less.");
      return;
    }
    setError(undefined);
    setExportMessage(undefined);
    try {
      const baseUrl = await getRegisterBaseUrl();
      const token = await getRegisterToken();

      const endpoint = REPORT_ENDPOINTS[reportId];

      // =========================================
      // const params = new URLSearchParams({
      //   from: fromDate,
      //   to: toDate,
      //   region,
      //   zone,
      //   store,
      //   status,
      //   alertType: reportId === "footfall" ? extra : "",
      //   search: search.trim(),
      // });

      const params = new URLSearchParams();

      params.append("from", fromDate);
      params.append("to", toDate);
      params.append("region", region);
      params.append("zone", zone);
      params.append("store", store);
      params.append("status", status);

      params.append("alertType", reportId === "footfall" ? extra : "");

      params.append("search", search.trim());
      // =====================================
      const response = await fetchWithSession(
        `${baseUrl}/${endpoint.exportPath}?${params.toString()}`,
        {
          headers: {
            Accept: "text/csv",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const csv = await response.text();
      if (
        !response.ok ||
        response.redirected ||
        !response.headers.get("content-type")?.includes("text/csv")
      ) {
        throw new Error(
          `Register export did not return CSV (HTTP ${response.status}). Check deployment and your login session.`,
        );
      }
      const filename = `${reportId}-${todayInputDate()}.csv`;
      if (Platform.OS === "web") {
        const blob = new Blob([prepareReportCsv(csv)], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExportMessage(`Downloaded ${filename}.`);
        return;
      }

      // Android lets the user select a destination (such as Downloads). iOS saves to app Documents.
      let file: File;
      if (Platform.OS === "android") {
        let destination: Directory;
        try {
          destination = await Directory.pickDirectoryAsync();
        } catch (pickerError) {
          if (isPickerCancellation(pickerError)) return;
          throw pickerError;
        }
        if (!destination) return;

        file = destination.createFile(filename, "text/comma-separated-values");
      } else {
        file = new File(Paths.document, filename);
        // Exports use the same name per report and day, so allow a repeat
        // export to replace the prior file instead of failing as a duplicate.
        file.create({ overwrite: true });
      }
      file.write(prepareReportCsv(csv));
      if (!file.exists)
        throw new Error("The file was not created in the selected folder.");
      setExportMessage(
        Platform.OS === "android"
          ? `Saved ${filename} to the selected folder.`
          : `Saved ${filename} in the app's Documents folder.`,
      );
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : String(exportError);
      setError(`CSV export failed: ${message}`);
    }
  }

  function resetFilters() {
    const today = todayInputDate();
    setFromDate(today);
    setToDate(today);
    setRegion("");
    setZone("");
    setStore("");
    setStatus("");
    setExtra("");
    setSearch("");
    setError(undefined);
    setAppliedFilters({
      fromDate: today,
      toDate: today,
      region: "",
      zone: "",
      store: "",
      status: "",
      extra: "",
      search: "",
    });
  }

  return (
    <AreaPage title={report.title} subtitle={report.title}>
      <View style={styles.form}>
        <View style={styles.filterRow}>
          <View style={styles.fieldCell}>
            <DateField
              compact
              label="From Date"
              value={fromDate}
              maxDate={todayInputDate()}
              onChange={(value) => {
                setFromDate(value);
                if (validDay(value) !== undefined) {
                  setToDate(value);
                }
              }}
            />
          </View>
          <View style={styles.fieldCell}>
            <DateField
              compact
              label="To Date"
              value={toDate}
              minDate={fromDate}
              maxDate={todayInputDate()}
              onChange={setToDate}
            />
          </View>
        </View>

        {/* =================================================================== */}
        <View style={styles.filterRow}>
          <View style={styles.fieldCell}>
            <SelectField
              label=""
              value={region}
              options={regionOptions}
              placeholder="All regions"
              open={openSelect === "region"}
              onOpenChange={(open) => setOpenSelect(open ? "region" : null)}
              onChange={(value) => {
                setRegion(value);
                setZone("");
                setStore("");
              }}
            />
          </View>
          <View style={styles.fieldCell}>
            <SelectField
              label=""
              value={zone}
              options={zoneOptions}
              placeholder="All zones"
              open={openSelect === "zone"}
              onOpenChange={(open) => setOpenSelect(open ? "zone" : null)}
              onChange={(value) => {
                setZone(value);
                setStore("");
              }}
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.fieldCell}>
            <SelectField
              label=""
              value={store}
              options={storeOptions}
              placeholder="All stores"
              open={openSelect === "store"}
              onOpenChange={(open) => setOpenSelect(open ? "store" : null)}
              onChange={setStore}
            />
          </View>
          {"statuses" in report && report.statuses && (
            <View style={styles.fieldCell}>
              <SelectField
                label=""
                value={status}
                options={toOptions(report.statuses)}
                placeholder={`All ${report.statusLabel}`}
                open={openSelect === "status"}
                onOpenChange={(open) => setOpenSelect(open ? "status" : null)}
                onChange={setStatus}
              />
            </View>
          )}
          {"extras" in report && report.extras && (
            <View style={styles.fieldCell}>
              <SelectField
                // label={report.extraLabel}
                label=""
                value={extra}
                options={toOptions(report.extras)}
                placeholder="All"
                open={openSelect === "extra"}
                onOpenChange={(open) => setOpenSelect(open ? "extra" : null)}
                onChange={setExtra}
              />
            </View>
          )}
          {"searchOnly" in report && report.searchOnly && (
            <View style={styles.fieldCell}>
              <AppInput
                label={report.extraLabel}
                placeholder="Search report"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <AppButton
            title="Export"
            variant="outline"
            onPress={exportReport}
            disabled={loading}
          />

          <AppButton title="Reset" variant="outline" onPress={resetFilters} />
          <AppButton
            title={loading ? "Loading…" : "Filter"}
            onPress={filterReport}
            disabled={loading}
            style={styles.actionButton}
          />
        </View>
      </View>

      {exportMessage && (
        <Text style={styles.exportMessage}>{exportMessage}</Text>
      )}
      {exceedsTableDateRange(fromDate, toDate) && (
        <Text style={styles.tableHint}>
          You can export full range data. Only the first 7 days from the
          selected start date are visible in the table.
        </Text>
      )}

      {visibleError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {visibleError}
        </Text>
      )}
      {!visibleError && (
        <ReportTable
          reportId={reportId}
          rows={rows}
          offset={offset}
          currentPage={currentPage}
          pageSize={pageSize}
          total={total}
          goToPage={goToPage}
          loading={loading}
        />
      )}
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  footfallBadge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  footfallBadgeText: { fontSize: 12, fontWeight: "600" },
  form: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  fieldCell: { flex: 1, minWidth: 0 },
  fieldLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  dateButtonWrap: { position: "relative", marginTop: SPACING.xs },
  dateButton: {
    width: "100%",
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  dateText: {
    width: "100%",
    textAlign: "left",
    color: COLORS.text,
    paddingRight: SPACING.xl,
  },
  dateIcon: {
    position: "absolute",
    top: 0,
    right: SPACING.sm,
    bottom: 0,
    justifyContent: "center",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },

  exportMessage: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  // actionRow: { flexDirection: "row", gap: SPACING.sm },

  // ===============================================================
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  smallActionButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },

  filterActionButton: {
    flex: 2,
    minWidth: 0,
    paddingHorizontal: SPACING.xs,
  },
  // ===============================================================
  actionButton: { flex: 1, minWidth: 0, paddingHorizontal: SPACING.xs },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
  },
  empty: { color: COLORS.textLight, textAlign: "center", padding: SPACING.lg },
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  // tableHint: { padding: SPACING.sm, color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  tableHint: {
    padding: SPACING.sm,
    color: COLORS.danger,
    fontSize: FONT_SIZE.xs,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tableHeader: { backgroundColor: COLORS.primary, color: "#fff" },

  // tableHeader: { backgroundColor: "#fff" },
  tableCell: {
    width: 160,
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
  },
  numberCell: { width: 64 },
  // headerText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  headerText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  alternateRow: { backgroundColor: COLORS.surface },
  dataLabel: {
    flexShrink: 1,
    maxWidth: "45%",
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    textTransform: "capitalize",
  },
  dataValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    textAlign: "left",
  },
});

// =================================================================================================================

// import { AppButton } from "@/components/AppButton";
// import { AppInput } from "@/components/AppInput";
// import AreaIcon from "@/components/AreaIcon";
// import AreaPage from "@/components/AreaPage";
// import DateField from "@/components/DateField";
// import SelectField, { type SelectOption } from "@/components/SelectField";
// import DynamicDataTable from "@/components/table/DynamicAutoDataTable";
// import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
// import { getAuthToken } from "@/storage/authStorage";
// import { getSavedCompany } from "@/storage/companyStorage";
// // import { DateTimePicker } from "@expo/ui/community/datetime-picker";
// import { Directory, File, Paths } from "expo-file-system";
// import { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   Modal,
//   Platform,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
//   useWindowDimensions,
// } from "react-native";

// import { loadLocationFilterOptions } from "../services/locationFilters";
// import { prepareReportCsv } from "../services/reportCsv";
// import {
//   exceedsTableDateRange,
//   tableDateRange,
// } from "../services/reportDateRange";
// import {
//   REGISTER_TABLE_COLUMNS,
//   staticReportCells,
// } from "../services/reportTableColumns";
// import { isPickerCancellation } from "../services/trackerText";
// import { usePagination } from "../services/usePagination";

// const REPORTS = {
//   alteration: {
//     title: "Alteration Report",
//     statusLabel: "Remark",
//     statuses: ["Used", "Not Used"],
//   },
//   footfall: {
//     title: "Footfall Report",
//     statusLabel: "Remark",
//     statuses: ["Complete", "Partial"],
//     extraLabel: "Alert Type",
//     extras: ["High Footfall", "Low Footfall"],
//   },
//   exchange: { title: "Exchange Report" },
//   electricity: {
//     title: "Electricity Report",
//     statusLabel: "Remark",
//     statuses: ["Low PF", "Unusual", "No Data"],
//   },
//   generator: {
//     title: "Generator Report",
//     statusLabel: "Remark",
//     statuses: ["Unusual", "No Data", "Partial", "Wrong Data", "Mall Store"],
//   },
//   hk_sg: { title: "HK & SG Report" },
//   lost_found: { title: "Lost & Found Report" },
//   scrap: { title: "Scrap Report" },
//   global_count: { title: "Global Count Report" },
//   pi: { title: "PI Report" },
//   key_movement: { title: "Key Movement Report" },
//   fmcg_price_mismatch: {
//     title: "FMCG Price Mismatch",
//     extraLabel: "Search",
//     searchOnly: true,
//   },
// } as const;

// export type RegisterReportId = keyof typeof REPORTS;
// type ReportConfig = (typeof REPORTS)[RegisterReportId];
// type ReportRow = Record<string, unknown> & { id: string };
// type ReportFilters = {
//   fromDate: string;
//   toDate: string;
//   region: string;
//   zone: string;
//   store: string;
//   status: string;
//   extra: string;
//   search?: string;
// };

// const REPORT_PAGE_SIZE = 50;
// // company.api_url already ends in /api/v1, so these are relative to that.
// const REGISTER_API_BASE = "report/";
// const REPORT_ENDPOINTS: Record<
//   RegisterReportId,
//   { path: string; exportPath: string; method: "POST" }
// > = {
//   alteration: {
//     path: `${REGISTER_API_BASE}register_alteration_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_alteration_export.php`,
//     method: "POST",
//   },
//   footfall: {
//     path: `${REGISTER_API_BASE}register_footfall_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_footfall_export.php`,
//     method: "POST",
//   },
//   exchange: {
//     path: `${REGISTER_API_BASE}register_exchange_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_exchange_export.php`,
//     method: "POST",
//   },
//   electricity: {
//     path: `${REGISTER_API_BASE}register_electricity_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_electricity_export.php`,
//     method: "POST",
//   },
//   generator: {
//     path: `${REGISTER_API_BASE}register_generator_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_generator_export.php`,
//     method: "POST",
//   },
//   hk_sg: {
//     path: `${REGISTER_API_BASE}register_hk_sg_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_hk_sg_export.php`,
//     method: "POST",
//   },
//   lost_found: {
//     path: `${REGISTER_API_BASE}register_lost_found_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_lost_found_export.php`,
//     method: "POST",
//   },
//   scrap: {
//     path: `${REGISTER_API_BASE}register_scrap_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_scrap_export.php`,
//     method: "POST",
//   },
//   global_count: {
//     path: `${REGISTER_API_BASE}register_global_count_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_global_count_export.php`,
//     method: "POST",
//   },
//   pi: {
//     path: `${REGISTER_API_BASE}register_pi_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_pi_export.php`,
//     method: "POST",
//   },
//   key_movement: {
//     path: `${REGISTER_API_BASE}register_key_movement_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_key_movement_export.php`,
//     method: "POST",
//   },
//   fmcg_price_mismatch: {
//     path: `${REGISTER_API_BASE}register_fmcg_price_mismatch_view.php`,
//     exportPath: `${REGISTER_API_BASE}register_fmcg_price_mismatch_export.php`,
//     method: "POST",
//   },
// };

// // ==============================================
// // COMPANY BASE URL + TOKEN
// // ==============================================

// async function getRegisterBaseUrl(): Promise<string> {
//   const company = await getSavedCompany();

//   if (!company?.api_url) {
//     throw new Error("Company API URL not found. Please select a company.");
//   }

//   return company.api_url.replace(/\/+$/, ""); // already ends in /api/v1
// }

// async function getRegisterToken(): Promise<string> {
//   const token = await getAuthToken();

//   if (!token) {
//     throw new Error("Login session not found. Please log in again.");
//   }

//   return token;
// }

// async function readRegisterJson(
//   response: Response,
//   endpoint: string,
// ): Promise<unknown> {
//   const body = await response.text();
//   let payload: unknown;
//   try {
//     payload = body.trim() ? JSON.parse(body.replace(/^\uFEFF/, "")) : null;
//   } catch {
//     payload = null;
//   }
//   if (!response.ok) {
//     const serverMessage =
//       typeof payload === "object" &&
//       payload !== null &&
//       "message" in payload &&
//       typeof payload.message === "string"
//         ? payload.message
//         : "";
//     if (response.status === 404)
//       throw new Error(
//         "Unable to load this report right now. Please try again.",
//       );
//     if (response.status >= 500)
//       throw new Error(
//         `Register API server error (HTTP ${response.status}) at ${endpoint}. ${serverMessage || "Check the PHP error log and deploy the complete register API files."}`,
//       );
//     throw new Error(
//       serverMessage ||
//         `Register request failed (HTTP ${response.status}) at ${endpoint}.`,
//     );
//   }
//   if (payload === null)
//     throw new Error(
//       `Register API did not return JSON at ${endpoint}. Check your login session and server deployment.`,
//     );
//   return payload;
// }
// function todayInputDate(): string {
//   const today = new Date();
//   return [
//     today.getFullYear(),
//     String(today.getMonth() + 1).padStart(2, "0"),
//     String(today.getDate()).padStart(2, "0"),
//   ].join("-");
// }

// function toOptions(values: readonly string[]): SelectOption[] {
//   return values.map((value) => ({ value, label: value }));
// }

// function rowsFromResponse(value: unknown, maximumRows?: number): ReportRow[] {
//   const rawRows = Array.isArray(value)
//     ? value
//     : typeof value === "object" &&
//         value !== null &&
//         "data" in value &&
//         Array.isArray(value.data)
//       ? value.data
//       : null;
//   if (!rawRows)
//     throw new Error("The report API returned an unexpected response format.");
//   const rows =
//     maximumRows === undefined ? rawRows : rawRows.slice(0, maximumRows);
//   return rows
//     .filter(
//       (row): row is Record<string, unknown> =>
//         typeof row === "object" && row !== null,
//     )
//     .map((row, index) => ({
//       ...row,
//       id: String(row.id ?? row.ID ?? `report-${index}`),
//     }));
// }

// async function fetchReportRows(
//   reportId: RegisterReportId,
//   filters: ReportFilters,
//   offset = 0,
//   limit = REPORT_PAGE_SIZE,
//   signal?: AbortSignal,
// ): Promise<{ rows: ReportRow[]; total: number }> {
//   const baseUrl = await getRegisterBaseUrl();
//   const token = await getRegisterToken();

//   const endpoint = REPORT_ENDPOINTS[reportId];
//   const tableRange = tableDateRange(filters.fromDate, filters.toDate);
//   const params = new URLSearchParams({
//     from: tableRange.from,
//     to: tableRange.to,
//     region: filters.region,
//     zone: filters.zone,
//     store: filters.store,
//     status: filters.status,
//     alertType: reportId === "footfall" ? filters.extra : "",
//     draw: String(Math.floor(offset / limit) + 1),
//     start: String(offset),
//     length: String(limit),
//     search: filters.search ?? "",
//   });
//   const url = `${baseUrl}/${endpoint.path}`;
//   const response = await fetch(url, {
//     method: endpoint.method,
//     signal,
//     headers: {
//       Accept: "application/json",
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
//     },
//     body: params.toString(),
//   });
//   const data = await readRegisterJson(response, endpoint.path);
//   if (
//     !response.ok ||
//     (typeof data === "object" &&
//       data !== null &&
//       "success" in data &&
//       data.success === false)
//   ) {
//     throw new Error(
//       typeof data === "object" && data !== null && "message" in data
//         ? String(data.message)
//         : `Report request failed (${response.status}).`,
//     );
//   }
//   const rows = rowsFromResponse(data, limit);
//   const total = Number(
//     (data as { recordsFiltered?: unknown }).recordsFiltered ?? rows.length,
//   );
//   return { rows, total: Number.isFinite(total) ? total : rows.length };
// }

// // ========================================================================================

// function ReportTable({
//   reportId,
//   rows,
//   offset,
//   currentPage,
//   pageSize,
//   total,
//   goToPage,
//   loading,
// }: {
//   reportId: RegisterReportId;
//   rows: ReportRow[];
//   offset: number;
//   currentPage: number;
//   pageSize: number;
//   total: number;
//   loading: boolean;
//   goToPage: (page: number) => void;
// }) {
//   const { height } = useWindowDimensions();

//   const columns = REGISTER_TABLE_COLUMNS[reportId];

//   const tableColumns = useMemo(
//     () => [
//       {
//         title: "#",
//         dataIndex: "serial",
//         width: 60,
//         align: "center" as const,
//         searchable: false,
//       },
//       ...columns.map((column) => ({
//         title: column.title,
//         dataIndex: column.data,
//         minWidth: 50,
//         searchable: true,
//       })),
//     ],
//     [columns],
//   );

//   const tableData = useMemo(
//     () =>
//       rows.map((row, index) => {
//         const cells = staticReportCells(row, columns);

//         const data: Record<string, unknown> = {
//           id: row.id,
//           serial: offset + index + 1,
//         };

//         columns.forEach((column, columnIndex) => {
//           data[column.data] = cells[columnIndex] ?? "-";
//         });

//         return data;
//       }),
//     [rows, columns, offset],
//   );

//   return (
//     <DynamicDataTable
//       columns={tableColumns}
//       data={tableData}
//       height={Math.max(240, Math.min(560, height * 0.6))}
//       // refreshKey={`${reportId}-${offset}-${rows.length}`}
//       refreshKey={reportId}
//       showPagination={true}
//       serverSidePagination={true}
//       currentPage={currentPage}
//       pageSize={pageSize}
//       totalRecords={total}
//       onPageChange={goToPage}
//       loading={loading}
//       showSearch={false}
//       showColumnFilter={false}
//     />
//   );
// }
// // ==============================================================================
// function validDay(value: string): number | undefined {
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
//   const parsed = Date.parse(`${value}T00:00:00Z`);
//   return Number.isFinite(parsed) &&
//     new Date(parsed).toISOString().slice(0, 10) === value
//     ? parsed
//     : undefined;
// }

// export default function RegisterReportScreen({
//   reportId,
// }: {
//   reportId: RegisterReportId;
// }) {
//   const report: ReportConfig = REPORTS[reportId];
//   const [region, setRegion] = useState("");
//   const [zone, setZone] = useState("");
//   const [store, setStore] = useState("");
//   const [regionOptions, setRegions] = useState<SelectOption[]>([]);
//   const [zoneOptions, setZones] = useState<SelectOption[]>([]);
//   const [storeOptions, setStores] = useState<SelectOption[]>([]);
//   const [fromDate, setFromDate] = useState(todayInputDate);
//   const [toDate, setToDate] = useState(todayInputDate);
//   const [status, setStatus] = useState("");
//   const [extra, setExtra] = useState("");
//   const [search, setSearch] = useState("");
//   const [openSelect, setOpenSelect] = useState<string | null>(null);
//   const pageSize = REPORT_PAGE_SIZE;
//   const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
//     fromDate: todayInputDate(),
//     toDate: todayInputDate(),
//     region: "",
//     zone: "",
//     store: "",
//     status: "",
//     extra: "",
//   });
//   const [error, setError] = useState<string>();
//   const [exportMessage, setExportMessage] = useState<string>();
//   // const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
//   // const [draftPickerDate, setDraftPickerDate] = useState(new Date());
//   const queryKey = useMemo(
//     () => JSON.stringify([reportId, appliedFilters]),
//     [appliedFilters, reportId],
//   );

//   const fetchPage = useCallback(
//     async (requestedPage: number, limit: number, signal: AbortSignal) => {
//       const result = await fetchReportRows(
//         reportId,
//         appliedFilters,
//         (requestedPage - 1) * limit,
//         limit,
//         signal,
//       );
//       return { data: result.rows, total: result.total };
//     },
//     [appliedFilters, reportId],
//   );
//   const {
//     data: rows,
//     total,
//     page: currentPage,
//     loading,
//     error: pageError,
//     goToPage,
//   } = usePagination<ReportRow>({
//     queryKey,
//     limit: pageSize,
//     fetchPage,
//   });
//   const offset = (currentPage - 1) * pageSize;

//   const visibleError = error ?? pageError;

//   useEffect(() => {
//     let active = true;
//     loadLocationFilterOptions(region, zone)
//       .then((data) => {
//         if (!active) return;
//         setRegions(data.regions.map((value) => ({ value, label: value })));
//         setZones(data.zones.map((value) => ({ value, label: value })));
//         setStores(
//           data.stores.map((item) => ({ value: item.id, label: item.name })),
//         );
//       })
//       .catch((cause) => {
//         if (active)
//           setError(
//             cause instanceof Error
//               ? cause.message
//               : "Unable to load location filters.",
//           );
//       });
//     return () => {
//       active = false;
//     };
//   }, [region, zone]);

//   function loadReport(filters: ReportFilters, searchText = "") {
//     const from = validDay(filters.fromDate);
//     const to = validDay(filters.toDate);
//     if (from === undefined || to === undefined) {
//       setError("Enter valid dates using YYYY-MM-DD.");
//       return;
//     }
//     if (
//       filters.toDate > todayInputDate() ||
//       to < from ||
//       (to - from) / 86400000 + 1 > 31
//     ) {
//       setError(
//         "Choose an end date on or after the start date, within a 31-day range.",
//       );
//       return;
//     }
//     setError(undefined);
//     setExportMessage(undefined);
//     setAppliedFilters({ ...filters, search: searchText.trim() });
//   }

//   function filterReport() {
//     void loadReport(
//       { fromDate, toDate, region, zone, store, status, extra },
//       search,
//     );
//   }
//   // function openDatePicker(target: "from" | "to") {
//   //   const current = target === "from" ? fromDate : toDate;
//   //   setDraftPickerDate(
//   //     validDay(current) === undefined
//   //       ? new Date()
//   //       : new Date(`${current}T00:00:00`),
//   //   );
//   //   setPickerTarget(target);
//   // }

//   // function savePickedDate(date: Date) {
//   //   const formatted = [
//   //     date.getFullYear(),
//   //     String(date.getMonth() + 1).padStart(2, "0"),
//   //     String(date.getDate()).padStart(2, "0"),
//   //   ].join("-");
//   //   if (pickerTarget === "from") {
//   //     setFromDate(formatted);
//   //     setToDate(formatted);
//   //   }
//   //   if (pickerTarget === "to") setToDate(formatted);
//   //   setPickerTarget(null);
//   // }

//   async function exportReport() {
//     const from = validDay(fromDate);
//     const to = validDay(toDate);
//     if (
//       from === undefined ||
//       to === undefined ||
//       to < from ||
//       (to - from) / 86400000 + 1 > 31
//     ) {
//       setError("Choose a valid date range of 31 days or less.");
//       return;
//     }
//     setError(undefined);
//     setExportMessage(undefined);
//     try {
//       const baseUrl = await getRegisterBaseUrl();
//       const token = await getRegisterToken();

//       const endpoint = REPORT_ENDPOINTS[reportId];

//       // =========================================
//       // const params = new URLSearchParams({
//       //   from: fromDate,
//       //   to: toDate,
//       //   region,
//       //   zone,
//       //   store,
//       //   status,
//       //   alertType: reportId === "footfall" ? extra : "",
//       //   search: search.trim(),
//       // });

//       const params = new URLSearchParams();

//       params.append("from", fromDate);
//       params.append("to", toDate);
//       params.append("region", region);
//       params.append("zone", zone);
//       params.append("store", store);
//       params.append("status", status);

//       params.append("alertType", reportId === "footfall" ? extra : "");

//       params.append("search", search.trim());
//       // =====================================
//       const response = await fetch(
//         `${baseUrl}/${endpoint.exportPath}?${params.toString()}`,
//         {
//           headers: {
//             Accept: "text/csv",
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );
//       const csv = await response.text();
//       if (
//         !response.ok ||
//         response.redirected ||
//         !response.headers.get("content-type")?.includes("text/csv")
//       ) {
//         throw new Error(
//           `Register export did not return CSV (HTTP ${response.status}). Check deployment and your login session.`,
//         );
//       }
//       const filename = `${reportId}-${todayInputDate()}.csv`;
//       if (Platform.OS === "web") {
//         const blob = new Blob([prepareReportCsv(csv)], {
//           type: "text/csv;charset=utf-8",
//         });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement("a");
//         link.href = url;
//         link.download = filename;
//         link.click();
//         setTimeout(() => URL.revokeObjectURL(url), 1000);
//         setExportMessage(`Downloaded ${filename}.`);
//         return;
//       }

//       // Android lets the user select a destination (such as Downloads). iOS saves to app Documents.
//       let file: File;
//       if (Platform.OS === "android") {
//         let destination: Directory;
//         try {
//           destination = await Directory.pickDirectoryAsync();
//         } catch (pickerError) {
//           if (isPickerCancellation(pickerError)) return;
//           throw pickerError;
//         }
//         if (!destination) return;

//         file = destination.createFile(filename, "text/comma-separated-values");
//       } else {
//         file = new File(Paths.document, filename);
//         // Exports use the same name per report and day, so allow a repeat
//         // export to replace the prior file instead of failing as a duplicate.
//         file.create({ overwrite: true });
//       }
//       file.write(prepareReportCsv(csv));
//       if (!file.exists)
//         throw new Error("The file was not created in the selected folder.");
//       setExportMessage(
//         Platform.OS === "android"
//           ? `Saved ${filename} to the selected folder.`
//           : `Saved ${filename} in the app's Documents folder.`,
//       );
//     } catch (exportError) {
//       const message =
//         exportError instanceof Error
//           ? exportError.message
//           : String(exportError);
//       setError(`CSV export failed: ${message}`);
//     }
//   }

//   function resetFilters() {
//     const today = todayInputDate();
//     setFromDate(today);
//     setToDate(today);
//     setRegion("");
//     setZone("");
//     setStore("");
//     setStatus("");
//     setExtra("");
//     setSearch("");
//     setError(undefined);
//     setAppliedFilters({
//       fromDate: today,
//       toDate: today,
//       region: "",
//       zone: "",
//       store: "",
//       status: "",
//       extra: "",
//       search: "",
//     });
//   }

//   return (
//     <AreaPage title={report.title} subtitle={report.title}>
//       <View style={styles.form}>
//         <View style={styles.filterRow}>
//           {Platform.OS === "web" ? (
//             <>
//               {/* <View style={styles.fieldCell}>
//                 <DateField
//                   compact
//                   label="From Date"
//                   value={fromDate}
//                   maxDate={todayInputDate()}
//                   onChange={(value) => {
//                     setFromDate(value);
//                     if (validDay(value) !== undefined) {
//                       setToDate(value);
//                     }
//                   }}
//                 />
//               </View>

//               <View style={styles.fieldCell}>
//                 <DateField
//                   compact
//                   label="To Date"
//                   value={toDate}
//                   minDate={fromDate}
//                   maxDate={todayInputDate()}
//                   onChange={setToDate}
//                 />
//               </View> */}

//               <View style={styles.filterRow}>
//                 <View style={styles.fieldCell}>
//                   <DateField
//                     compact
//                     label="From Date"
//                     value={fromDate}
//                     maxDate={todayInputDate()}
//                     onChange={(value) => {
//                       setFromDate(value);
//                       if (validDay(value) !== undefined) {
//                         setToDate(value);
//                       }
//                     }}
//                   />
//                 </View>

//                 <View style={styles.fieldCell}>
//                   <DateField
//                     compact
//                     label="To Date"
//                     value={toDate}
//                     minDate={fromDate}
//                     maxDate={todayInputDate()}
//                     onChange={setToDate}
//                   />
//                 </View>
//               </View>
//             </>
//           ) : (
//             <>
//               <View style={styles.fieldCell}>
//                 <Text style={styles.fieldLabel}>From Date</Text>

//                 <Pressable
//                   style={styles.dateInputGroup}
//                   // onPress={() => openDatePicker("from")}
//                 >
//                   <Text style={styles.dateInputValue}>{fromDate}</Text>

//                   <AreaIcon
//                     name="calendar"
//                     color={COLORS.textLight}
//                     size={19}
//                   />
//                 </Pressable>
//               </View>

//               <View style={styles.fieldCell}>
//                 <Text style={styles.fieldLabel}>To Date</Text>

//                 <Pressable
//                   style={styles.dateInputGroup}
//                   // onPress={() => openDatePicker("to")}
//                 >
//                   <Text style={styles.dateInputValue}>{toDate}</Text>

//                   <AreaIcon
//                     name="calendar"
//                     color={COLORS.textLight}
//                     size={19}
//                   />
//                 </Pressable>
//               </View>
//             </>
//           )}
//         </View>

//         {/* =================================================================== */}
//         <View style={styles.filterRow}>
//           <View style={styles.fieldCell}>
//             <SelectField
//               label=""
//               value={region}
//               options={regionOptions}
//               placeholder="All regions"
//               open={openSelect === "region"}
//               onOpenChange={(open) => setOpenSelect(open ? "region" : null)}
//               onChange={(value) => {
//                 setRegion(value);
//                 setZone("");
//                 setStore("");
//               }}
//             />
//           </View>
//           <View style={styles.fieldCell}>
//             <SelectField
//               label=""
//               value={zone}
//               options={zoneOptions}
//               placeholder="All zones"
//               open={openSelect === "zone"}
//               onOpenChange={(open) => setOpenSelect(open ? "zone" : null)}
//               onChange={(value) => {
//                 setZone(value);
//                 setStore("");
//               }}
//             />
//           </View>
//         </View>
//         <View style={styles.filterRow}>
//           <View style={styles.fieldCell}>
//             <SelectField
//               label=""
//               value={store}
//               options={storeOptions}
//               placeholder="All stores"
//               open={openSelect === "store"}
//               onOpenChange={(open) => setOpenSelect(open ? "store" : null)}
//               onChange={setStore}
//             />
//           </View>
//           {"statuses" in report && report.statuses && (
//             <View style={styles.fieldCell}>
//               <SelectField
//                 label=""
//                 value={status}
//                 options={toOptions(report.statuses)}
//                 placeholder={`All ${report.statusLabel}`}
//                 open={openSelect === "status"}
//                 onOpenChange={(open) => setOpenSelect(open ? "status" : null)}
//                 onChange={setStatus}
//               />
//             </View>
//           )}
//           {"extras" in report && report.extras && (
//             <View style={styles.fieldCell}>
//               <SelectField
//                 // label={report.extraLabel}
//                 label=""
//                 value={extra}
//                 options={toOptions(report.extras)}
//                 placeholder="All"
//                 open={openSelect === "extra"}
//                 onOpenChange={(open) => setOpenSelect(open ? "extra" : null)}
//                 onChange={setExtra}
//               />
//             </View>
//           )}
//           {"searchOnly" in report && report.searchOnly && (
//             <View style={styles.fieldCell}>
//               <AppInput
//                 label={report.extraLabel}
//                 placeholder="Search report"
//                 value={search}
//                 onChangeText={setSearch}
//               />
//             </View>
//           )}
//         </View>

//         <View style={styles.actionRow}>
//           <AppButton
//             title="Export"
//             variant="outline"
//             onPress={exportReport}
//             disabled={loading}
//           />

//           <AppButton title="Reset" variant="outline" onPress={resetFilters} />
//           <AppButton
//             title={loading ? "Loading…" : "Filter"}
//             onPress={filterReport}
//             disabled={loading}
//             style={styles.actionButton}
//           />
//         </View>
//       </View>

//       {exportMessage && (
//         <Text style={styles.exportMessage}>{exportMessage}</Text>
//       )}
//       {exceedsTableDateRange(fromDate, toDate) && (
//         <Text style={styles.tableHint}>
//           You can export full range data. Only the first 7 days from the
//           selected start date are visible in the table.
//         </Text>
//       )}

//       {visibleError && (
//         <Text accessibilityRole="alert" style={styles.error}>
//           {visibleError}
//         </Text>
//       )}
//       {!visibleError && rows.length === 0 && (
//         <Text style={styles.empty}>
//           {loading
//             ? "Loading report data…"
//             : "No report rows match these filters."}
//         </Text>
//       )}
//       {!visibleError && rows.length > 0 && (
//         <ReportTable
//           reportId={reportId}
//           rows={rows}
//           offset={offset}
//           currentPage={currentPage}
//           pageSize={pageSize}
//           total={total}
//           goToPage={goToPage}
//           loading={loading}
//         />
//       )}
//       {pickerTarget && Platform.OS === "android" && (
//         <DateTimePicker
//           value={draftPickerDate}
//           maximumDate={new Date()}
//           minimumDate={
//             pickerTarget === "to" ? new Date(`${fromDate}T00:00:00`) : undefined
//           }
//           mode="date"
//           // presentation="dialog"
//           // accentColor={COLORS.primary}
//           onValueChange={(_, date) => savePickedDate(date)}
//           onDismiss={() => setPickerTarget(null)}
//         />
//       )}
//       {pickerTarget && Platform.OS === "ios" && (
//         <Modal
//           transparent
//           animationType="slide"
//           visible
//           // onRequestClose={() => setPickerTarget(null)}
//         >
//           <View style={styles.pickerOverlay}>
//             <View style={styles.pickerCard}>
//               <View style={styles.pickerActions}>
//                 <AppButton
//                   title="Cancel"
//                   variant="outline"
//                   // onPress={() => setPickerTarget(null)}
//                 />
//                 <AppButton
//                   title="Done"
//                   // onPress={() => savePickedDate(draftPickerDate)}
//                 />
//               </View>
//               {/* <DateTimePicker
//                 value={draftPickerDate}
//                 maximumDate={new Date()}
//                 minimumDate={
//                   pickerTarget === "to"
//                     ? new Date(`${fromDate}T00:00:00`)
//                     : undefined
//                 }
//                 mode="date"
//                 display="inline"
//                 accentColor={COLORS.primary}
//                 onValueChange={(_, date) => setDraftPickerDate(date)}
//               /> */}

//               <DateTimePicker
//                 // value={draftPickerDate}
//                 maximumDate={new Date()}
//                 // minimumDate={
//                 //   pickerTarget === "to"
//                 //     ? new Date(`${fromDate}T00:00:00`)
//                 //     : undefined
//                 // }
//                 mode="date"
//                 presentation="dialog"
//                 accentColor="#C62828"
//                 // onValueChange={(_, date) => savePickedDate(date)}
//                 // onDismiss={() => setPickerTarget(null)}
//               />
//             </View>
//           </View>
//         </Modal>
//       )}
//     </AreaPage>
//   );
// }

// const styles = StyleSheet.create({
//   footfallBadge: {
//     alignSelf: "flex-start",
//     borderRadius: 12,
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//   },
//   footfallBadgeText: { fontSize: 12, fontWeight: "600" },
//   form: {
//     backgroundColor: COLORS.white,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     borderRadius: 12,
//     padding: SPACING.md,
//     gap: SPACING.md,
//   },
//   filterRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     gap: SPACING.sm,
//   },
//   fieldCell: { flex: 1, minWidth: 0 },
//   fieldLabel: {
//     color: COLORS.text,
//     fontSize: FONT_SIZE.sm,
//     fontWeight: FONT_WEIGHT.medium,
//   },
//   dateButtonWrap: { position: "relative", marginTop: SPACING.xs },
//   dateButton: {
//     width: "100%",
//     minHeight: 48,
//     justifyContent: "center",
//     backgroundColor: COLORS.white,
//     borderColor: COLORS.border,
//   },
//   dateText: {
//     width: "100%",
//     textAlign: "left",
//     color: COLORS.text,
//     paddingRight: SPACING.xl,
//   },
//   dateIcon: {
//     position: "absolute",
//     top: 0,
//     right: SPACING.sm,
//     bottom: 0,
//     justifyContent: "center",
//   },
//   sectionTitle: {
//     color: COLORS.text,
//     fontSize: FONT_SIZE.md,
//     fontWeight: FONT_WEIGHT.bold,
//   },

//   exportMessage: {
//     color: COLORS.textLight,
//     fontSize: FONT_SIZE.sm,
//     textAlign: "center",
//   },
//   // actionRow: { flexDirection: "row", gap: SPACING.sm },

//   // ===============================================================
//   actionRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: SPACING.sm,
//   },

//   smallActionButton: {
//     flex: 1,
//     minWidth: 0,
//     paddingHorizontal: 4,
//   },

//   filterActionButton: {
//     flex: 2,
//     minWidth: 0,
//     paddingHorizontal: SPACING.xs,
//   },
//   // ===============================================================
//   actionButton: { flex: 1, minWidth: 0, paddingHorizontal: SPACING.xs },
//   error: {
//     color: COLORS.danger,
//     fontSize: FONT_SIZE.sm,
//     backgroundColor: COLORS.white,
//     padding: SPACING.md,
//     borderRadius: 8,
//   },
//   empty: { color: COLORS.textLight, textAlign: "center", padding: SPACING.lg },
//   tableContainer: {
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     borderRadius: 10,
//     overflow: "hidden",
//     backgroundColor: COLORS.white,
//   },
//   // tableHint: { padding: SPACING.sm, color: COLORS.textLight, fontSize: FONT_SIZE.xs },
//   tableHint: {
//     padding: SPACING.sm,
//     color: COLORS.danger,
//     fontSize: FONT_SIZE.xs,
//     fontWeight: "bold",
//   },
//   tableRow: {
//     flexDirection: "row",
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: COLORS.border,
//   },
//   tableHeader: { backgroundColor: COLORS.primary, color: "#fff" },

//   // tableHeader: { backgroundColor: "#fff" },
//   tableCell: {
//     width: 160,
//     padding: SPACING.sm,
//     color: COLORS.text,
//     fontSize: FONT_SIZE.sm,
//     borderRightWidth: StyleSheet.hairlineWidth,
//     borderRightColor: COLORS.border,
//   },
//   numberCell: { width: 64 },
//   // headerText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
//   headerText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
//   alternateRow: { backgroundColor: COLORS.surface },
//   dataLabel: {
//     flexShrink: 1,
//     maxWidth: "45%",
//     color: COLORS.textLight,
//     fontSize: FONT_SIZE.xs,
//     textTransform: "capitalize",
//   },
//   dataValue: {
//     flex: 1,
//     color: COLORS.text,
//     fontSize: FONT_SIZE.sm,
//     textAlign: "left",
//   },
//   pickerOverlay: {
//     flex: 1,
//     justifyContent: "flex-end",
//     backgroundColor: "rgba(0,0,0,0.45)",
//   },
//   pickerCard: {
//     backgroundColor: COLORS.white,
//     padding: SPACING.md,
//     paddingBottom: SPACING.xl,
//     gap: SPACING.sm,
//     borderTopLeftRadius: 18,
//     borderTopRightRadius: 18,
//   },
//   pickerActions: {
//     flexDirection: "row",
//     justifyContent: "flex-end",
//     gap: SPACING.sm,
//   },

//   dateInputGroup: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     borderRadius: 8,
//     backgroundColor: COLORS.white,
//     paddingHorizontal: 12,
//     minHeight: 35,
//     marginTop: 4,
//   },

//   dateInputLabel: {
//     fontSize: 10,
//     color: COLORS.textLight,
//   },

//   dateInputValue: {
//     fontSize: FONT_SIZE.sm,
//     color: COLORS.text,
//     fontWeight: FONT_WEIGHT.medium,
//   },
// });
