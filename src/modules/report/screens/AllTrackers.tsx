import { AppButton } from "@/components/AppButton";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "../services/AreaHeaderBackContext";
import { prepareReportCsv } from "../services/reportCsv";
import { exceedsTableDateRange } from "../services/reportDateRange";
import {
  staticReportCells,
  trackerReportColumns,
  type ReportColumn,
} from "../services/reportTableColumns";
import { trackerTableRow } from "../services/reportTableFormat";
import ActionCard from "./ActionCard";
import DateField from "./DateField";

import AreaIcon from "@/components/AreaIcon";
import {
  loadTrackerFilterOptions,
  loadTrackerReportPage,
  requestTrackerCsv,
  type TrackerFilters,
  type TrackerLink,
  type TrackerReportRow,
} from "../services/AllTrackersService";
import { isPickerCancellation } from "../services/trackerText";
import SelectField, { type SelectOption } from "./SelectField";

const PAGE_SIZE = 50;

const TRACKERS: TrackerLink[] = [
  { id: "fmcg_de", name: "FMCG D&E Tracker" },
  { id: "non_apps_dd", name: "Non-Apps D&D Tracker" },
  { id: "snap_up_dd", name: "SnapUp D&D Tracker" },
  { id: "beauty_dd", name: "Tracker for Beauty D&D / TESTER" },
  { id: "tso_dd", name: "TSO D&D" },
  { id: "store_incident_log", name: "Store Incident Log Tracker" },
  {
    id: "jewellery_hair_accessories_dd",
    name: "Jewellery & Hair Accessories D&D Register",
  },
  { id: "unloading_payment", name: "Load & Unload Payment Tracker" },
  { id: "canteen_fooding", name: "Canteen Fooding Tracker" },
  { id: "fmcg_price_mismatch", name: "FMCG Price Mismatch" },
  { id: "grt_packet_readiness", name: "GRT Packet Readiness Tracker" },
  { id: "ist_packet_readiness", name: "IST Packet Readiness Tracker" },
  { id: "near_to_expiry", name: "Near To Expiry" },
  { id: "damage_apparel", name: "Damage Apparel" },
  { id: "missing_tag", name: "Missing Tag" },
  { id: "sensor_tag", name: "Sensor Tag" },
  { id: "monthly_lp_global_count", name: "Monthly LP Global Count" },
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
}: {
  trackerId: TrackerLink["id"];
  apiColumns: readonly ReportColumn[];
  rows: TrackerReportRow[];
  offset: number;
}) {
  const { height } = useWindowDimensions();
  const columns = trackerReportColumns(trackerId, apiColumns, rows);
  const tableRows = rows.map((row) => ({
    ...row,
    cells: staticReportCells(trackerTableRow(row), columns),
  }));
  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableHint}>
        Swipe left or right to view all columns
      </Text>
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
              {row.cells.map((value, columnIndex) => (
                <Text
                  key={columns[columnIndex].data}
                  selectable
                  style={styles.tableCell}
                >
                  {value}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

export function TrackerReport({ tracker }: { tracker: TrackerLink }) {
  const initialRange = useMemo(defaultDateRange, []);
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
  const [apiColumns, setApiColumns] = useState<ReportColumn[]>([]);
  const [rows, setRows] = useState<TrackerReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = PAGE_SIZE;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);
  const firstVisiblePage = currentPage;
  const visiblePages = Array.from(
    { length: Math.max(0, Math.min(5, totalPages - firstVisiblePage + 1)) },
    (_, index) => firstVisiblePage + index,
  );

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>();
  const [exportMessage, setExportMessage] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [draftPickerDate, setDraftPickerDate] = useState(new Date());

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

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRows([]);
    setApiColumns([]);
    setError(undefined);
    loadTrackerReportPage(tracker.id, appliedFilters, offset)
      .then((page) => {
        if (!active) return;
        setRows(page.rows);
        setApiColumns(page.columns);
        setTotal(page.total);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load this tracker.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters, offset, reloadKey, tracker.id]);

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
    setOffset(0);
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
    setOffset(0);
    setAppliedFilters({
      from: today,
      to: today,
      region: "",
      zone: "",
      store: "",
    });
  }, []);

  const openDatePicker = useCallback(
    (target: "from" | "to") => {
      const current = target === "from" ? fromDate : toDate;
      setDraftPickerDate(
        parseDay(current) === undefined
          ? new Date()
          : new Date(`${current}T00:00:00`),
      );
      setPickerTarget(target);
    },
    [fromDate, toDate],
  );

  const savePickedDate = useCallback(
    (date: Date) => {
      const formatted = inputDate(date);
      if (pickerTarget === "from") {
        setFromDate(formatted);
        setToDate(formatted);
      }
      if (pickerTarget === "to") setToDate(formatted);
      setPickerTarget(null);
    },
    [pickerTarget],
  );

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

      let file: File;
      if (Platform.OS === "android") {
        let directory: Directory;
        try {
          directory = await Directory.pickDirectoryAsync();
        } catch (pickerError) {
          if (isPickerCancellation(pickerError)) return;
          throw pickerError;
        }
        if (!directory) return;
        file = directory.createFile(filename, "text/comma-separated-values");
      } else {
        file = new File(Paths.document, filename);
        file.create({ overwrite: true });
      }
      file.write(prepareReportCsv(csv));
      if (!file.exists) throw new Error("The export file was not saved.");
      setExportMessage(`Saved ${filename}.`);
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
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.filterRow}>
              {Platform.OS === "web" ? (
                <>
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
                  onChange={setStore}
                />
              </View>
            </View>
            <Text style={styles.demoNotice}>
              {loading
                ? "Loading report data\u2026"
                : `${rows.length} of ${total} report records`}
            </Text>
            {exportMessage ? (
              <Text style={styles.exportMessage}>{exportMessage}</Text>
            ) : null}
            <View style={styles.actionRow}>
              <AppButton
                title={loading ? "Loading\u2026" : "Filter Report"}
                onPress={applyFilters}
                disabled={loading || exporting}
                style={styles.actionButton}
              />
              <AppButton
                title={exporting ? "Exporting\u2026" : "Export CSV"}
                variant="outline"
                onPress={() => void exportReport()}
                disabled={exporting}
                style={styles.actionButton}
              />
            </View>
            <AppButton
              title="Reset Filters"
              variant="outline"
              onPress={resetFilters}
              disabled={loading || exporting}
            />
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
        {exceedsTableDateRange(fromDate, toDate) && (
          <Text style={styles.tableHint}>
            You can export full range data. Only the first 7 days from the
            selected start date are visible in the table.
          </Text>
        )}
        {!loading && !error && rows.length > 0 && (
          <TrackerTable
            apiColumns={apiColumns}
            trackerId={tracker.id}
            rows={rows}
            offset={offset}
          />
        )}
        {rows.length === 0 && (
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : error ? (
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
                  {
                    opacity: loading || offset === 0 ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
                disabled={loading || offset === 0}
                onPress={() => setOffset(Math.max(0, offset - pageSize))}
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
                      setOffset((page - 1) * pageSize);
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
                    onPress={() => setOffset((totalPages - 1) * pageSize)}
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
                onPress={() => setOffset(offset + pageSize)}
              >
                <AreaIcon name="chevron" size={16} color={COLORS.primary} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
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
                onValueChange={(_, date) => setDraftPickerDate(date)}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

export default function AllTrackers({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const [selectedTracker, setSelectedTracker] = useState<TrackerLink>();
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  useEffect(() => {
    setHeaderTitle(selectedTracker?.name ?? "All Trackers");
    return () => setHeaderTitle(null);
  }, [selectedTracker, setHeaderTitle]);

  const backToList = useCallback(() => setSelectedTracker(undefined), []);
  const handleBack = selectedTracker ? backToList : onBack;

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = handleBack;
    setBackVisible(true);
    return () => {
      if (backHandlerRef) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, handleBack, setBackVisible]);

  if (selectedTracker) {
    return <TrackerReport key={selectedTracker.id} tracker={selectedTracker} />;
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <FlatList
        data={TRACKERS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ActionCard
              filled
              title={item.name}
              icon="report"
              onPress={() => setSelectedTracker(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trackers available.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  header: { gap: SPACING.sm, marginBottom: SPACING.sm },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  count: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  gridRow: { gap: SPACING.md },
  cell: { flex: 1, minWidth: 0 },
  form: {
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
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
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  pickerCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: SPACING.md,
  },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  tableHint: {
    padding: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tableHeader: { backgroundColor: COLORS.primary },
  tableCell: {
    width: 160,
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
  },
  numberCell: { width: 64 },
  headerText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
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
  footer: { padding: SPACING.md },
});
