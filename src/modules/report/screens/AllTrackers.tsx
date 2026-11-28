import ActionCard from "@/components/ActionCard";
import { AppButton } from "@/components/AppButton";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import AreaPage from "@/components/AreaPage";
import DateField from "@/components/DateField";
import DynamicDataTable from "@/components/table/DynamicAutoDataTable";

import { COLORS, FONT_SIZE, SPACING } from "@/constants/theme";
import { saveNativeReportCsv } from "@/modules/report/services/saveNativeReportCsv";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { exceedsTableDateRange } from "../services/reportDateRange";
import {
  staticReportCells,
  trackerReportColumns,
  type ReportColumn,
} from "../services/reportTableColumns";
import { trackerTableRow } from "../services/reportTableFormat";

import SelectField, { type SelectOption } from "@/components/SelectField";
import {
  loadTrackerFilterOptions,
  loadTrackerReportPage,
  requestTrackerCsv,
  type TrackerFilters,
  type TrackerLink,
  type TrackerReportRow,
} from "../services/AllTrackersService";
import { usePagination } from "../services/usePagination";

const PAGE_SIZE = 50;

const TRACKERS: TrackerLink[] = [
  { id: "fmcg_de", name: "FMCG D&E", icon: "shoppingCart" },
  { id: "non_apps_dd", name: "Non-Apps D&D ", icon: "clipboardList" },
  { id: "snap_up_dd", name: "SnapUp D&D ", icon: "calendar" },
  { id: "beauty_dd", name: " Beauty D&D / TESTER", icon: "gem" },
  { id: "tso_dd", name: "TSO D&D", icon: "chartLine" },
  {
    id: "store_incident_log",
    name: "Store Incident Log",
    icon: "archive",
  },
  {
    id: "jewellery_hair_accessories_dd",
    name: "Jewellery & Hair Accessories D&D",
    icon: "palette",
  },
  {
    id: "unloading_payment",
    name: "Load & Unload Payment",
    icon: "truckLoading",
  },
  { id: "canteen_fooding", name: "Canteen Fooding", icon: "utensils" },
  { id: "fmcg_price_mismatch", name: "FMCG Price Mismatch", icon: "tag" },
  {
    id: "grt_packet_readiness",
    name: "GRT Packet Readiness",
    icon: "clipboardList",
  },
  {
    id: "ist_packet_readiness",
    name: "IST Packet Readiness",
    icon: "boxOpen",
  },
  { id: "near_to_expiry", name: "Near To Expiry", icon: "hourglassHalf" },
  { id: "damage_apparel", name: "Damage Apparel", icon: "unlink" },
  { id: "missing_tag", name: "Missing Tag", icon: "tag" },
  { id: "sensor_tag", name: "Sensor Tag", icon: "magic" },
  {
    id: "monthly_lp_global_count",
    name: "Monthly LP Global Count",
    icon: "globe",
  },
];

function inputDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function defaultDateRange() {
  const to = new Date();
  const date = inputDate(to);
  return { from: date, to: date };
}

function parseDay(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === value
    ? time
    : undefined;
}

function TrackerTable({
  trackerId,
  apiColumns,
  rows,
  offset,
  currentPage,
  pageSize,
  total,
  goToPage,
  loading,
}: {
  trackerId: TrackerLink["id"];
  apiColumns: readonly ReportColumn[];
  rows: TrackerReportRow[];
  offset: number;
  currentPage: number;
  pageSize: number;
  total: number;
  goToPage: (page: number) => void;
  loading: boolean;
}) {
  const columns = useMemo(() => trackerReportColumns(trackerId, apiColumns, rows), [trackerId, apiColumns, rows]);

  const tableData = useMemo(() => rows.map((row, index) => {
    const cells = staticReportCells(trackerTableRow(row), columns);
    const record: Record<string, string> = {
      __rowKey: `${trackerId}-${offset + index}-${row.id}`,
      serial: String(offset + index + 1),
    };

    columns.forEach((column, columnIndex) => {
      record[`col_${columnIndex}`] = String(cells[columnIndex] ?? "");
    });

    return record;
  }), [columns, offset, rows, trackerId]);

  const tableColumns = useMemo(() => [
    {
      title: "#",
      dataIndex: "serial",
      fixed: "left" as const,
      width: 55,
    },
    ...columns.map((column, index) => ({
      title: column.title,
      dataIndex: `col_${index}`,
    })),
  ], [columns]);

  const handlePageChange = useCallback((page: number) => {
    if (!loading && page !== currentPage) void goToPage(page);
  }, [currentPage, goToPage, loading]);

  return (
    <View style={styles.tableShell}>
      <DynamicDataTable
        columns={tableColumns}
        data={tableData}
        height={400}
        refreshKey={`${trackerId}-${columns.map((column) => column.data).join(",")}`}
        showPagination={true}
        serverSidePagination={true}
        currentPage={currentPage}
        pageSize={pageSize}
        totalRecords={total}
        onPageChange={handlePageChange}
        showSearch={false}
        showColumnFilter={false}
        showPageSize={false}
        loading={loading}
      />
      {loading && (
        <View style={styles.tableLoadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.tableLoadingText}>Loading table records…</Text>
        </View>
      )}
    </View>
  );
}

function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

