import { AppButton } from "@/components/AppButton";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
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
  FlatList,
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
import DateField from "./DateField";
import SelectField from "./SelectField";

// ==============================================
// TABLE COLUMN DEFINITIONS
// ==============================================

interface TableColumn {
  key: keyof FasciaReportRow | "store_name";
  title: string;
  width: number;
  align?: "left" | "center" | "right";
}

const COLUMNS: TableColumn[] = [
  { key: "fascia_date", title: "Date", width: 100 },
  { key: "store_name", title: "Store", width: 160 },
  { key: "region", title: "Region", width: 110 },
  { key: "zone", title: "Zone", width: 100 },
  { key: "division_group", title: "Div. Group", width: 120 },
  { key: "division", title: "Division", width: 120 },
  { key: "section", title: "Section", width: 110 },
  { key: "department", title: "Department", width: 130 },
  { key: "season_flag", title: "Season", width: 90, align: "center" },
  { key: "floor", title: "Floor", width: 80, align: "center" },
  { key: "fascia_plan", title: "Fascia Plan", width: 130 },
  { key: "actual_fascia", title: "Actual", width: 130 },
  { key: "submitted_by", title: "Submitted By", width: 140 },
  { key: "submitted_on", title: "Submitted On", width: 150 },
  { key: "status", title: "Status", width: 100, align: "center" },
];

const TOTAL_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

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

function cellValue(item: FasciaReportRow, key: TableColumn["key"]): string {
  const raw = (item as unknown as Record<string, unknown>)[key];
  if (raw === null || raw === undefined) return "-";
  return text(String(raw));
}

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
  const backHandler = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

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
    if (backHandler) backHandler.current = () => router.back();
    setBackVisible(true);
    return () => {
      if (backHandler) backHandler.current = null;
      setBackVisible(false);
    };
  }, [backHandler, setBackVisible]);

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
  // TABLE ROW
  // ==============================================

  function renderRow({
    item,
    index,
  }: {
    item: FasciaReportRow;
    index: number;
  }) {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.tr, isEven && styles.trEven]}>
        {COLUMNS.map((col) => {
          const value = cellValue(item, col.key);
          const isStatus = col.key === "status";
          return (
            <View key={col.key} style={[styles.td, { width: col.width }]}>
              <Text
                numberOfLines={2}
                style={[
                  styles.tdText,
                  col.align === "center" && styles.alignCenter,
                  col.align === "right" && styles.alignRight,
                  isStatus && {
                    color:
                      item.status === "Pending"
                        ? COLORS.danger
                        : COLORS.success,
                    fontWeight: "600",
                  },
                ]}
              >
                {value}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  // ==============================================
  // TABLE HEADER
  // ==============================================

  const tableHeader = (
    <View style={styles.thead}>
      {COLUMNS.map((col) => (
        <View key={col.key} style={[styles.th, { width: col.width }]}>
          <Text
            numberOfLines={2}
            style={[
              styles.thText,
              col.align === "center" && styles.alignCenter,
              col.align === "right" && styles.alignRight,
            ]}
          >
            {col.title}
          </Text>
        </View>
      ))}
    </View>
  );

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
              label="Zone"
              value={filters.zone}
              options={[
                { value: "", label: "All" },
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
              label="Region"
              value={filters.region}
              options={[
                { value: "", label: "All" },
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
              label="Store"
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
              label="Remark"
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
              title="Apply filters"
              onPress={() => void loadReport()}
              disabled={loading || exporting}
            />
          </View>
          <View style={styles.filterColumn}>
            <AppButton
              title="Export CSV"
              variant="outline"
              onPress={() => void exportCsv()}
              loading={exporting}
              disabled={loading}
            />
          </View>
        </View>
        <Text style={styles.detail}>{report?.total ?? 0} records</Text>
      </ScrollView>

      {/* ── Table (scrolls horizontally) ───────────── */}
      <ScrollView
        horizontal
        style={styles.tableScroll}
        contentContainerStyle={{ width: TOTAL_WIDTH }}
        showsHorizontalScrollIndicator
      >
        <View>
          {tableHeader}
          <FlatList
            data={report?.records ?? []}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRow}
            style={{ width: TOTAL_WIDTH }}
            contentContainerStyle={styles.tableContent}
            ListEmptyComponent={
              !loading && !error ? (
                <Text style={styles.emptyText}>
                  No matching fascia records found.
                </Text>
              ) : null
            }
            ListFooterComponent={
              report && report.records.length < report.total ? (
                <View style={styles.loadMoreWrap}>
                  <AppButton
                    title="Load more"
                    variant="outline"
                    disabled={loading || exporting}
                    onPress={() => void loadReport(true)}
                  />
                </View>
              ) : null
            }
          />
        </View>
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    maxHeight: 340,
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

  tableScroll: {
    flex: 1,
    margin: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  tableContent: { paddingBottom: SPACING.xl },

  thead: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  th: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  thText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },

  tr: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  trEven: {
    backgroundColor: "#f7f9fc",
  },
  td: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  tdText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },

  alignCenter: { textAlign: "center" },
  alignRight: { textAlign: "right" },

  emptyText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    padding: SPACING.lg,
  },
  loadMoreWrap: {
    padding: SPACING.md,
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
