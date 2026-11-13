import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import AreaIcon from "@/components/AreaIcon";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { prepareReportCsv } from "../services/reportCsv";

import { isPickerCancellation } from "../services/trackerText";

const PAGE_SIZE = 50;

function value(text: string | number | null | undefined) {
  return String(text ?? "").trim() || "—";
}

function ReturnCard({
  record,
  status,
}: {
  record: OmniReturnRecord;
  status: OmniReturnStatus;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.orderIcon}>
          <AreaIcon name="globe" size={19} />
        </View>
        <View style={styles.orderHeading}>
          <Text style={styles.orderId}>Order {value(record.order_id)}</Text>
          <Text style={styles.storeName}>
            {value(record.store_name)} · {value(record.site_code)}
          </Text>
        </View>
        <Text
          style={[
            styles.statusBadge,
            status === "complete" ? styles.completeBadge : styles.pendingBadge,
          ]}
        >
          {status === "complete" ? "Complete" : "Pending"}
        </Text>
      </View>
      <View style={styles.details}>
        <InfoRow label="Month" text={record.month} />
        <InfoRow label="Marketplace" text={record.market_place} />
        <InfoRow label="Delivery date" text={record.store_delivery_date} />
        <InfoRow label="AWB status" text={record.awb_status} />
        <InfoRow
          label="Region / zone"
          text={[record.region, record.zone].filter(Boolean).join(" / ")}
        />
        <InfoRow label="Delivery remark" text={record.delivery_remark} />
        <InfoRow label="HO final remark" text={record.ho_final_remark} />
        <InfoRow label="Store remark" text={record.store_remark} />
        {status === "complete" && (
          <InfoRow
            label="Submitted"
            text={[record.submitted_by, record.submitted_on]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </View>
    </View>
  );
}

function InfoRow({
  label,
  text,
}: {
  label: string;
  text?: string | number | null;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoText}>{value(text)}</Text>
    </View>
  );
}

export default function AllOmniReturns({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const [status, setStatus] = useState<OmniReturnStatus>("pending");
  const [records, setRecords] = useState<OmniReturnRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [exportMessage, setExportMessage] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  const fetchPage = useCallback(
    async (
      nextStatus: OmniReturnStatus,
      nextPage: number,
      nextSearch: string,
    ) => {
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
    void fetchPage(status, 0, search);

    return () => {
      requestId.current += 1;
    };
  }, [fetchPage, search, status]);

  const submitSearch = useCallback(() => {
    const term = searchText.trim();
    if (term === search) {
      void fetchPage(status, 0, search);
    } else {
      setSearch(term);
    }
  }, [fetchPage, search, searchText, status]);

  const changePage = useCallback(
    (nextPage: number) => {
      if (!loading && nextPage >= 0 && nextPage * PAGE_SIZE < total) {
        void fetchPage(status, nextPage, search);
      }
    },
    [fetchPage, loading, search, status, total],
  );

  const changeStatus = useCallback(
    (nextStatus: OmniReturnStatus) => {
      if (nextStatus !== status) setStatus(nextStatus);
    },
    [status],
  );

  const exportCsv = useCallback(async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    setExportMessage(undefined);
    try {
      const { csv, filename } = await exportOmniReturns(status, search);
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
  }, [exporting, search, status, total]);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ReturnCard record={item} status={status} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Review return remarks for your assigned stores.
            </Text>
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
            </View>
            <AppButton
              title={exporting ? "Exporting…" : "Export CSV"}
              variant="outline"
              onPress={() => void exportCsv()}
              disabled={exporting || loading || total === 0}
              style={styles.exportButton}
            />
            {!!exportMessage && (
              <Text style={styles.exportMessage}>{exportMessage}</Text>
            )}
            {!loading && !error && (
              <Text style={styles.count}>
                {records.length === 0
                  ? "0 records"
                  : `${pageIndex * PAGE_SIZE + 1}–${pageIndex * PAGE_SIZE + records.length} of ${total} records`}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : error ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
                <AppButton
                  title="Try again"
                  onPress={() => void fetchPage(status, pageIndex, search)}
                  style={styles.retry}
                />
              </>
            ) : (
              <Text style={styles.emptyText}>
                No {status} Omni Return records found.
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          total > PAGE_SIZE ? (
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
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
  subtitle: { color: COLORS.textLight, fontSize: FONT_SIZE.sm, lineHeight: 20 },
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
  searchRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  searchInput: { flex: 1 },
  searchButton: { minHeight: 48, paddingHorizontal: SPACING.md },
  exportButton: { minHeight: 44, alignSelf: "flex-start" },
  exportMessage: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  count: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  orderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f5e9eb",
    alignItems: "center",
    justifyContent: "center",
  },
  orderHeading: { flex: 1, gap: 2 },
  orderId: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  storeName: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
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
  details: { gap: SPACING.sm },
  infoRow: { gap: 2 },
  infoLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  infoText: { color: COLORS.text, fontSize: FONT_SIZE.sm, lineHeight: 20 },
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