export function TrackerReport({ tracker }: { tracker: TrackerLink }) {
  const initialRange = useMemo(() => defaultDateRange(), []);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [store, setStore] = useState("");
  const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
  const [storeOptions, setStoreOptions] = useState<SelectOption[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<TrackerFilters>({
    from: initialRange.from,
    to: initialRange.to,
    region: "",
    zone: "",
    store: "",
  });
  const pageSize = PAGE_SIZE;

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>();
  const [exportMessage, setExportMessage] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const queryKey = useMemo(
    () => JSON.stringify([tracker.id, appliedFilters, reloadKey]),
    [appliedFilters, reloadKey, tracker.id],
  );
  const fetchPage = useCallback(
    async (requestedPage: number, limit: number, signal: AbortSignal) => {
      const result = await loadTrackerReportPage(
        tracker.id,
        appliedFilters,
        (requestedPage - 1) * limit,
        limit,
        signal,
      );
      return {
        data: result.rows,
        total: result.total,
        metadata: result.columns,
      };
    },
    [appliedFilters, tracker.id],
  );
  const {
    data: rows,
    total,
    page: currentPage,
    metadata,
    loading,
    error: pageError,
    goToPage,
  } = usePagination<TrackerReportRow>({
    queryKey,
    limit: pageSize,
    fetchPage,
  });
  const apiColumns = Array.isArray(metadata)
    ? (metadata as ReportColumn[])
    : [];
  const offset = (currentPage - 1) * pageSize;
  const visibleError = error ?? pageError;

  useEffect(() => {
    let active = true;
    loadTrackerFilterOptions(region, zone)
      .then((options) => {
        if (!active) return;
        setRegionOptions(toOptions(options.regions));
        setZoneOptions(toOptions(options.zones));
        setStoreOptions(
          options.stores.map((item) => ({ value: item.id, label: item.name })),
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

  const getFilters = useCallback((): TrackerFilters | undefined => {
    const from = parseDay(fromDate);
    const to = parseDay(toDate);
    if (
      from === undefined ||
      to === undefined ||
      from > to ||
      toDate > inputDate(new Date())
    ) {
      setError("Enter a valid date range using YYYY-MM-DD.");
      return undefined;
    }
    if ((to - from) / 86_400_000 + 1 > 31) {
      setError("Choose a date range of 31 days or less.");
      return undefined;
    }
    return { from: fromDate, to: toDate, region, zone, store };
  }, [fromDate, region, store, toDate, zone]);

  const applyFilters = useCallback(() => {
    const filters = getFilters();
    if (!filters) return;
    setError(undefined);
    setExportMessage(undefined);
    setAppliedFilters(filters);
  }, [getFilters]);

  const resetFilters = useCallback(() => {
    const today = inputDate(new Date());
    setFromDate(today);
    setToDate(today);
    setRegion("");
    setZone("");
    setStore("");
    setError(undefined);
    setExportMessage(undefined);
    setAppliedFilters({
      from: today,
      to: today,
      region: "",
      zone: "",
      store: "",
    });
  }, []);

  const exportReport = useCallback(async () => {
    const filters = getFilters();
    if (!filters) return;
    setError(undefined);
    setExportMessage(undefined);
    setExporting(true);
    try {
      const { csv, filename } = await requestTrackerCsv(tracker.id, filters);
      if (Platform.OS === "web") {
        const blob = new Blob([prepareReportCsv(csv)], {
          type: "text/csv;charset=utf-8",
        });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        setExportMessage(`Downloaded ${filename}.`);
        return;
      }

      const message = await saveNativeReportCsv(csv, filename);
      if (message) setExportMessage(message);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`CSV export failed: ${message}`);
    } finally {
      setExporting(false);
    }
  }, [getFilters, tracker.id]);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.header}>
          <View style={styles.form}>
            {/* <Text style={styles.sectionTitle}>Filters</Text> */}
            <View style={styles.filterRow}>
              <View style={styles.fieldCell}>
                <DateField
                  compact
                  label="From Date"
                  value={fromDate}
                  maxDate={inputDate(new Date())}
                  onChange={(value) => {
                    setFromDate(value);
                    if (parseDay(value) !== undefined) setToDate(value);
                  }}
                />
              </View>
              <View style={styles.fieldCell}>
                <DateField
                  compact
                  label="To Date"
                  value={toDate}
                  maxDate={inputDate(new Date())}
                  minDate={fromDate}
                  onChange={setToDate}
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.fieldCell}>
                <SelectField
                  label=""
                  value={region}
                  options={regionOptions}
                  placeholder="All regions"
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
                  onChange={setStore}
                />
              </View>
            </View>

            {exportMessage ? (
              <Text style={styles.exportMessage}>{exportMessage}</Text>
            ) : null}
            <View style={styles.actionRow}>
              <AppButton
                title={exporting ? "Exporting…" : "Export"}
                variant="outline"
                onPress={() => void exportReport()}
                disabled={loading || exporting}
                style={styles.smallActionButton}
              />
              <AppButton
                title="Reset"
                variant="outline"
                onPress={resetFilters}
                disabled={loading || exporting}
                style={styles.smallActionButton}
              />
              <AppButton
                title={loading ? "Loading…" : "Filter"}
                onPress={applyFilters}
                disabled={loading || exporting}
                style={styles.filterActionButton}
              />
            </View>
            <Text style={styles.demoNotice}>
              {loading
                ? "Loading report data\u2026"
                : `${rows.length} of ${total} report records`}
            </Text>
          </View>
          {visibleError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {visibleError}
            </Text>
          ) : null}
        </View>
        {exceedsTableDateRange(fromDate, toDate) && (
          <Text style={styles.tableHint}>
            You can export full range data. Only the first 7 days from the
            selected start date are visible in the table.
          </Text>
        )}
        {!visibleError && rows.length > 0 && (
          <TrackerTable
            apiColumns={apiColumns}
            trackerId={tracker.id}
            rows={rows}
            offset={offset}
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            goToPage={goToPage}
            loading={loading}
          />
        )}
        {!loading && rows.length === 0 && (
          <View style={styles.empty}>
            {visibleError ? (
              <AppButton
                title="Try again"
                onPress={() => setReloadKey((value) => value + 1)}
                style={styles.retry}
              />
            ) : (
              <Text style={styles.emptyText}>
                No tracker rows found for these dates.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function AllTrackers({ onBack }: { onBack?: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const [selectedTracker, setSelectedTracker] = useState<TrackerLink>();
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  useEffect(() => {
    setHeaderTitle(selectedTracker?.name ?? "All Trackers");
    return () => setHeaderTitle(null);
  }, [selectedTracker, setHeaderTitle]);

  const backToList = useCallback(() => setSelectedTracker(undefined), []);
  const handleBack = useCallback(() => {
    if (selectedTracker) {
      backToList();
    } else if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/common/home");
    }
  }, [backToList, onBack, selectedTracker]);

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = handleBack;
    setBackVisible(true);
    return () => {
      if (backHandlerRef?.current === handleBack) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, handleBack, setBackVisible]);

  if (selectedTracker) {
    return <TrackerReport key={selectedTracker.id} tracker={selectedTracker} />;
  }

  return (
    <AreaPage
      title="All Trackers"
      subtitle="Access all store trackers and reports."
      compact
    >
      <View style={styles.grid}>
        {TRACKERS.map((item) => (
          <View key={item.id} style={styles.cell}>
            <ActionCard
              filled
              title={item.name}
              icon={item.icon ?? "report"}
              onPress={() => setSelectedTracker(item)}
            />
          </View>
        ))}
      </View>
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface, width: "100%" },

  content: {
    // padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
    width: "100%",
    paddingHorizontal: 3,
  },

  header: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  form: {
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // content: {
  //   paddingHorizontal: 5,
  //   paddingVertical: 8,
  //   paddingBottom: SPACING.xxl,
  //   gap: 8,
  // },
  // header: { gap: SPACING.sm, marginBottom: SPACING.sm },
  // form: {
  //   gap: SPACING.md,
  //   padding: SPACING.md,
  //   backgroundColor: COLORS.white,
  //   borderRadius: 12,
  //   borderWidth: 1,
  //   borderColor: COLORS.border,
  // },
  filterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  fieldCell: { flex: 1, minWidth: 0 },
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  smallActionButton: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  filterActionButton: { flex: 2, minWidth: 0, paddingHorizontal: SPACING.xs },
  tableShell: { position: "relative", width: "100%" },
  tableLoadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    gap: SPACING.sm,
  },
  tableLoadingText: { color: COLORS.text, fontSize: FONT_SIZE.sm },
  tableHint: {
    padding: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
  },
  error: { color: COLORS.danger, textAlign: "center", fontSize: FONT_SIZE.sm },
  retry: { minWidth: 140 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
});

// =================================================================================================================

// import ActionCard from "@/components/ActionCard";
// import { AppButton } from "@/components/AppButton";
// import {
//   AreaHeaderBackContext,
//   AreaHeaderBackVisibleContext,
//   AreaHeaderTitleContext,
// } from "@/components/AreaHeaderBackContext";
// import AreaPage from "@/components/AreaPage";
// import DateField from "@/components/DateField";
// import DynamicDataTable from "@/components/table/DynamicAutoDataTable";

// import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
// import { DateTimePicker } from "@expo/ui/community/datetime-picker";
// import { Directory, File, Paths } from "expo-file-system";
// import { router } from "expo-router";
// import { useCallback, useContext, useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Modal,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { prepareReportCsv } from "../services/reportCsv";
// import { exceedsTableDateRange } from "../services/reportDateRange";
// import {
//   staticReportCells,
//   trackerReportColumns,
//   type ReportColumn,
// } from "../services/reportTableColumns";
// import { trackerTableRow } from "../services/reportTableFormat";

// import AreaIcon from "@/components/AreaIcon";
// import SelectField, { type SelectOption } from "@/components/SelectField";
// import {
//   loadTrackerFilterOptions,
//   loadTrackerReportPage,
//   requestTrackerCsv,
//   type TrackerFilters,
//   type TrackerLink,
//   type TrackerReportRow,
// } from "../services/AllTrackersService";
// import { isPickerCancellation } from "../services/trackerText";
// import { usePagination } from "../services/usePagination";

// const PAGE_SIZE = 50;

// const TRACKERS: TrackerLink[] = [
//   { id: "fmcg_de", name: "FMCG D&E", icon: "shoppingCart" },
//   { id: "non_apps_dd", name: "Non-Apps D&D ", icon: "clipboardList" },
//   { id: "snap_up_dd", name: "SnapUp D&D ", icon: "calendar" },
//   { id: "beauty_dd", name: " Beauty D&D / TESTER", icon: "gem" },
//   { id: "tso_dd", name: "TSO D&D", icon: "chartLine" },
//   {
//     id: "store_incident_log",
//     name: "Store Incident Log",
//     icon: "archive",
//   },
//   {
//     id: "jewellery_hair_accessories_dd",
//     name: "Jewellery & Hair Accessories D&D",
//     icon: "palette",
//   },
//   {
//     id: "unloading_payment",
//     name: "Load & Unload Payment",
//     icon: "truckLoading",
//   },
//   { id: "canteen_fooding", name: "Canteen Fooding", icon: "utensils" },
//   { id: "fmcg_price_mismatch", name: "FMCG Price Mismatch", icon: "tag" },
//   {
//     id: "grt_packet_readiness",
//     name: "GRT Packet Readiness",
//     icon: "clipboardList",
//   },
//   {
//     id: "ist_packet_readiness",
//     name: "IST Packet Readiness",
//     icon: "boxOpen",
//   },
//   { id: "near_to_expiry", name: "Near To Expiry", icon: "hourglassHalf" },
//   { id: "damage_apparel", name: "Damage Apparel", icon: "unlink" },
//   { id: "missing_tag", name: "Missing Tag", icon: "tag" },
//   { id: "sensor_tag", name: "Sensor Tag", icon: "magic" },
//   {
//     id: "monthly_lp_global_count",
//     name: "Monthly LP Global Count",
//     icon: "globe",
//   },
// ];

// function inputDate(date: Date): string {
//   return [
//     date.getFullYear(),
//     String(date.getMonth() + 1).padStart(2, "0"),
//     String(date.getDate()).padStart(2, "0"),
//   ].join("-");
// }

// function defaultDateRange() {
//   const to = new Date();
//   const date = inputDate(to);
//   return { from: date, to: date };
// }

// function parseDay(value: string): number | undefined {
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
//   const time = Date.parse(`${value}T00:00:00Z`);
//   return Number.isFinite(time) &&
//     new Date(time).toISOString().slice(0, 10) === value
//     ? time
//     : undefined;
// }

// function TrackerTable({
//   trackerId,
//   apiColumns,
//   rows,
//   offset,
//   currentPage,
//   pageSize,
//   total,
//   goToPage,
//   loading,
// }: {
//   trackerId: TrackerLink["id"];
//   apiColumns: readonly ReportColumn[];
//   rows: TrackerReportRow[];
//   offset: number;
//   currentPage: number;
//   pageSize: number;
//   total: number;
//   goToPage: (page: number) => void;
//   loading: boolean;
// }) {
//   const columns = trackerReportColumns(trackerId, apiColumns, rows);

//   const tableData = rows.map((row, index) => {
//     const cells = staticReportCells(trackerTableRow(row), columns);
//     const record: Record<string, string> = {
//       __rowKey: `${trackerId}-${offset + index}-${row.id}`,
//       serial: String(offset + index + 1),
//     };

//     columns.forEach((column, columnIndex) => {
//       record[`col_${columnIndex}`] = String(cells[columnIndex] ?? "");
//     });

//     return record;
//   });

//   const tableColumns = [
//     {
//       title: "#",
//       dataIndex: "serial",
//       fixed: "left" as const,
//       width: 55,
//     },
//     ...columns.map((column, index) => ({
//       title: column.title,
//       dataIndex: `col_${index}`,
//     })),
//   ];

//   return (
//     <View style={styles.tableShell}>
//       <DynamicDataTable
//         columns={tableColumns}
//         data={tableData}
//         height={400}
//         refreshKey={`${trackerId}-${columns.map((column) => column.data).join(",")}`}
//         showPagination={true}
//         serverSidePagination={true}
//         currentPage={currentPage}
//         pageSize={pageSize}
//         totalRecords={total}
//         onPageChange={(page) => {
//           if (!loading && page !== currentPage) {
//             void goToPage(page);
//           }
//         }}
//         showSearch={false}
//         showColumnFilter={false}
//         showPageSize={false}
//       />
//       {loading && (
//         <View style={styles.tableLoadingOverlay}>
//           <ActivityIndicator size="large" color={COLORS.primary} />
//           <Text style={styles.tableLoadingText}>Loading table records…</Text>
//         </View>
//       )}
//     </View>
//   );
// }

// function toOptions(values: readonly string[]): SelectOption[] {
//   return values.map((value) => ({ value, label: value }));
// }

// export function TrackerReport({ tracker }: { tracker: TrackerLink }) {
//   const initialRange = useMemo(defaultDateRange, []);
//   const [fromDate, setFromDate] = useState(initialRange.from);
//   const [toDate, setToDate] = useState(initialRange.to);
//   const [region, setRegion] = useState("");
//   const [zone, setZone] = useState("");
//   const [store, setStore] = useState("");
//   const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
//   const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
//   const [storeOptions, setStoreOptions] = useState<SelectOption[]>([]);
//   const [appliedFilters, setAppliedFilters] = useState<TrackerFilters>({
//     from: initialRange.from,
//     to: initialRange.to,
//     region: "",
//     zone: "",
//     store: "",
//   });
//   const pageSize = PAGE_SIZE;

//   const [exporting, setExporting] = useState(false);
//   const [error, setError] = useState<string>();
//   const [exportMessage, setExportMessage] = useState<string>();
//   const [reloadKey, setReloadKey] = useState(0);
//   const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
//   const [draftPickerDate, setDraftPickerDate] = useState(new Date());
//   const queryKey = useMemo(
//     () => JSON.stringify([tracker.id, appliedFilters, reloadKey]),
//     [appliedFilters, reloadKey, tracker.id],
//   );
//   const fetchPage = useCallback(
//     async (requestedPage: number, limit: number, signal: AbortSignal) => {
//       const result = await loadTrackerReportPage(
//         tracker.id,
//         appliedFilters,
//         (requestedPage - 1) * limit,
//         limit,
//         signal,
//       );
//       return {
//         data: result.rows,
//         total: result.total,
//         metadata: result.columns,
//       };
//     },
//     [appliedFilters, tracker.id],
//   );
//   const {
//     data: rows,
//     total,
//     page: currentPage,
//     metadata,
//     loading,
//     error: pageError,
//     goToPage,
//   } = usePagination<TrackerReportRow>({
//     queryKey,
//     limit: pageSize,
//     fetchPage,
//   });
//   const apiColumns = Array.isArray(metadata)
//     ? (metadata as ReportColumn[])
//     : [];
//   const offset = (currentPage - 1) * pageSize;
//   const visibleError = error ?? pageError;

//   useEffect(() => {
//     let active = true;
//     loadTrackerFilterOptions(region, zone)
//       .then((options) => {
//         if (!active) return;
//         setRegionOptions(toOptions(options.regions));
//         setZoneOptions(toOptions(options.zones));
//         setStoreOptions(
//           options.stores.map((item) => ({ value: item.id, label: item.name })),
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

//   const getFilters = useCallback((): TrackerFilters | undefined => {
//     const from = parseDay(fromDate);
//     const to = parseDay(toDate);
//     if (
//       from === undefined ||
//       to === undefined ||
//       from > to ||
//       toDate > inputDate(new Date())
//     ) {
//       setError("Enter a valid date range using YYYY-MM-DD.");
//       return undefined;
//     }
//     if ((to - from) / 86_400_000 + 1 > 31) {
//       setError("Choose a date range of 31 days or less.");
//       return undefined;
//     }
//     return { from: fromDate, to: toDate, region, zone, store };
//   }, [fromDate, region, store, toDate, zone]);

//   const applyFilters = useCallback(() => {
//     const filters = getFilters();
//     if (!filters) return;
//     setError(undefined);
//     setExportMessage(undefined);
//     setAppliedFilters(filters);
//   }, [getFilters]);

//   const resetFilters = useCallback(() => {
//     const today = inputDate(new Date());
//     setFromDate(today);
//     setToDate(today);
//     setRegion("");
//     setZone("");
//     setStore("");
//     setError(undefined);
//     setExportMessage(undefined);
//     setAppliedFilters({
//       from: today,
//       to: today,
//       region: "",
//       zone: "",
//       store: "",
//     });
//   }, []);

//   const openDatePicker = useCallback(
//     (target: "from" | "to") => {
//       const current = target === "from" ? fromDate : toDate;
//       setDraftPickerDate(
//         parseDay(current) === undefined
//           ? new Date()
//           : new Date(`${current}T00:00:00`),
//       );
//       setPickerTarget(target);
//     },
//     [fromDate, toDate],
//   );

//   const savePickedDate = useCallback(
//     (date: Date) => {
//       const formatted = inputDate(date);
//       if (pickerTarget === "from") {
//         setFromDate(formatted);
//         setToDate(formatted);
//       }
//       if (pickerTarget === "to") setToDate(formatted);
//       setPickerTarget(null);
//     },
//     [pickerTarget],
//   );

//   const exportReport = useCallback(async () => {
//     const filters = getFilters();
//     if (!filters) return;
//     setError(undefined);
//     setExportMessage(undefined);
//     setExporting(true);
//     try {
//       const { csv, filename } = await requestTrackerCsv(tracker.id, filters);
//       if (Platform.OS === "web") {
//         const blob = new Blob([prepareReportCsv(csv)], {
//           type: "text/csv;charset=utf-8",
//         });
//         const objectUrl = URL.createObjectURL(blob);
//         const link = document.createElement("a");
//         link.href = objectUrl;
//         link.download = filename;
//         link.click();
//         setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
//         setExportMessage(`Downloaded ${filename}.`);
//         return;
//       }

//       let file: File;
//       if (Platform.OS === "android") {
//         let directory: Directory;
//         try {
//           directory = await Directory.pickDirectoryAsync();
//         } catch (pickerError) {
//           if (isPickerCancellation(pickerError)) return;
//           throw pickerError;
//         }
//         if (!directory) return;
//         file = directory.createFile(filename, "text/comma-separated-values");
//       } else {
//         file = new File(Paths.document, filename);
//         file.create({ overwrite: true });
//       }
//       file.write(prepareReportCsv(csv));
//       if (!file.exists) throw new Error("The export file was not saved.");
//       setExportMessage(`Saved ${filename}.`);
//     } catch (cause) {
//       const message = cause instanceof Error ? cause.message : String(cause);
//       setError(`CSV export failed: ${message}`);
//     } finally {
//       setExporting(false);
//     }
//   }, [getFilters, tracker.id]);

//   return (
//     <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
//       <ScrollView
//         contentContainerStyle={styles.content}
//         keyboardShouldPersistTaps="handled"
//         nestedScrollEnabled
//       >
//         <View style={styles.header}>
//           <View style={styles.form}>
//             {/* <Text style={styles.sectionTitle}>Filters</Text> */}
//             <View style={styles.filterRow}>
//               {Platform.OS === "web" ? (
//                 <>
//                   <View style={styles.fieldCell}>
//                     <DateField
//                       compact
//                       label="From Date"
//                       value={fromDate}
//                       maxDate={inputDate(new Date())}
//                       onChange={(value) => {
//                         setFromDate(value);
//                         if (parseDay(value) !== undefined) setToDate(value);
//                       }}
//                     />
//                   </View>
//                   <View style={styles.fieldCell}>
//                     <DateField
//                       compact
//                       label="To Date"
//                       value={toDate}
//                       maxDate={inputDate(new Date())}
//                       minDate={fromDate}
//                       onChange={setToDate}
//                     />
//                   </View>
//                 </>
//               ) : (
//                 <>
//                   <View style={styles.fieldCell}>
//                     <Text style={styles.fieldLabel}>From Date</Text>
//                     <View style={styles.dateButtonWrap}>
//                       <AppButton
//                         title={fromDate}
//                         variant="outline"
//                         onPress={() => openDatePicker("from")}
//                         style={styles.dateButton}
//                         textStyle={styles.dateText}
//                       />
//                       <View pointerEvents="none" style={styles.dateIcon}>
//                         <AreaIcon
//                           name="calendar"
//                           color={COLORS.textLight}
//                           size={19}
//                         />
//                       </View>
//                     </View>
//                   </View>
//                   <View style={styles.fieldCell}>
//                     <Text style={styles.fieldLabel}>To Date</Text>
//                     <View style={styles.dateButtonWrap}>
//                       <AppButton
//                         title={toDate}
//                         variant="outline"
//                         onPress={() => openDatePicker("to")}
//                         style={styles.dateButton}
//                         textStyle={styles.dateText}
//                       />
//                       <View pointerEvents="none" style={styles.dateIcon}>
//                         <AreaIcon
//                           name="calendar"
//                           color={COLORS.textLight}
//                           size={19}
//                         />
//                       </View>
//                     </View>
//                   </View>
//                 </>
//               )}
//             </View>
//             <View style={styles.filterRow}>
//               <View style={styles.fieldCell}>
//                 <SelectField
//                   label=""
//                   value={region}
//                   options={regionOptions}
//                   placeholder="All regions"
//                   onChange={(value) => {
//                     setRegion(value);
//                     setZone("");
//                     setStore("");
//                   }}
//                 />
//               </View>
//               <View style={styles.fieldCell}>
//                 <SelectField
//                   label=""
//                   value={zone}
//                   options={zoneOptions}
//                   placeholder="All zones"
//                   onChange={(value) => {
//                     setZone(value);
//                     setStore("");
//                   }}
//                 />
//               </View>
//             </View>
//             <View style={styles.filterRow}>
//               <View style={styles.fieldCell}>
//                 <SelectField
//                   label=""
//                   value={store}
//                   options={storeOptions}
//                   placeholder="All stores"
//                   onChange={setStore}
//                 />
//               </View>
//             </View>

//             {exportMessage ? (
//               <Text style={styles.exportMessage}>{exportMessage}</Text>
//             ) : null}
//             <View style={styles.actionRow}>
//               <AppButton
//                 title={exporting ? "Exporting…" : "Export"}
//                 variant="outline"
//                 onPress={() => void exportReport()}
//                 disabled={loading || exporting}
//                 style={styles.smallActionButton}
//               />
//               <AppButton
//                 title="Reset"
//                 variant="outline"
//                 onPress={resetFilters}
//                 disabled={loading || exporting}
//                 style={styles.smallActionButton}
//               />
//               <AppButton
//                 title={loading ? "Loading…" : "Filter"}
//                 onPress={applyFilters}
//                 disabled={loading || exporting}
//                 style={styles.filterActionButton}
//               />
//             </View>
//             <Text style={styles.demoNotice}>
//               {loading
//                 ? "Loading report data\u2026"
//                 : `${rows.length} of ${total} report records`}
//             </Text>
//           </View>
//           {visibleError ? (
//             <Text accessibilityRole="alert" style={styles.error}>
//               {visibleError}
//             </Text>
//           ) : null}
//         </View>
//         {exceedsTableDateRange(fromDate, toDate) && (
//           <Text style={styles.tableHint}>
//             You can export full range data. Only the first 7 days from the
//             selected start date are visible in the table.
//           </Text>
//         )}
//         {!visibleError && (loading || rows.length > 0) && (
//           <TrackerTable
//             apiColumns={apiColumns}
//             trackerId={tracker.id}
//             rows={rows}
//             offset={offset}
//             currentPage={currentPage}
//             pageSize={pageSize}
//             total={total}
//             goToPage={goToPage}
//             loading={loading}
//           />
//         )}
//         {!loading && rows.length === 0 && (
//           <View style={styles.empty}>
//             {visibleError ? (
//               <AppButton
//                 title="Try again"
//                 onPress={() => setReloadKey((value) => value + 1)}
//                 style={styles.retry}
//               />
//             ) : (
//               <Text style={styles.emptyText}>
//                 No tracker rows found for these dates.
//               </Text>
//             )}
//           </View>
//         )}
//       </ScrollView>
//       {pickerTarget && Platform.OS === "android" && (
//         <DateTimePicker
//           value={draftPickerDate}
//           maximumDate={new Date()}
//           minimumDate={
//             pickerTarget === "to" ? new Date(`${fromDate}T00:00:00`) : undefined
//           }
//           mode="date"
//           presentation="dialog"
//           accentColor={COLORS.primary}
//           onValueChange={(_, date) => savePickedDate(date)}
//           onDismiss={() => setPickerTarget(null)}
//         />
//       )}
//       {pickerTarget && Platform.OS === "ios" && (
//         <Modal
//           transparent
//           animationType="slide"
//           visible
//           onRequestClose={() => setPickerTarget(null)}
//         >
//           <View style={styles.pickerOverlay}>
//             <View style={styles.pickerCard}>
//               <View style={styles.pickerActions}>
//                 <AppButton
//                   title="Cancel"
//                   variant="outline"
//                   onPress={() => setPickerTarget(null)}
//                 />
//                 <AppButton
//                   title="Done"
//                   onPress={() => savePickedDate(draftPickerDate)}
//                 />
//               </View>
//               <DateTimePicker
//                 value={draftPickerDate}
//                 maximumDate={new Date()}
//                 minimumDate={
//                   pickerTarget === "to"
//                     ? new Date(`${fromDate}T00:00:00`)
//                     : undefined
//                 }
//                 mode="date"
//                 onValueChange={(_, date) => setDraftPickerDate(date)}
//               />
//             </View>
//           </View>
//         </Modal>
//       )}
//     </SafeAreaView>
//   );
// }

// export default function AllTrackers({ onBack }: { onBack?: () => void }) {
//   const backHandlerRef = useContext(AreaHeaderBackContext);
//   const setBackVisible = useContext(AreaHeaderBackVisibleContext);
//   const [selectedTracker, setSelectedTracker] = useState<TrackerLink>();
//   const setHeaderTitle = useContext(AreaHeaderTitleContext);
//   useEffect(() => {
//     setHeaderTitle(selectedTracker?.name ?? "All Trackers");
//     return () => setHeaderTitle(null);
//   }, [selectedTracker, setHeaderTitle]);

//   const backToList = useCallback(() => setSelectedTracker(undefined), []);
//   const handleBack = useCallback(() => {
//     if (selectedTracker) {
//       backToList();
//     } else if (onBack) {
//       onBack();
//     } else if (router.canGoBack()) {
//       router.back();
//     } else {
//       router.replace("/common/home");
//     }
//   }, [backToList, onBack, selectedTracker]);

//   useEffect(() => {
//     if (backHandlerRef) backHandlerRef.current = handleBack;
//     setBackVisible(true);
//     return () => {
//       if (backHandlerRef?.current === handleBack) backHandlerRef.current = null;
//       setBackVisible(false);
//     };
//   }, [backHandlerRef, handleBack, setBackVisible]);

//   if (selectedTracker) {
//     return <TrackerReport key={selectedTracker.id} tracker={selectedTracker} />;
//   }

//   return (
//     <AreaPage
//       title="All Trackers"
//       subtitle="Access all store trackers and reports."
//       compact
//     >
//       <View style={styles.grid}>
//         {TRACKERS.map((item) => (
//           <View key={item.id} style={styles.cell}>
//             <ActionCard
//               filled
//               title={item.name}
//               icon={item.icon ?? "report"}
//               onPress={() => setSelectedTracker(item)}
//             />
//           </View>
//         ))}
//       </View>
//     </AreaPage>
//   );
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: COLORS.surface, width: "100%" },

//   content: {
//     // padding: SPACING.lg,
//     paddingBottom: SPACING.xxl,
//     gap: SPACING.sm,
//     width: "100%",
//     paddingHorizontal: 3,
//   },

//   header: {
//     gap: SPACING.sm,
//     marginBottom: SPACING.sm,
//   },

//   form: {
//     gap: SPACING.md,
//     padding: SPACING.md,
//     backgroundColor: COLORS.white,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//   },

//   // content: {
//   //   paddingHorizontal: 5,
//   //   paddingVertical: 8,
//   //   paddingBottom: SPACING.xxl,
//   //   gap: 8,
//   // },
//   // header: { gap: SPACING.sm, marginBottom: SPACING.sm },
//   // form: {
//   //   gap: SPACING.md,
//   //   padding: SPACING.md,
//   //   backgroundColor: COLORS.white,
//   //   borderRadius: 12,
//   //   borderWidth: 1,
//   //   borderColor: COLORS.border,
//   // },
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
//   demoNotice: {
//     color: COLORS.textLight,
//     fontSize: FONT_SIZE.xs,
//     textAlign: "center",
//   },
//   exportMessage: {
//     color: COLORS.textLight,
//     fontSize: FONT_SIZE.sm,
//     textAlign: "center",
//   },
//   actionRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: SPACING.sm,
//   },
//   smallActionButton: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
//   filterActionButton: { flex: 2, minWidth: 0, paddingHorizontal: SPACING.xs },
//   tableShell: { position: "relative", width: "100%" },
//   tableLoadingOverlay: {
//     position: "absolute",
//     top: 0,
//     right: 0,
//     bottom: 0,
//     left: 0,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "rgba(255,255,255,0.65)",
//     gap: SPACING.sm,
//   },
//   tableLoadingText: { color: COLORS.text, fontSize: FONT_SIZE.sm },
//   pickerOverlay: {
//     flex: 1,
//     justifyContent: "flex-end",
//     backgroundColor: "rgba(0,0,0,0.45)",
//   },
//   pickerCard: {
//     backgroundColor: COLORS.white,
//     padding: SPACING.lg,
//     borderTopLeftRadius: 18,
//     borderTopRightRadius: 18,
//     gap: SPACING.md,
//   },
//   pickerActions: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     gap: SPACING.sm,
//   },
//   tableHint: {
//     padding: SPACING.sm,
//     color: COLORS.textLight,
//     fontSize: FONT_SIZE.xs,
//   },
//   empty: {
//     alignItems: "center",
//     justifyContent: "center",
//     padding: SPACING.xl,
//     gap: SPACING.md,
//   },
//   emptyText: {
//     color: COLORS.textLight,
//     textAlign: "center",
//     fontSize: FONT_SIZE.sm,
//   },
//   error: { color: COLORS.danger, textAlign: "center", fontSize: FONT_SIZE.sm },
//   retry: { minWidth: 140 },
//   grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
//   cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
// });

// // ====================================================================================================================

// // import ActionCard from "@/components/ActionCard";
// // import { AppButton } from "@/components/AppButton";
// // import {
// //   AreaHeaderBackContext,
// //   AreaHeaderBackVisibleContext,
// //   AreaHeaderTitleContext,
// // } from "@/components/AreaHeaderBackContext";
// // import AreaPage from "@/components/AreaPage";
// // import DateField from "@/components/DateField";
// // import DynamicDataTable from "@/components/table/DynamicAutoDataTable";

// // import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
// // import { DateTimePicker } from "@expo/ui/community/datetime-picker";
// // import { Directory, File, Paths } from "expo-file-system";
// // import { router } from "expo-router";
// // import { useCallback, useContext, useEffect, useMemo, useState } from "react";
// // import {
// //   ActivityIndicator,
// //   Modal,
// //   Platform,
// //   Pressable,
// //   ScrollView,
// //   StyleSheet,
// //   Text,
// //   View,
// // } from "react-native";
// // import { SafeAreaView } from "react-native-safe-area-context";
// // import { prepareReportCsv } from "../services/reportCsv";
// // import { exceedsTableDateRange } from "../services/reportDateRange";
// // import {
// //   staticReportCells,
// //   trackerReportColumns,
// //   type ReportColumn,
// // } from "../services/reportTableColumns";
// // import { trackerTableRow } from "../services/reportTableFormat";

// // import AreaIcon from "@/components/AreaIcon";
// // import SelectField, { type SelectOption } from "@/components/SelectField";
// // import {
// //   loadTrackerFilterOptions,
// //   loadTrackerReportPage,
// //   requestTrackerCsv,
// //   type TrackerFilters,
// //   type TrackerLink,
// //   type TrackerReportRow,
// // } from "../services/AllTrackersService";
// // import { isPickerCancellation } from "../services/trackerText";
// // import { usePagination } from "../services/usePagination";

// // const PAGE_SIZE = 50;

// // const TRACKERS: TrackerLink[] = [
// //   { id: "fmcg_de", name: "FMCG D&E", icon: "shoppingCart" },
// //   { id: "non_apps_dd", name: "Non-Apps D&D ", icon: "clipboardList" },
// //   { id: "snap_up_dd", name: "SnapUp D&D ", icon: "calendar" },
// //   { id: "beauty_dd", name: " Beauty D&D / TESTER", icon: "gem" },
// //   { id: "tso_dd", name: "TSO D&D", icon: "chartLine" },
// //   {
// //     id: "store_incident_log",
// //     name: "Store Incident Log",
// //     icon: "archive",
// //   },
// //   {
// //     id: "jewellery_hair_accessories_dd",
// //     name: "Jewellery & Hair Accessories D&D",
// //     icon: "palette",
// //   },
// //   {
// //     id: "unloading_payment",
// //     name: "Load & Unload Payment",
// //     icon: "truckLoading",
// //   },
// //   { id: "canteen_fooding", name: "Canteen Fooding", icon: "utensils" },
// //   { id: "fmcg_price_mismatch", name: "FMCG Price Mismatch", icon: "tag" },
// //   {
// //     id: "grt_packet_readiness",
// //     name: "GRT Packet Readiness",
// //     icon: "clipboardList",
// //   },
// //   {
// //     id: "ist_packet_readiness",
// //     name: "IST Packet Readiness",
// //     icon: "boxOpen",
// //   },
// //   { id: "near_to_expiry", name: "Near To Expiry", icon: "hourglassHalf" },
// //   { id: "damage_apparel", name: "Damage Apparel", icon: "unlink" },
// //   { id: "missing_tag", name: "Missing Tag", icon: "tag" },
// //   { id: "sensor_tag", name: "Sensor Tag", icon: "magic" },
// //   {
// //     id: "monthly_lp_global_count",
// //     name: "Monthly LP Global Count",
// //     icon: "globe",
// //   },
// // ];

// // function inputDate(date: Date): string {
// //   return [
// //     date.getFullYear(),
// //     String(date.getMonth() + 1).padStart(2, "0"),
// //     String(date.getDate()).padStart(2, "0"),
// //   ].join("-");
// // }

// // function defaultDateRange() {
// //   const to = new Date();
// //   const date = inputDate(to);
// //   return { from: date, to: date };
// // }

// // function parseDay(value: string): number | undefined {
// //   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
// //   const time = Date.parse(`${value}T00:00:00Z`);
// //   return Number.isFinite(time) &&
// //     new Date(time).toISOString().slice(0, 10) === value
// //     ? time
// //     : undefined;
// // }

// // function TrackerTable({
// //   trackerId,
// //   apiColumns,
// //   rows,
// //   offset,
// // }: {
// //   trackerId: TrackerLink["id"];
// //   apiColumns: readonly ReportColumn[];
// //   rows: TrackerReportRow[];
// //   offset: number;
// // }) {
// //   const columns = trackerReportColumns(trackerId, apiColumns, rows);

// //   const tableData = rows.map((row, index) => {
// //     const cells = staticReportCells(trackerTableRow(row), columns);

// //     const record: Record<string, string> = {
// //       __rowKey: `${trackerId}-${offset + index}-${row.id}`,
// //       serial: String(offset + index + 1),
// //     };

// //     columns.forEach((column, columnIndex) => {
// //       record[`col_${columnIndex}`] = String(cells[columnIndex] ?? "");
// //     });

// //     return record;
// //   });

// //   const tableColumns = [
// //     {
// //       title: "#",
// //       dataIndex: "serial",
// //       fixed: "left" as const,
// //       width: 55,
// //     },
// //     ...columns.map((column, index) => ({
// //       title: column.title,
// //       dataIndex: `col_${index}`,
// //     })),
// //   ];

// //   return (
// //     <DynamicDataTable
// //       columns={tableColumns}
// //       data={tableData}
// //       height={400}
// //       refreshKey={`${trackerId}-${offset}-${rows.length}-${columns
// //         .map((c) => c.data)
// //         .join(",")}`}
// //     />
// //   );
// // }

// // function toOptions(values: readonly string[]): SelectOption[] {
// //   return values.map((value) => ({ value, label: value }));
// // }

// // export function TrackerReport({ tracker }: { tracker: TrackerLink }) {
// //   const initialRange = useMemo(defaultDateRange, []);
// //   const [fromDate, setFromDate] = useState(initialRange.from);
// //   const [toDate, setToDate] = useState(initialRange.to);
// //   const [region, setRegion] = useState("");
// //   const [zone, setZone] = useState("");
// //   const [store, setStore] = useState("");
// //   const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
// //   const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
// //   const [storeOptions, setStoreOptions] = useState<SelectOption[]>([]);
// //   const [appliedFilters, setAppliedFilters] = useState<TrackerFilters>({
// //     from: initialRange.from,
// //     to: initialRange.to,
// //     region: "",
// //     zone: "",
// //     store: "",
// //   });
// //   const pageSize = PAGE_SIZE;

// //   const [exporting, setExporting] = useState(false);
// //   const [error, setError] = useState<string>();
// //   const [exportMessage, setExportMessage] = useState<string>();
// //   const [reloadKey, setReloadKey] = useState(0);
// //   const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
// //   const [draftPickerDate, setDraftPickerDate] = useState(new Date());
// //   const queryKey = useMemo(
// //     () => JSON.stringify([tracker.id, appliedFilters, reloadKey]),
// //     [appliedFilters, reloadKey, tracker.id],
// //   );
// //   const fetchPage = useCallback(
// //     async (requestedPage: number, limit: number, signal: AbortSignal) => {
// //       const result = await loadTrackerReportPage(
// //         tracker.id,
// //         appliedFilters,
// //         (requestedPage - 1) * limit,
// //         limit,
// //         signal,
// //       );
// //       return {
// //         data: result.rows,
// //         total: result.total,
// //         metadata: result.columns,
// //       };
// //     },
// //     [appliedFilters, tracker.id],
// //   );
// //   const {
// //     data: rows,
// //     total,
// //     page: currentPage,
// //     metadata,
// //     loading,
// //     error: pageError,
// //     goToPage,
// //   } = usePagination<TrackerReportRow>({
// //     queryKey,
// //     limit: pageSize,
// //     fetchPage,
// //   });
// //   const apiColumns = Array.isArray(metadata)
// //     ? (metadata as ReportColumn[])
// //     : [];
// //   const offset = (currentPage - 1) * pageSize;
// //   const totalPages = Math.ceil(total / pageSize);
// //   const firstVisiblePage = currentPage;
// //   const visiblePages = Array.from(
// //     { length: Math.max(0, Math.min(5, totalPages - firstVisiblePage + 1)) },
// //     (_, index) => firstVisiblePage + index,
// //   );
// //   const visibleError = error ?? pageError;

// //   useEffect(() => {
// //     let active = true;
// //     loadTrackerFilterOptions(region, zone)
// //       .then((options) => {
// //         if (!active) return;
// //         setRegionOptions(toOptions(options.regions));
// //         setZoneOptions(toOptions(options.zones));
// //         setStoreOptions(
// //           options.stores.map((item) => ({ value: item.id, label: item.name })),
// //         );
// //       })
// //       .catch((cause) => {
// //         if (active)
// //           setError(
// //             cause instanceof Error
// //               ? cause.message
// //               : "Unable to load location filters.",
// //           );
// //       });
// //     return () => {
// //       active = false;
// //     };
// //   }, [region, zone]);

// //   const getFilters = useCallback((): TrackerFilters | undefined => {
// //     const from = parseDay(fromDate);
// //     const to = parseDay(toDate);
// //     if (
// //       from === undefined ||
// //       to === undefined ||
// //       from > to ||
// //       toDate > inputDate(new Date())
// //     ) {
// //       setError("Enter a valid date range using YYYY-MM-DD.");
// //       return undefined;
// //     }
// //     if ((to - from) / 86_400_000 + 1 > 31) {
// //       setError("Choose a date range of 31 days or less.");
// //       return undefined;
// //     }
// //     return { from: fromDate, to: toDate, region, zone, store };
// //   }, [fromDate, region, store, toDate, zone]);

// //   const applyFilters = useCallback(() => {
// //     const filters = getFilters();
// //     if (!filters) return;
// //     setError(undefined);
// //     setExportMessage(undefined);
// //     setAppliedFilters(filters);
// //   }, [getFilters]);

// //   const resetFilters = useCallback(() => {
// //     const today = inputDate(new Date());
// //     setFromDate(today);
// //     setToDate(today);
// //     setRegion("");
// //     setZone("");
// //     setStore("");
// //     setError(undefined);
// //     setExportMessage(undefined);
// //     setAppliedFilters({
// //       from: today,
// //       to: today,
// //       region: "",
// //       zone: "",
// //       store: "",
// //     });
// //   }, []);

// //   const openDatePicker = useCallback(
// //     (target: "from" | "to") => {
// //       const current = target === "from" ? fromDate : toDate;
// //       setDraftPickerDate(
// //         parseDay(current) === undefined
// //           ? new Date()
// //           : new Date(`${current}T00:00:00`),
// //       );
// //       setPickerTarget(target);
// //     },
// //     [fromDate, toDate],
// //   );

// //   const savePickedDate = useCallback(
// //     (date: Date) => {
// //       const formatted = inputDate(date);
// //       if (pickerTarget === "from") {
// //         setFromDate(formatted);
// //         setToDate(formatted);
// //       }
// //       if (pickerTarget === "to") setToDate(formatted);
// //       setPickerTarget(null);
// //     },
// //     [pickerTarget],
// //   );

// //   const exportReport = useCallback(async () => {
// //     const filters = getFilters();
// //     if (!filters) return;
// //     setError(undefined);
// //     setExportMessage(undefined);
// //     setExporting(true);
// //     try {
// //       const { csv, filename } = await requestTrackerCsv(tracker.id, filters);
// //       if (Platform.OS === "web") {
// //         const blob = new Blob([prepareReportCsv(csv)], {
// //           type: "text/csv;charset=utf-8",
// //         });
// //         const objectUrl = URL.createObjectURL(blob);
// //         const link = document.createElement("a");
// //         link.href = objectUrl;
// //         link.download = filename;
// //         link.click();
// //         setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
// //         setExportMessage(`Downloaded ${filename}.`);
// //         return;
// //       }

// //       let file: File;
// //       if (Platform.OS === "android") {
// //         let directory: Directory;
// //         try {
// //           directory = await Directory.pickDirectoryAsync();
// //         } catch (pickerError) {
// //           if (isPickerCancellation(pickerError)) return;
// //           throw pickerError;
// //         }
// //         if (!directory) return;
// //         file = directory.createFile(filename, "text/comma-separated-values");
// //       } else {
// //         file = new File(Paths.document, filename);
// //         file.create({ overwrite: true });
// //       }
// //       file.write(prepareReportCsv(csv));
// //       if (!file.exists) throw new Error("The export file was not saved.");
// //       setExportMessage(`Saved ${filename}.`);
// //     } catch (cause) {
// //       const message = cause instanceof Error ? cause.message : String(cause);
// //       setError(`CSV export failed: ${message}`);
// //     } finally {
// //       setExporting(false);
// //     }
// //   }, [getFilters, tracker.id]);

// //   return (
// //     <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
// //       <ScrollView
// //         contentContainerStyle={styles.content}
// //         keyboardShouldPersistTaps="handled"
// //         nestedScrollEnabled
// //       >
// //         <View style={styles.header}>
// //           <View style={styles.form}>
// //             {/* <Text style={styles.sectionTitle}>Filters</Text> */}
// //             <View style={styles.filterRow}>
// //               {Platform.OS === "web" ? (
// //                 <>
// //                   <View style={styles.fieldCell}>
// //                     <DateField
// //                       compact
// //                       label="From Date"
// //                       value={fromDate}
// //                       maxDate={inputDate(new Date())}
// //                       onChange={(value) => {
// //                         setFromDate(value);
// //                         if (parseDay(value) !== undefined) setToDate(value);
// //                       }}
// //                     />
// //                   </View>
// //                   <View style={styles.fieldCell}>
// //                     <DateField
// //                       compact
// //                       label="To Date"
// //                       value={toDate}
// //                       maxDate={inputDate(new Date())}
// //                       minDate={fromDate}
// //                       onChange={setToDate}
// //                     />
// //                   </View>
// //                 </>
// //               ) : (
// //                 <>
// //                   <View style={styles.fieldCell}>
// //                     <Text style={styles.fieldLabel}>From Date</Text>
// //                     <View style={styles.dateButtonWrap}>
// //                       <AppButton
// //                         title={fromDate}
// //                         variant="outline"
// //                         onPress={() => openDatePicker("from")}
// //                         style={styles.dateButton}
// //                         textStyle={styles.dateText}
// //                       />
// //                       <View pointerEvents="none" style={styles.dateIcon}>
// //                         <AreaIcon
// //                           name="calendar"
// //                           color={COLORS.textLight}
// //                           size={19}
// //                         />
// //                       </View>
// //                     </View>
// //                   </View>
// //                   <View style={styles.fieldCell}>
// //                     <Text style={styles.fieldLabel}>To Date</Text>
// //                     <View style={styles.dateButtonWrap}>
// //                       <AppButton
// //                         title={toDate}
// //                         variant="outline"
// //                         onPress={() => openDatePicker("to")}
// //                         style={styles.dateButton}
// //                         textStyle={styles.dateText}
// //                       />
// //                       <View pointerEvents="none" style={styles.dateIcon}>
// //                         <AreaIcon
// //                           name="calendar"
// //                           color={COLORS.textLight}
// //                           size={19}
// //                         />
// //                       </View>
// //                     </View>
// //                   </View>
// //                 </>
// //               )}
// //             </View>
// //             <View style={styles.filterRow}>
// //               <View style={styles.fieldCell}>
// //                 <SelectField
// //                   label=""
// //                   value={region}
// //                   options={regionOptions}
// //                   placeholder="All regions"
// //                   onChange={(value) => {
// //                     setRegion(value);
// //                     setZone("");
// //                     setStore("");
// //                   }}
// //                 />
// //               </View>
// //               <View style={styles.fieldCell}>
// //                 <SelectField
// //                   label=""
// //                   value={zone}
// //                   options={zoneOptions}
// //                   placeholder="All zones"
// //                   onChange={(value) => {
// //                     setZone(value);
// //                     setStore("");
// //                   }}
// //                 />
// //               </View>
// //             </View>
// //             <View style={styles.filterRow}>
// //               <View style={styles.fieldCell}>
// //                 <SelectField
// //                   label=""
// //                   value={store}
// //                   options={storeOptions}
// //                   placeholder="All stores"
// //                   onChange={setStore}
// //                 />
// //               </View>
// //             </View>

// //             {exportMessage ? (
// //               <Text style={styles.exportMessage}>{exportMessage}</Text>
// //             ) : null}
// //             <View style={styles.actionRow}>
// //               <AppButton
// //                 title="Reset Filters"
// //                 variant="outline"
// //                 onPress={resetFilters}
// //                 disabled={loading || exporting}
// //               />

// //               <AppButton
// //                 title={loading ? "Loading\u2026" : "Filter Report"}
// //                 onPress={applyFilters}
// //                 disabled={loading || exporting}
// //                 style={styles.actionButton}
// //               />
// //             </View>
// //             <AppButton
// //               title={exporting ? "Exporting\u2026" : "Export CSV"}
// //               variant="outline"
// //               onPress={() => void exportReport()}
// //               disabled={exporting}
// //               style={styles.actionButton}
// //             />
// //             <Text style={styles.demoNotice}>
// //               {loading
// //                 ? "Loading report data\u2026"
// //                 : `${rows.length} of ${total} report records`}
// //             </Text>
// //           </View>
// //           {visibleError ? (
// //             <Text accessibilityRole="alert" style={styles.error}>
// //               {visibleError}
// //             </Text>
// //           ) : null}
// //         </View>
// //         {exceedsTableDateRange(fromDate, toDate) && (
// //           <Text style={styles.tableHint}>
// //             You can export full range data. Only the first 7 days from the
// //             selected start date are visible in the table.
// //           </Text>
// //         )}
// //         {!loading && !visibleError && rows.length > 0 && (
// //           <TrackerTable
// //             apiColumns={apiColumns}
// //             trackerId={tracker.id}
// //             rows={rows}
// //             offset={offset}
// //           />
// //         )}
// //         {rows.length === 0 && (
// //           <View style={styles.empty}>
// //             {loading ? (
// //               <ActivityIndicator color={COLORS.primary} />
// //             ) : visibleError ? (
// //               <AppButton
// //                 title="Try again"
// //                 onPress={() => setReloadKey((value) => value + 1)}
// //                 style={styles.retry}
// //               />
// //             ) : (
// //               <Text style={styles.emptyText}>
// //                 No tracker rows found for these dates.
// //               </Text>
// //             )}
// //           </View>
// //         )}
// //         {!visibleError && total > 0 && (
// //           <View style={styles.paginationContainer}>
// //             <Text style={styles.pageLabel}>
// //               Page {currentPage} of {totalPages}
// //               {" | "}
// //               {offset + 1}-{Math.min(offset + rows.length, total)} of {total}
// //             </Text>
// //             <View style={styles.pagination}>
// //               <Pressable
// //                 accessibilityRole="button"
// //                 accessibilityLabel="Previous page"
// //                 accessibilityState={{ disabled: loading || offset === 0 }}
// //                 style={({ pressed }) => [
// //                   styles.pageIconButton,
// //                   {
// //                     opacity: loading || offset === 0 ? 0.4 : pressed ? 0.7 : 1,
// //                   },
// //                 ]}
// //                 disabled={loading || offset === 0}
// //                 onPress={() => void goToPage(currentPage - 1)}
// //               >
// //                 <View style={styles.previousIcon}>
// //                   <AreaIcon name="chevron" size={16} color={COLORS.primary} />
// //                 </View>
// //               </Pressable>
// //               {visiblePages.map((page) => (
// //                 <AppButton
// //                   key={page}
// //                   title={String(page)}
// //                   accessibilityLabel={`Page ${page}${page === currentPage ? ", current page" : ""}`}
// //                   variant={page === currentPage ? "primary" : "outline"}
// //                   disabled={loading}
// //                   style={styles.pageButton}
// //                   textStyle={styles.pageButtonText}
// //                   onPress={() => {
// //                     if (page !== currentPage) {
// //                       void goToPage(page);
// //                     }
// //                   }}
// //                 />
// //               ))}
// //               {totalPages > firstVisiblePage + visiblePages.length - 1 && (
// //                 <>
// //                   {totalPages > firstVisiblePage + visiblePages.length && (
// //                     <Text style={styles.paginationEllipsis}>...</Text>
// //                   )}
// //                   <AppButton
// //                     title={String(totalPages)}
// //                     accessibilityLabel={`Last page, page ${totalPages}`}
// //                     variant="outline"
// //                     disabled={loading}
// //                     style={styles.pageButton}
// //                     textStyle={styles.pageButtonText}
// //                     onPress={() => void goToPage(totalPages)}
// //                   />
// //                 </>
// //               )}
// //               <Pressable
// //                 accessibilityRole="button"
// //                 accessibilityLabel="Next page"
// //                 accessibilityState={{
// //                   disabled: loading || offset + rows.length >= total,
// //                 }}
// //                 style={({ pressed }) => [
// //                   styles.pageIconButton,
// //                   {
// //                     opacity:
// //                       loading || offset + rows.length >= total
// //                         ? 0.4
// //                         : pressed
// //                           ? 0.7
// //                           : 1,
// //                   },
// //                 ]}
// //                 disabled={loading || offset + rows.length >= total}
// //                 onPress={() => void goToPage(currentPage + 1)}
// //               >
// //                 <AreaIcon name="chevron" size={16} color={COLORS.primary} />
// //               </Pressable>
// //             </View>
// //           </View>
// //         )}
// //       </ScrollView>
// //       {pickerTarget && Platform.OS === "android" && (
// //         <DateTimePicker
// //           value={draftPickerDate}
// //           maximumDate={new Date()}
// //           minimumDate={
// //             pickerTarget === "to" ? new Date(`${fromDate}T00:00:00`) : undefined
// //           }
// //           mode="date"
// //           presentation="dialog"
// //           accentColor={COLORS.primary}
// //           onValueChange={(_, date) => savePickedDate(date)}
// //           onDismiss={() => setPickerTarget(null)}
// //         />
// //       )}
// //       {pickerTarget && Platform.OS === "ios" && (
// //         <Modal
// //           transparent
// //           animationType="slide"
// //           visible
// //           onRequestClose={() => setPickerTarget(null)}
// //         >
// //           <View style={styles.pickerOverlay}>
// //             <View style={styles.pickerCard}>
// //               <View style={styles.pickerActions}>
// //                 <AppButton
// //                   title="Cancel"
// //                   variant="outline"
// //                   onPress={() => setPickerTarget(null)}
// //                 />
// //                 <AppButton
// //                   title="Done"
// //                   onPress={() => savePickedDate(draftPickerDate)}
// //                 />
// //               </View>
// //               <DateTimePicker
// //                 value={draftPickerDate}
// //                 maximumDate={new Date()}
// //                 minimumDate={
// //                   pickerTarget === "to"
// //                     ? new Date(`${fromDate}T00:00:00`)
// //                     : undefined
// //                 }
// //                 mode="date"
// //                 onValueChange={(_, date) => setDraftPickerDate(date)}
// //               />
// //             </View>
// //           </View>
// //         </Modal>
// //       )}
// //     </SafeAreaView>
// //   );
// // }

// // export default function AllTrackers({ onBack }: { onBack?: () => void }) {
// //   const backHandlerRef = useContext(AreaHeaderBackContext);
// //   const setBackVisible = useContext(AreaHeaderBackVisibleContext);
// //   const [selectedTracker, setSelectedTracker] = useState<TrackerLink>();
// //   const setHeaderTitle = useContext(AreaHeaderTitleContext);
// //   useEffect(() => {
// //     setHeaderTitle(selectedTracker?.name ?? "All Trackers");
// //     return () => setHeaderTitle(null);
// //   }, [selectedTracker, setHeaderTitle]);

// //   const backToList = useCallback(() => setSelectedTracker(undefined), []);
// //   const handleBack = useCallback(() => {
// //     if (selectedTracker) {
// //       backToList();
// //     } else if (onBack) {
// //       onBack();
// //     } else if (router.canGoBack()) {
// //       router.back();
// //     } else {
// //       router.replace("/common/home");
// //     }
// //   }, [backToList, onBack, selectedTracker]);

// //   useEffect(() => {
// //     if (backHandlerRef) backHandlerRef.current = handleBack;
// //     setBackVisible(true);
// //     return () => {
// //       if (backHandlerRef?.current === handleBack) backHandlerRef.current = null;
// //       setBackVisible(false);
// //     };
// //   }, [backHandlerRef, handleBack, setBackVisible]);

// //   if (selectedTracker) {
// //     return <TrackerReport key={selectedTracker.id} tracker={selectedTracker} />;
// //   }

// //   return (
// //     <AreaPage
// //       title="All Trackers"
// //       subtitle="Access all store trackers and reports."
// //       compact
// //     >
// //       <View style={styles.grid}>
// //         {TRACKERS.map((item) => (
// //           <View key={item.id} style={styles.cell}>
// //             <ActionCard
// //               filled
// //               title={item.name}
// //               icon={item.icon ?? "report"}
// //               onPress={() => setSelectedTracker(item)}
// //             />
// //           </View>
// //         ))}
// //       </View>
// //     </AreaPage>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   screen: { flex: 1, backgroundColor: COLORS.surface, width: "100%" },

// //   content: {
// //     // padding: SPACING.lg,
// //     paddingBottom: SPACING.xxl,
// //     gap: SPACING.sm,
// //     width: "100%",
// //     paddingHorizontal: 3,
// //   },

// //   header: {
// //     gap: SPACING.sm,
// //     marginBottom: SPACING.sm,
// //   },

// //   form: {
// //     gap: SPACING.md,
// //     padding: SPACING.md,
// //     backgroundColor: COLORS.white,
// //     borderRadius: 12,
// //     borderWidth: 1,
// //     borderColor: COLORS.border,
// //   },

// //   // content: {
// //   //   paddingHorizontal: 5,
// //   //   paddingVertical: 8,
// //   //   paddingBottom: SPACING.xxl,
// //   //   gap: 8,
// //   // },
// //   // header: { gap: SPACING.sm, marginBottom: SPACING.sm },
// //   // form: {
// //   //   gap: SPACING.md,
// //   //   padding: SPACING.md,
// //   //   backgroundColor: COLORS.white,
// //   //   borderRadius: 12,
// //   //   borderWidth: 1,
// //   //   borderColor: COLORS.border,
// //   // },
// //   filterRow: {
// //     flexDirection: "row",
// //     alignItems: "flex-start",
// //     gap: SPACING.sm,
// //   },
// //   fieldCell: { flex: 1, minWidth: 0 },
// //   fieldLabel: {
// //     color: COLORS.text,
// //     fontSize: FONT_SIZE.sm,
// //     fontWeight: FONT_WEIGHT.medium,
// //   },
// //   dateButtonWrap: { position: "relative", marginTop: SPACING.xs },
// //   dateButton: {
// //     width: "100%",
// //     minHeight: 48,
// //     justifyContent: "center",
// //     backgroundColor: COLORS.white,
// //     borderColor: COLORS.border,
// //   },
// //   dateText: {
// //     width: "100%",
// //     textAlign: "left",
// //     color: COLORS.text,
// //     paddingRight: SPACING.xl,
// //   },
// //   dateIcon: {
// //     position: "absolute",
// //     top: 0,
// //     right: SPACING.sm,
// //     bottom: 0,
// //     justifyContent: "center",
// //   },
// //   demoNotice: {
// //     color: COLORS.textLight,
// //     fontSize: FONT_SIZE.xs,
// //     textAlign: "center",
// //   },
// //   exportMessage: {
// //     color: COLORS.textLight,
// //     fontSize: FONT_SIZE.sm,
// //     textAlign: "center",
// //   },
// //   actionRow: { flexDirection: "row", gap: SPACING.sm },
// //   actionButton: { flex: 1, minWidth: 0, paddingHorizontal: SPACING.xs },
// //   pickerOverlay: {
// //     flex: 1,
// //     justifyContent: "flex-end",
// //     backgroundColor: "rgba(0,0,0,0.45)",
// //   },
// //   pickerCard: {
// //     backgroundColor: COLORS.white,
// //     padding: SPACING.lg,
// //     borderTopLeftRadius: 18,
// //     borderTopRightRadius: 18,
// //     gap: SPACING.md,
// //   },
// //   pickerActions: {
// //     flexDirection: "row",
// //     justifyContent: "space-between",
// //     gap: SPACING.sm,
// //   },
// //   tableHint: {
// //     padding: SPACING.sm,
// //     color: COLORS.textLight,
// //     fontSize: FONT_SIZE.xs,
// //   },
// //   paginationContainer: { gap: SPACING.sm },
// //   pagination: {
// //     flexDirection: "row",
// //     flexWrap: "nowrap",
// //     alignItems: "center",
// //     justifyContent: "center",
// //     gap: SPACING.xs,
// //   },
// //   pageIconButton: {
// //     flex: 1,
// //     minWidth: 0,
// //     maxWidth: 44,
// //     minHeight: 44,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     borderWidth: 1,
// //     borderColor: COLORS.primary,
// //     borderRadius: 8,
// //   },
// //   previousIcon: { transform: [{ rotate: "180deg" }] },
// //   pageButton: {
// //     flex: 1,
// //     minWidth: 0,
// //     maxWidth: 44,
// //     minHeight: 44,
// //     paddingHorizontal: 0,
// //   },
// //   pageButtonText: { fontSize: FONT_SIZE.xs },
// //   paginationEllipsis: {
// //     width: 16,
// //     textAlign: "center",
// //     color: COLORS.textLight,
// //     fontSize: FONT_SIZE.xs,
// //   },
// //   pageLabel: {
// //     textAlign: "center",
// //     color: COLORS.textLight,
// //     fontSize: FONT_SIZE.xs,
// //   },
// //   empty: {
// //     alignItems: "center",
// //     justifyContent: "center",
// //     padding: SPACING.xl,
// //     gap: SPACING.md,
// //   },
// //   emptyText: {
// //     color: COLORS.textLight,
// //     textAlign: "center",
// //     fontSize: FONT_SIZE.sm,
// //   },
// //   error: { color: COLORS.danger, textAlign: "center", fontSize: FONT_SIZE.sm },
// //   retry: { minWidth: 140 },
// //   grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
// //   cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
// // });
