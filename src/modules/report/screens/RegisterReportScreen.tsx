import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import AreaIcon from "@/components/AreaIcon";
import AreaPage from "@/components/AreaPage";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import DateField from "../../../components/DateField";
import SelectField, {
    type SelectOption,
} from "../../../components/SelectField";
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
  const response = await fetch(url, {
    method: endpoint.method,
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

function ReportTable({
  reportId,
  rows,
  offset,
}: {
  reportId: RegisterReportId;
  rows: ReportRow[];
  offset: number;
}) {
  const { height } = useWindowDimensions();
  const columns = REGISTER_TABLE_COLUMNS[reportId];
  const tableRows = rows.map((row) => ({
    ...row,
    cells: staticReportCells(row, columns),
  }));
  return (
    <View style={styles.tableContainer}>
      {/* <Text style={styles.tableHint}>
        Swipe left or right to view all columns
      </Text> */}
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        <ScrollView
          key={offset}
          style={{
            maxHeight: Math.max(180, Math.min(560, height * 0.6)),
            width: 64 + columns.length * 160,
          }}
          stickyHeaderIndices={[0]}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <View>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text
                accessibilityRole="header"
                style={[styles.tableCell, styles.numberCell, styles.headerText]}
              >
                #
              </Text>
              {columns.map((column) => (
                <Text
                  key={column.data}
                  accessibilityRole="header"
                  style={[styles.tableCell, styles.headerText]}
                >
                  {column.title}
                </Text>
              ))}
            </View>
          </View>
          {tableRows.map((row, index) => (
            <View
              key={`${row.id}-${index}`}
              style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}
            >
              <Text style={[styles.tableCell, styles.numberCell]}>
                {offset + index + 1}
              </Text>
              {row.cells.map((value, columnIndex) => {
                const field = columns[columnIndex].data;
                const badge =
                  reportId === "footfall" &&
                  field === "alert_status" &&
                  value !== "-" &&
                  value !== "\u2014";
                const status = value.trim().toLowerCase();
                const colors =
                  status === "complete"
                    ? { backgroundColor: "#E4F3E8", color: "#186B32" }
                    : status === "partial" || status === "high footfall"
                      ? { backgroundColor: "#FFF0B3", color: "#805500" }
                      : status === "low footfall" || status === "not verified"
                        ? { backgroundColor: "#FCE5E5", color: "#A6212E" }
                        : { backgroundColor: "#EEEEEE", color: "#555555" };
                return badge ? (
                  <View key={field} style={styles.tableCell}>
                    <View
                      style={[
                        styles.footfallBadge,
                        { backgroundColor: colors.backgroundColor },
                      ]}
                    >
                      <Text
                        accessibilityLabel={`${columns[columnIndex].title}: ${value}`}
                        style={[
                          styles.footfallBadgeText,
                          { color: colors.color },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text key={field} selectable style={styles.tableCell}>
                    {value}
                  </Text>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

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
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const pageSize = REPORT_PAGE_SIZE;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);
  const firstVisiblePage = currentPage;
  const visiblePages = Array.from(
    { length: Math.max(0, Math.min(5, totalPages - firstVisiblePage + 1)) },
    (_, index) => firstVisiblePage + index,
  );
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    fromDate: todayInputDate(),
    toDate: todayInputDate(),
    region: "",
    zone: "",
    store: "",
    status: "",
    extra: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [exportMessage, setExportMessage] = useState<string>();
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [draftPickerDate, setDraftPickerDate] = useState(new Date());

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

  useEffect(() => {
    let active = true;
    const today = todayInputDate();
    setLoading(true);
    fetchReportRows(reportId, {
      fromDate: today,
      toDate: today,
      region,
      zone,
      store,
      status: "",
      extra: "",
    })
      .then((result) => {
        if (active) {
          setRows(result.rows);
          setTotal(result.total);
          setOffset(0);
          setError(undefined);
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load report data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reportId]);

  async function loadReport(
    filters: ReportFilters,
    searchText = "",
    nextOffset = 0,
    limit = pageSize,
  ) {
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
    setLoading(true);
    try {
      const applied = { ...filters, search: searchText.trim() };
      const result = await fetchReportRows(
        reportId,
        applied,
        nextOffset,
        limit,
      );
      setRows(result.rows);
      setTotal(result.total);
      setOffset(nextOffset);
      setAppliedFilters(applied);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load report data.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function filterReport() {
    void loadReport(
      { fromDate, toDate, region, zone, store, status, extra },
      search,
    );
  }
  function openDatePicker(target: "from" | "to") {
    const current = target === "from" ? fromDate : toDate;
    setDraftPickerDate(
      validDay(current) === undefined
        ? new Date()
        : new Date(`${current}T00:00:00`),
    );
    setPickerTarget(target);
  }

  function savePickedDate(date: Date) {
    const formatted = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    if (pickerTarget === "from") {
      setFromDate(formatted);
      setToDate(formatted);
    }
    if (pickerTarget === "to") setToDate(formatted);
    setPickerTarget(null);
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
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        region,
        zone,
        store,
        status,
        alertType: reportId === "footfall" ? extra : "",
        search: search.trim(),
      });
      const response = await fetch(
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
    void loadReport(
      {
        fromDate: today,
        toDate: today,
        region: "",
        zone: "",
        store: "",
        status: "",
        extra: "",
      },
      "",
    );
  }

  return (
    <AreaPage title={report.title} subtitle={report.title}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Filters</Text>
        <View style={styles.filterRow}>
          {Platform.OS === "web" ? (
            <>
              <View style={styles.fieldCell}>
                <DateField
                  compact
                  label="From Date"
                  value={fromDate}
                  maxDate={todayInputDate()}
                  onChange={(value) => {
                    setFromDate(value);
                    if (validDay(value) !== undefined) setToDate(value);
                  }}
                />
              </View>
              <View style={styles.fieldCell}>
                <DateField
                  compact
                  label="To Date"
                  value={toDate}
                  maxDate={todayInputDate()}
                  minDate={fromDate}
                  onChange={setToDate}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldCell}>
                <Text style={styles.fieldLabel}>From Date</Text>
                <View style={styles.dateButtonWrap}>
                  <AppButton
                    title={fromDate}
                    variant="outline"
                    onPress={() => openDatePicker("from")}
                    style={styles.dateButton}
                    textStyle={styles.dateText}
                  />
                  <View pointerEvents="none" style={styles.dateIcon}>
                    <AreaIcon
                      name="calendar"
                      color={COLORS.textLight}
                      size={19}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.fieldCell}>
                <Text style={styles.fieldLabel}>To Date</Text>
                <View style={styles.dateButtonWrap}>
                  <AppButton
                    title={toDate}
                    variant="outline"
                    onPress={() => openDatePicker("to")}
                    style={styles.dateButton}
                    textStyle={styles.dateText}
                  />
                  <View pointerEvents="none" style={styles.dateIcon}>
                    <AreaIcon
                      name="calendar"
                      color={COLORS.textLight}
                      size={19}
                    />
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
        <View style={styles.filterRow}>
          <View style={styles.fieldCell}>
            <SelectField
              label="Region"
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
              label="Zone"
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
              label="Store Name"
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
                label={report.statusLabel}
                value={status}
                options={toOptions(report.statuses)}
                placeholder="All"
                open={openSelect === "status"}
                onOpenChange={(open) => setOpenSelect(open ? "status" : null)}
                onChange={setStatus}
              />
            </View>
          )}
          {"extras" in report && report.extras && (
            <View style={styles.fieldCell}>
              <SelectField
                label={report.extraLabel}
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
        <Text style={styles.demoNotice}>
          {loading
            ? "Loading report data…"
            : `${rows.length} of ${total} report records`}
        </Text>
        {exportMessage && (
          <Text style={styles.exportMessage}>{exportMessage}</Text>
        )}
        {exceedsTableDateRange(fromDate, toDate) && (
          <Text style={styles.tableHint}>
            You can export full range data. Only the first 7 days from the
            selected start date are visible in the table.
          </Text>
        )}
        <View style={styles.actionRow}>
          <AppButton
            title={loading ? "Loading…" : "Filter Report"}
            onPress={filterReport}
            disabled={loading}
            style={styles.actionButton}
          />
          <AppButton
            title="Export CSV"
            variant="outline"
            onPress={exportReport}
            disabled={loading}
            style={styles.actionButton}
          />
        </View>
        <AppButton
          title="Reset Filters"
          variant="outline"
          onPress={resetFilters}
        />
      </View>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {!error && rows.length === 0 && (
        <Text style={styles.empty}>
          {loading
            ? "Loading report data…"
            : "No report rows match these filters."}
        </Text>
      )}
      {!loading && !error && rows.length > 0 && (
        <ReportTable reportId={reportId} rows={rows} offset={offset} />
      )}
      {!error && total > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.pageLabel}>
            Page {currentPage} of {totalPages}
            {" | "}
            {offset + 1}-{Math.min(offset + rows.length, total)} of {total}
          </Text>
          <View style={styles.pagination}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous page"
              accessibilityState={{ disabled: loading || offset === 0 }}
              style={({ pressed }) => [
                styles.pageIconButton,
                { opacity: loading || offset === 0 ? 0.4 : pressed ? 0.7 : 1 },
              ]}
              disabled={loading || offset === 0}
              onPress={() =>
                void loadReport(
                  appliedFilters,
                  appliedFilters.search,
                  Math.max(0, offset - pageSize),
                )
              }
            >
              <View style={styles.previousIcon}>
                <AreaIcon name="chevron" size={16} color={COLORS.primary} />
              </View>
            </Pressable>
            {visiblePages.map((page) => (
              <AppButton
                key={page}
                title={String(page)}
                accessibilityLabel={`Page ${page}${page === currentPage ? ", current page" : ""}`}
                variant={page === currentPage ? "primary" : "outline"}
                disabled={loading}
                style={styles.pageButton}
                textStyle={styles.pageButtonText}
                onPress={() => {
                  if (page !== currentPage) {
                    void loadReport(
                      appliedFilters,
                      appliedFilters.search,
                      (page - 1) * pageSize,
                    );
                  }
                }}
              />
            ))}
            {totalPages > firstVisiblePage + visiblePages.length - 1 && (
              <>
                {totalPages > firstVisiblePage + visiblePages.length && (
                  <Text style={styles.paginationEllipsis}>...</Text>
                )}
                <AppButton
                  title={String(totalPages)}
                  accessibilityLabel={`Last page, page ${totalPages}`}
                  variant="outline"
                  disabled={loading}
                  style={styles.pageButton}
                  textStyle={styles.pageButtonText}
                  onPress={() =>
                    void loadReport(
                      appliedFilters,
                      appliedFilters.search,
                      (totalPages - 1) * pageSize,
                    )
                  }
                />
              </>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next page"
              accessibilityState={{
                disabled: loading || offset + rows.length >= total,
              }}
              style={({ pressed }) => [
                styles.pageIconButton,
                {
                  opacity:
                    loading || offset + rows.length >= total
                      ? 0.4
                      : pressed
                        ? 0.7
                        : 1,
                },
              ]}
              disabled={loading || offset + rows.length >= total}
              onPress={() =>
                void loadReport(
                  appliedFilters,
                  appliedFilters.search,
                  offset + pageSize,
                )
              }
            >
              <AreaIcon name="chevron" size={16} color={COLORS.primary} />
            </Pressable>
          </View>
        </View>
      )}
      {pickerTarget && Platform.OS === "android" && (
        <DateTimePicker
          value={draftPickerDate}
          maximumDate={new Date()}
          minimumDate={
            pickerTarget === "to" ? new Date(`${fromDate}T00:00:00`) : undefined
          }
          mode="date"
          presentation="dialog"
          accentColor={COLORS.primary}
          onValueChange={(_, date) => savePickedDate(date)}
          onDismiss={() => setPickerTarget(null)}
        />
      )}
      {pickerTarget && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => setPickerTarget(null)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <View style={styles.pickerActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setPickerTarget(null)}
                />
                <AppButton
                  title="Done"
                  onPress={() => savePickedDate(draftPickerDate)}
                />
              </View>
              <DateTimePicker
                value={draftPickerDate}
                maximumDate={new Date()}
                minimumDate={
                  pickerTarget === "to"
                    ? new Date(`${fromDate}T00:00:00`)
                    : undefined
                }
                mode="date"
                display="inline"
                accentColor={COLORS.primary}
                onValueChange={(_, date) => setDraftPickerDate(date)}
              />
            </View>
          </View>
        </Modal>
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
  demoNotice: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    textAlign: "center",
  },
  exportMessage: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  actionRow: { flexDirection: "row", gap: SPACING.sm },
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
  // tableHeader: { backgroundColor: COLORS.primary },
  tableHeader: { backgroundColor: "#fff" },
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
  headerText: { color: COLORS.text, fontWeight: FONT_WEIGHT.bold },
  alternateRow: { backgroundColor: COLORS.surface },
  paginationContainer: { gap: SPACING.sm },
  pagination: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  pageIconButton: {
    flex: 1,
    minWidth: 0,
    maxWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  previousIcon: { transform: [{ rotate: "180deg" }] },
  pageButton: {
    flex: 1,
    minWidth: 0,
    maxWidth: 44,
    minHeight: 44,
    paddingHorizontal: 0,
  },
  pageButtonText: { fontSize: FONT_SIZE.xs },
  paginationEllipsis: {
    width: 16,
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
  pageLabel: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
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
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  pickerCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
});
