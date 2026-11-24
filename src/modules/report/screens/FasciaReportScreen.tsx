import { AppButton } from "@/components/AppButton";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import DateField from "@/components/DateField";
import SelectField from "@/components/SelectField";
import DynamicDataTable, {
  type DynamicColumn,
  type DynamicTableRow,
} from "@/components/table/DynamicAutoDataTable";
import { COLORS, FONT_SIZE, SPACING } from "@/constants/theme";
import { Directory, File, Paths } from "expo-file-system";
import { router } from "expo-router";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { prepareReportCsv } from "../services/reportCsv";
import {
  exportFasciaReport,
  loadFasciaReport,
  loadFasciaReportOptions,
  type FasciaReportFilters,
  type FasciaReportPage,
  type FasciaReportRow,
  type FasciaReportStore,
} from "../services/ReportService";
import { today, validDate } from "../services/service";
import {
  isPickerCancellation,
  trackerPlainText,
} from "../services/trackerText";

// ==============================================
// TABLE COLUMN DEFINITIONS
// ==============================================

const COLUMNS: DynamicColumn[] = [
  { dataIndex: "fascia_date", title: "Date", width: 100 },
  { dataIndex: "store_name", title: "Store", width: 160 },
  { dataIndex: "region", title: "Region", width: 110 },
  { dataIndex: "zone", title: "Zone", width: 100 },
  { dataIndex: "division_group", title: "Div. Group", width: 120 },
  { dataIndex: "division", title: "Division", width: 120 },
  { dataIndex: "section", title: "Section", width: 110 },
  { dataIndex: "department", title: "Department", width: 130 },
  { dataIndex: "season_flag", title: "Season", width: 90, align: "center" },
  { dataIndex: "floor", title: "Floor", width: 80, align: "center" },
  { dataIndex: "fascia_plan", title: "Fascia Plan", width: 130 },
  { dataIndex: "actual_fascia", title: "Actual", width: 130 },
  { dataIndex: "submitted_by", title: "Submitted By", width: 140 },
  { dataIndex: "submitted_on", title: "Submitted On", width: 150 },
  {
    dataIndex: "status",
    title: "Status",
    // width: 110,
    align: "center",
    render: (record) => (
      <Text
        style={{
          color: record.status === "Pending" ? COLORS.danger : COLORS.success,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {String(record.status ?? "-")}
      </Text>
    ),
  },
];

// ==============================================
// HELPERS
// ==============================================

const EMPTY_FILTERS: FasciaReportFilters = {
  from: today(),
  to: today(),
  region: "",
  zone: "",
  store: "",
  status: "",
};

const text = (value: string | null | undefined) =>
  value ? trackerPlainText(value) : "-";

// ==============================================
// SCREEN
// ==============================================

export default function FasciaReportScreen() {
  const [stores, setStores] = useState<FasciaReportStore[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState<FasciaReportPage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [optionsError, setOptionsError] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string>();
  const busy = useRef(false);
  const generation = useRef(0);
  // Map API rows to the common table's record type.
  const tableData = useMemo<DynamicTableRow[]>(
    () =>
      (report?.records ?? []).map((row: FasciaReportRow) => {
        const record: DynamicTableRow = { ...row, __rowKey: row.id };
        for (const column of COLUMNS) {
          if (column.dataIndex === "status") continue;
          const raw = record[column.dataIndex];
          record[column.dataIndex] =
            raw === null || raw === undefined ? "-" : text(String(raw));
        }
        return record;
      }),
    [report?.records],
  );

  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setHeaderTitle = useContext(AreaHeaderTitleContext);

  useEffect(() => {
    setHeaderTitle("Fascia Report");
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  const loadOptions = useCallback(async () => {
    setOptionsError(undefined);
    try {
      const result = await loadFasciaReportOptions();
      setStores(result.stores);
    } catch (cause) {
      setOptionsError(
        cause instanceof Error
          ? cause.message
          : "Unable to load fascia report filters.",
      );
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    let active = true;
    busy.current = true;
    loadFasciaReport(EMPTY_FILTERS)
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load fascia report.",
          );
      })
      .finally(() => {
        busy.current = false;
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const goBack = () => {
      if (router.canGoBack()) router.back();
      else router.replace("/area_manager/settings");
    };
    if (backHandlerRef) backHandlerRef.current = goBack;
    setBackVisible(true);
    return () => {
      if (backHandlerRef?.current === goBack) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, setBackVisible]);

  const zones = useMemo(
    () => [...new Set(stores.map((s) => text(s.zone)))].sort(),
    [stores],
  );
  const regions = useMemo(
    () =>
      [
        ...new Set(
          stores
            .filter((s) => !filters.zone || text(s.zone) === filters.zone)
            .map((s) => text(s.region)),
        ),
      ].sort(),
    [filters.zone, stores],
  );
  const filteredStores = stores.filter(
    (s) =>
      (!filters.zone || text(s.zone) === filters.zone) &&
      (!filters.region || text(s.region) === filters.region),
  );

  function validate() {
    if (
      !validDate(filters.from) ||
      !validDate(filters.to) ||
      filters.from > filters.to ||
      filters.to > today() ||
      (Date.parse(filters.to) - Date.parse(filters.from)) / 86400000 > 30
    ) {
      setError(
        "Choose up to 31 days through today, with From on or before To.",
      );
      return false;
    }
    return true;
  }

  async function loadReport(more = false) {
    if (busy.current || (!more && !validate())) return;
    busy.current = true;
    const requestId = ++generation.current;
    const selectedFilters = more ? applied : { ...filters };
    setLoading(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await loadFasciaReport(
        selectedFilters,
        more ? (report?.records.length ?? 0) : 0,
      );
      if (requestId !== generation.current) return;
      setReport((current) => ({
        ...result,
        records: more
          ? [...(current?.records ?? []), ...result.records]
          : result.records,
      }));
      setApplied(selectedFilters);
    } catch (cause) {
      if (requestId === generation.current)
        setError(
          cause instanceof Error ? cause.message : "Unable to load report.",
        );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function exportCsv() {
    if (exporting || !validate()) return;
    setExporting(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const csv = await exportFasciaReport(filters);
      const filename = `fascia-report-${filters.from}-to-${filters.to}.csv`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([prepareReportCsv(csv)], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setMessage(`Downloaded ${filename}.`);
      } else {
        let file: File;
        if (Platform.OS === "android") {
          let directory: Directory;
          try {
            directory = await Directory.pickDirectoryAsync();
          } catch (cause) {
            if (isPickerCancellation(cause)) return;
            throw cause;
          }
          if (!directory) return;
          try {
            file = directory.createFile(
              filename,
              "text/comma-separated-values",
            );
          } catch {
            try {
              const existing = new File(directory, filename);
              if (existing.exists) existing.delete();
              file = directory.createFile(
                filename,
                "text/comma-separated-values",
              );
            } catch {
              const stamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-")
                .slice(0, 19);
              const unique = filename.replace(/\.csv$/i, `-${stamp}.csv`);
              file = directory.createFile(
                unique,
                "text/comma-separated-values",
              );
            }
          }
        } else {
          file = new File(Paths.document, filename);
          try {
            if (file.exists) file.delete();
          } catch {
            const stamp = new Date()
              .toISOString()
              .replace(/[:.]/g, "-")
              .slice(0, 19);
            file = new File(
              Paths.document,
              filename.replace(/\.csv$/i, `-${stamp}.csv`),
            );
          }
          file.create();
        }
        file.write(prepareReportCsv(csv));
        if (!file.exists) throw new Error("The CSV file was not created.");
        setMessage(`Saved ${filename}.`);
      }
    } catch (cause) {
      if (!isPickerCancellation(cause))
        setError(
          cause instanceof Error ? cause.message : "Unable to export report.",
        );
    } finally {
      setExporting(false);
    }
  }

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      {/* ── Filters (fixed at top) ───────────────── */}
      <ScrollView
        style={styles.filtersScroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {optionsError && (
          <View style={styles.form}>
            <Text accessibilityRole="alert" style={styles.error}>
              {optionsError}
            </Text>
            <AppButton
              title="Retry filters"
              onPress={() => void loadOptions()}
            />
          </View>
        )}
        {message && (
          <Text accessibilityLiveRegion="polite" style={styles.detail}>
            {message}
          </Text>
        )}
        <View style={styles.filterRow}>
          <View style={styles.filterColumn}>
            <DateField
              maxDate={today()}
              label="From Date"
              value={filters.from}
              onChange={(from) =>
                setFilters((current) => ({
                  ...current,
                  from,
                  ...(validDate(from) ? { to: from } : {}),
                }))
              }
              disabled={loading || exporting}
            />
          </View>
          <View style={styles.filterColumn}>
            <DateField
              maxDate={today()}
              label="To Date"
              value={filters.to}
              onChange={(to) => setFilters((current) => ({ ...current, to }))}
              minDate={filters.from}
              disabled={loading || exporting}
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterColumn}>
            <SelectField
              label=""
              placeholder="Select  Zone"
              value={filters.zone}
              options={[
                { value: "", label: "All Zone" },
                ...zones.map((value) => ({ value, label: value })),
              ]}
              disabled={loading || exporting}
              onChange={(zone) =>
                setFilters((current) => ({
                  ...current,
                  zone,
                  region: "",
                  store: "",
                }))
              }
            />
          </View>
          <View style={styles.filterColumn}>
            <SelectField
              label=""
              value={filters.region}
              placeholder="Select  Region"
              options={[
                { value: "", label: "All Region" },
                ...regions.map((value) => ({ value, label: value })),
              ]}
              disabled={loading || exporting}
              onChange={(region) =>
                setFilters((current) => ({ ...current, region, store: "" }))
              }
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterColumn}>
            <SelectField
              label=""
              placeholder="Select  Store"
              value={filters.store}
              options={[
                { value: "", label: "All" },
                ...filteredStores.map((store) => ({
                  value: String(store.id),
                  label: text(store.store_name),
                })),
              ]}
              disabled={loading || exporting}
              onChange={(store) =>
                setFilters((current) => ({ ...current, store }))
              }
            />
          </View>
          <View style={styles.filterColumn}>
            <SelectField
              label=""
              placeholder="Select  Remark"
              value={filters.status}
              options={[
                { value: "", label: "All" },
                { value: "1", label: "Pending" },
                { value: "2", label: "Completed" },
              ]}
              disabled={loading || exporting}
              onChange={(status) =>
                setFilters((current) => ({ ...current, status }))
              }
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterColumn}>
            <AppButton
              title="Export CSV"
              variant="outline"
              onPress={() => void exportCsv()}
              loading={exporting}
              disabled={loading}
            />
          </View>
          <View style={styles.filterColumn}>
            <AppButton
              title="Apply filters"
              onPress={() => void loadReport()}
              disabled={loading || exporting}
            />
          </View>
        </View>
        {/* <Text style={styles.detail}>{report?.total ?? 0} records</Text> */}
      </ScrollView>

      {/* Shared table: local search and pagination for API-loaded records. */}
      <ScrollView
        style={styles.tableArea}
        contentContainerStyle={styles.tableContent}
      >
        <DynamicDataTable
          columns={COLUMNS}
          data={tableData}
          height={420}
          refreshKey={`${applied.from}-${applied.to}-${applied.zone}-${applied.region}-${applied.store}-${applied.status}`}
          // showSearch
          // showColumnFilter
          showPagination
          // showPageSize
          // pageSize={10}
          // pageSizeOptions={[10, 25, 50, 100]}
          loading={loading}
          searchPlaceholder="Search loaded fascia records..."
          emptyMessage="No matching fascia records found."
        />
        {report && report.records.length < report.total && (
          <View style={styles.loadMoreWrap}>
            <Text style={styles.detail}>
              {report.records.length} of {report.total} records loaded. Search
              and page navigation apply to loaded records.
            </Text>
            <AppButton
              title="Load more records"
              variant="outline"
              disabled={loading || exporting}
              onPress={() => void loadReport(true)}
            />
          </View>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

// ==============================================
// STYLES
// ==============================================

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  // ── Filters ─────────────────────────────────────
  filtersScroll: {
    flexGrow: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    maxHeight: 300,
  },
  form: {
    gap: SPACING.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  filterColumn: { flex: 1, minWidth: 0 },

  detail: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    lineHeight: 21,
    marginTop: SPACING.xs,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },

  tableArea: {
    flex: 1,
    // minHeight: 0,
    marginTop: 5,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tableContent: { paddingBottom: SPACING.xl },
  loadMoreWrap: {
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
});
