import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import DateField from "@/components/DateField";
import DataTable from "@/components/Table";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  exportOmniReturns,
  loadOmniReturns,
  type OmniReturnRecord,
  type OmniReturnStatus,
} from "../services/OmniReturnService";
import { today, validDate } from "../../report/services/service";
import { prepareReportCsv } from "../services/reportCsv";

import { isPickerCancellation } from "../services/trackerText";

const PAGE_SIZE = 50;
const OMNI_COLUMNS = [
  { title: "#", width: 60 },
  { title: "Order ID", width: 140 },
  { title: "Store", width: 190 },
  { title: "Site Code", width: 110 },
  { title: "Month", width: 105 },
  { title: "Marketplace", width: 150 },
  { title: "Delivery Date", width: 130 },
  { title: "AWB Status", width: 140 },
  { title: "Region", width: 130 },
  { title: "Zone", width: 130 },
  { title: "Delivery Remark", width: 230 },
  { title: "HO Final Remark", width: 230 },
  { title: "Store Remark", width: 230 },
  { title: "Submitted By", width: 150 },
  { title: "Submitted On", width: 150 },
  { title: "Status", width: 110 },
];

function value(text: string | number | null | undefined) {
  return String(text ?? "").trim() || "-";
}

function addDays(date: string, days: number) {
  if (!validDate(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

function initialDateRange() {
  const to = today();
  return { from: addDays(to, -29), to };
}

export default function AllOmniReturns({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const [status, setStatus] = useState<OmniReturnStatus>("pending");
  const [records, setRecords] = useState<OmniReturnRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [appliedDateRange, setAppliedDateRange] = useState(initialDateRange);
  const [dateError, setDateError] = useState<string>();
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [exportMessage, setExportMessage] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (
      nextStatus: OmniReturnStatus,
      nextPage: number,
      nextSearch: string,
      nextDates: { from: string; to: string },
    ) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      const currentRequest = ++requestId.current;
      setLoading(true);
      setRecords([]);
      setPageIndex(nextPage);
      setError(undefined);
      try {
        const page = await loadOmniReturns(
          nextStatus,
          nextPage * PAGE_SIZE,
          nextSearch,
          controller.signal,
          nextDates.from,
          nextDates.to,
        );
        if (currentRequest !== requestId.current) return;
        setRecords(page.records);
        setTotal(page.total);
      } catch (cause) {
        if (currentRequest !== requestId.current) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load Omni Return records.",
        );
        setTotal(0);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = onBack;
    setBackVisible(true);
    return () => {
      if (backHandlerRef) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, onBack, setBackVisible]);
  useEffect(() => {
    setTotal(0);
    setExportMessage(undefined);
    void fetchPage(
      status,
      0,
      status === "pending" ? search : "",
      status === "complete" ? appliedDateRange : { from: "", to: "" },
    );

    return () => {
      requestId.current += 1;
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [appliedDateRange, fetchPage, search, status]);

  const submitSearch = useCallback(() => {
    const term = searchText.trim();
    if (term === search) {
      void fetchPage(status, 0, search, { from: "", to: "" });
    } else {
      setSearch(term);
    }
  }, [fetchPage, search, searchText]);

  const applyDates = useCallback(() => {
    const { from, to } = dateRange;
    if (!validDate(from) || !validDate(to)) {
      setDateError("Enter valid dates using YYYY-MM-DD.");
      return;
    }
    if (from > to || to > today()) {
      setDateError("Select dates with the end date on or after the start date.");
      return;
    }
    if (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) >= 30 * 86400000) {
      setDateError("Select a date range of 30 days or less.");
      return;
    }
    setDateError(undefined);
    setAppliedDateRange({ from, to });
  }, [dateRange]);

  const changePage = useCallback(
    (nextPage: number) => {
      if (!loading && nextPage >= 0 && nextPage * PAGE_SIZE < total) {
        void fetchPage(
          status,
          nextPage,
          status === "pending" ? search : "",
          status === "complete" ? appliedDateRange : { from: "", to: "" },
        );
      }
    },
    [appliedDateRange, fetchPage, loading, search, status, total],
  );

  const changeStatus = useCallback(
    (nextStatus: OmniReturnStatus) => {
      if (nextStatus !== status) {
        setSearchText("");
        setSearch("");
        setDateError(undefined);
        setStatus(nextStatus);
      }
    },
    [status],
  );

  const exportCsv = useCallback(async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    setExportMessage(undefined);
    try {
      const { csv, filename } = await exportOmniReturns(
        status,
        status === "pending" ? search : "",
        status === "complete" ? appliedDateRange.from : "",
        status === "complete" ? appliedDateRange.to : "",
      );
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
        let picked: unknown;
        try {
          picked = await Directory.pickDirectoryAsync();
        } catch (pickerError) {
          if (isPickerCancellation(pickerError)) return;
          throw pickerError;
        }
        const destination =
          picked && typeof picked === "object" && "result" in picked
            ? picked.result
            : picked;

        if (!destination) return;
        if (!(destination instanceof Directory)) {
          throw new Error("Could not access the selected folder.");
        }
        file = destination.createFile(filename, "text/csv");
      } else {
        file = new File(Paths.document, filename);
        file.create({ overwrite: true });
      }
      await file.write(prepareReportCsv(csv));
      if (!file.exists) throw new Error("The CSV file was not created.");
      setExportMessage(
        Platform.OS === "android"
          ? `Saved ${filename} to the selected folder.`
          : `Saved ${filename} in the app's Documents folder.`,
      );
    } catch (cause) {
      setExportMessage(
        cause instanceof Error
          ? `Export failed: ${cause.message}`
          : "Export failed.",
      );
    } finally {
      setExporting(false);
    }
  }, [appliedDateRange, exporting, search, status, total]);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.filters}>
            {(["pending", "complete"] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: status === item }}
                onPress={() => changeStatus(item)}
                style={[
                  styles.filter,
                  status === item && styles.activeFilter,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    status === item && styles.activeFilterText,
                  ]}
                >
                  {item === "pending" ? "Pending" : "Complete"}
                </Text>
              </Pressable>
            ))}
          </View>
          {status === "pending" ? (
            <View style={styles.searchRow}>
              <AppInput
                accessibilityLabel="Search Omni Return records"
                placeholder="Search store, order or marketplace"
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={submitSearch}
                containerStyle={styles.searchInput}
              />
              <AppButton
                title="Search"
                onPress={submitSearch}
                style={styles.searchButton}
              />
              <AppButton
                title={exporting ? "Exporting..." : "Export"}
                variant="outline"
                onPress={() => void exportCsv()}
                disabled={exporting || loading || total === 0}
                style={styles.exportButton}
              />
            </View>
          ) : (
            <>
              <View style={styles.dateRow}>
                <View style={styles.dateCell}>
                  <DateField
                    label="From date"
                    value={dateRange.from}
                    maxDate={today()}
                    disabled={loading || exporting}
                    onChange={(from) => {
                      setDateError(undefined);
                      setDateRange((current) => {
                        const maxTo = [addDays(from, 29), today()].sort()[0];
                        const to =
                          !validDate(current.to) || current.to < from
                            ? from
                            : current.to > maxTo
                              ? maxTo
                              : current.to;
                        return { from, to };
                      });
                    }}
                  />
                </View>
                <View style={styles.dateCell}>
                  <DateField
                    label="To date"
                    value={dateRange.to}
                    minDate={dateRange.from || undefined}
                    maxDate={
                      validDate(dateRange.from)
                        ? [addDays(dateRange.from, 29), today()].sort()[0]
                        : today()
                    }
                    disabled={loading || exporting}
                    onChange={(to) => {
                      setDateError(undefined);
                      setDateRange((current) => ({ ...current, to }));
                    }}
                  />
                </View>
              </View>
              <View style={styles.dateActions}>
                <AppButton
                  title="Apply"
                  onPress={applyDates}
                  disabled={loading || exporting}
                  style={styles.searchButton}
                />
                <AppButton
                  title={exporting ? "Exporting..." : "Export"}
                  variant="outline"
                  onPress={() => void exportCsv()}
                  disabled={exporting || loading || total === 0}
                  style={styles.exportButton}
                />
              </View>
              {dateError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {dateError}
                </Text>
              )}
            </>
          )}
          {!!exportMessage && (
            <Text style={styles.exportMessage}>{exportMessage}</Text>
          )}
          {error && (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              <AppButton
                title="Try again"
                  onPress={() =>
                    void fetchPage(
                      status,
                      pageIndex,
                      status === "pending" ? search : "",
                      status === "complete"
                        ? appliedDateRange
                        : { from: "", to: "" },
                    )
                  }
                style={styles.retry}
              />
            </View>
          )}
          {!loading && !error && (
            <Text style={styles.count}>
              {records.length === 0
                ? "0 records"
                : `${pageIndex * PAGE_SIZE + 1} to ${pageIndex * PAGE_SIZE + records.length} of ${total} records`}
            </Text>
          )}
        </View>
        {loading && (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        )}
        <View style={styles.table}>
          <DataTable
            columns={OMNI_COLUMNS}
            rows={records.map((record) => ({ ...record, id: String(record.id) }))}
            empty={
              loading
                ? "Loading Omni Return records..."
                : error
                  ? "Unable to load records."
                  : `No ${status} Omni Return records found.`
            }
            renderCells={(record, index) => [
              String(pageIndex * PAGE_SIZE + index + 1),
              value(record.order_id),
              value(record.store_name),
              value(record.site_code),
              value(record.month),
              value(record.market_place),
              value(record.store_delivery_date),
              value(record.awb_status),
              value(record.region),
              value(record.zone),
              value(record.delivery_remark),
              value(record.ho_final_remark),
              value(record.store_remark),
              value(record.submitted_by),
              value(record.submitted_on),
              <Text
                style={[
                  styles.statusBadge,
                  status === "complete"
                    ? styles.completeBadge
                    : styles.pendingBadge,
                ]}
              >
                {status === "complete" ? "Complete" : "Pending"}
              </Text>,
            ]}
          />
        </View>
        {total > PAGE_SIZE && (
          <View style={styles.pagination}>
            <AppButton
              title="Previous"
              variant="outline"
              disabled={loading || pageIndex === 0}
              onPress={() => changePage(pageIndex - 1)}
              style={styles.pageButton}
            />
            <Text style={styles.pageLabel}>
              Page {pageIndex + 1} of {Math.ceil(total / PAGE_SIZE)}
            </Text>
            <AppButton
              title="Next"
              variant="outline"
              disabled={loading || (pageIndex + 1) * PAGE_SIZE >= total}
              onPress={() => changePage(pageIndex + 1)}
              style={styles.pageButton}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: {
    flex: 1,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
  filters: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#eee8e9",
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  filter: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  activeFilter: { backgroundColor: COLORS.primary },
  filterText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  activeFilterText: { color: COLORS.white },
  searchRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  dateRow: { flexDirection: "row", gap: SPACING.sm },
  dateCell: { flex: 1, minWidth: 0 },
  dateActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  searchInput: { flex: 1 },
  searchButton: { minHeight: 36, paddingVertical: 4, paddingHorizontal: SPACING.md },
  exportButton: {
    minHeight: 36,
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
  },
  exportMessage: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  count: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  table: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loader: { alignSelf: "center" },
  errorBox: { alignItems: "flex-start", gap: SPACING.sm },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    overflow: "hidden",
    borderRadius: 20,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  pendingBadge: { color: "#805600", backgroundColor: "#fff1c7" },
  completeBadge: { color: "#166534", backgroundColor: "#dcfce7" },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  retry: { minWidth: 140 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  pageButton: { minHeight: 42, minWidth: 92 },
  pageLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    textAlign: "center",
    flex: 1,
  },
});
