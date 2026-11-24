import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import DynamicDataTable, {
  type DynamicColumn,
  type DynamicTableRow,
} from "@/components/table/DynamicAutoDataTable";
import { COLORS, SPACING } from "@/constants/theme";
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
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { reportTableValue } from "../../report/services/reportTableFormat";
import {
  fasciaRequest,
  type FasciaDetail,
  type FasciaInput,
  type FasciaPlan,
} from "../services/FasciaService";

const PAGE_SIZE = 20;

function displayTimestamp(value: string | null | undefined) {
  if (!value || value.startsWith("0000-00-00")) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour = "00", minute = "00"] = match;
  const monthName = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][Number(month) - 1];
  return `${day} ${monthName}, ${year.slice(-2)} ${String(Number(hour) % 12 || 12).padStart(2, "0")}:${minute} ${Number(hour) < 12 ? "am" : "pm"}`;
}
function StatusBadge({
  status,
  detail = false,
}: {
  status: string;
  detail?: boolean;
}) {
  const pending = String(status) === "1";
  return (
    <Text
      style={[
        styles.badge,
        { backgroundColor: pending ? "#dc3545" : "#198754" },
      ]}
    >
      {pending ? "Pending" : detail ? "Approved" : "Complete"}
    </Text>
  );
}

const labels: Record<keyof FasciaInput, string> = {
  division_group: "Division Group",
  division: "Division",
  section: "Section",
  department: "Department",
  season_flag: "Season Flag",
  floor: "Floor",
  fascia_plan: "Fascia Plan",
};
const detailFields = Object.keys(labels) as (keyof FasciaInput)[];
const numberPattern = /^[0-9]+(?:\.[0-9]+)?$/;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to process fascia plan.";

export default function FasciaPlanScreen() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [records, setRecords] = useState<FasciaPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableAreaHeight, setTableAreaHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"list" | "view">("list");
  const [plan, setPlan] = useState<FasciaPlan>();
  const [details, setDetails] = useState<FasciaDetail[]>([]);
  const [actual, setActual] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<"submit" | "discard" | null>(null);
  const backRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  useEffect(() => {
    setHeaderTitle(mode === "view" ? "Fascia Plan Details" : "Fascia Plan");
    return () => setHeaderTitle(null);
  }, [mode, setHeaderTitle]);
  const requestVersion = useRef(0);
  const mutationLock = useRef(false);

  const loadList = useCallback(async (nextPage = 1) => {
    const version = ++requestVersion.current;
    const nextOffset = (nextPage - 1) * PAGE_SIZE;
    setLoading(true);
    setError("");
    try {
      const result = await fasciaRequest<{
        records: FasciaPlan[];
        total: number;
      }>("view", undefined, {
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      if (version !== requestVersion.current) return;
      setRecords(result.records);
      setTotal(Number(result.total));
      setCurrentPage(nextPage);
    } catch (cause) {
      if (version === requestVersion.current) setError(message(cause));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadList();
    return () => {
      requestVersion.current++;
    };
  }, [loadList]);

  const returnToList = useCallback(() => {
    requestVersion.current++;
    setMode("list");
    setPlan(undefined);
    setDetails([]);
    setActual({});
    setError("");
    void loadList(1);
  }, [loadList]);
  const goBack = useCallback(() => {
    if (busy || loading) return;
    if (
      mode === "view" &&
      Object.values(actual).some((value) => value.trim())
    ) {
      setConfirm("discard");
      return;
    }
    if (mode === "view") {
      returnToList();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/area_manager/settings");
  }, [actual, busy, loading, mode, returnToList]);
  useEffect(() => {
    if (backRef) backRef.current = goBack;
    setBackVisible(true);
    return () => {
      if (backRef) backRef.current = null;
      setBackVisible(false);
    };
  }, [backRef, goBack, setBackVisible]);

  const openPlan = useCallback(
    async (id: string) => {
      if (loading || busy) return;
      const version = ++requestVersion.current;
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const result = await fasciaRequest<{
          plan: FasciaPlan;
          details: FasciaDetail[];
        }>("view", undefined, { id });
        if (version !== requestVersion.current) return;
        setPlan(result.plan);
        setDetails(result.details);
        setActual({});
        setMode("view");
      } catch (cause) {
        if (version === requestVersion.current) setError(message(cause));
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [busy, loading],
  );

  const listColumns = useMemo<DynamicColumn[]>(
    () => [
      { title: "#", dataIndex: "serial", minWidth: 30, align: "center" },
      {
        title: "Store",
        dataIndex: "store_name",
        minWidth: 48,
        render: (record) => (
          <Text
            style={[
              styles.tableText,
              // { maxWidth: Math.max(96, Math.min(200, windowWidth * 0.45)) },
            ]}
          >
            {String(record.store_name ?? "-")}
          </Text>
        ),
      },
      ...[
        ["Start Date", "start_date"],
        ["End Date", "end_date"],
        ["Created On", "created_on"],
      ].map(([title, dataIndex]) => ({
        title,
        dataIndex,
        minWidth: 52,
        render: (record: DynamicTableRow) => (
          <Text
            style={[
              styles.tableText,
              { maxWidth: Math.max(64, Math.min(112, windowWidth * 0.28)) },
            ]}
          >
            {String(record[dataIndex] ?? "-")}
          </Text>
        ),
      })),
      {
        title: "Status",
        dataIndex: "status",
        minWidth: 42,
        align: "center",
        render: (record) => (
          <StatusBadge status={String(record.status ?? "")} />
        ),
      },
      {
        title: "Action",
        dataIndex: "action",
        minWidth: 40,
        align: "center",
        searchable: false,
        render: (record) => (
          <AppButton
            title="View"
            style={styles.compactButton}
            textStyle={styles.compactButtonText}
            accessibilityLabel={`View fascia plan for ${String(record.store_name ?? "")}`}
            onPress={() => void openPlan(String(record.id))}
            disabled={loading || busy}
          />
        ),
      },
    ],
    [busy, loading, openPlan, windowWidth],
  );
  const detailColumns = useMemo<DynamicColumn[]>(
    () => [
      { title: "#", dataIndex: "serial", minWidth: 30, align: "center" },
      ...detailFields.map((key) => ({
        title: labels[key],
        dataIndex: key,
        minWidth: 40,
        render: (record: DynamicTableRow) => (
          <Text
            style={[
              styles.tableText,
              { maxWidth: Math.max(72, Math.min(160, windowWidth * 0.4)) },
            ]}
          >
            {String(record[key] ?? "-")}
          </Text>
        ),
      })),
      {
        title: "Actual Fascia",
        dataIndex: "actual_fascia",
        minWidth: 52,
        render: (record, index) => {
          const id = String(record.id ?? "");
          const status = String(record.status ?? "");
          if (status !== "1" || String(plan?.status) !== "1") {
            return (
              <Text style={styles.tableText}>
                {String(record.actual_fascia ?? "-")}
              </Text>
            );
          }
          return (
            <AppInput
              accessibilityLabel={`Actual Fascia row ${index + 1}`}
              placeholder="Actual"
              keyboardType="decimal-pad"
              value={actual[id] ?? String(record.actual_fascia ?? "")}
              maxLength={300}
              editable={!busy}
              style={styles.compactInput}
              onChangeText={(value) =>
                setActual((current) => ({
                  ...current,
                  [id]: value.replace(/[^0-9.]/g, ""),
                }))
              }
            />
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        minWidth: 42,
        align: "center",
        render: (record) => (
          <StatusBadge status={String(record.status ?? "")} detail />
        ),
      },
      {
        title: "Submitted By",
        dataIndex: "submitted_by",
        minWidth: 50,
        render: (record) => (
          <Text
            style={[
              styles.tableText,
              { maxWidth: Math.max(72, Math.min(160, windowWidth * 0.4)) },
            ]}
          >
            {String(record.submitted_by ?? "-")}
          </Text>
        ),
      },
      {
        title: "Submitted On",
        dataIndex: "submitted_on",
        minWidth: 55,
        render: (record) => (
          <Text
            style={[
              styles.tableText,
              { maxWidth: Math.max(72, Math.min(120, windowWidth * 0.3)) },
            ]}
          >
            {String(record.submitted_on ?? "-")}
          </Text>
        ),
      },
    ],
    [actual, busy, plan?.status, windowWidth],
  );
  const listTableData = useMemo<DynamicTableRow[]>(
    () =>
      records.map((item, index) => ({
        __rowKey: item.id,
        id: item.id,
        serial: (currentPage - 1) * PAGE_SIZE + index + 1,
        store_name: item.store_name || "-",
        start_date: reportTableValue("date", item.start_date),
        end_date: reportTableValue("date", item.end_date),
        created_on: reportTableValue("created_on", item.row_created_on),
        status: item.status,
      })),
    [currentPage, records],
  );
  const detailTableData = useMemo<DynamicTableRow[]>(
    () =>
      details.map((item, index) => {
        const row: DynamicTableRow = {
          __rowKey: item.id,
          id: item.id,
          serial: index + 1,
          actual_fascia: item.actual_fascia ?? "-",
          status: item.status,
          submitted_by: item.submitted_name || item.submited_by || "-",
          submitted_on: displayTimestamp(item.submited_on),
        };
        for (const key of detailFields) {
          const value = item[key];
          row[key] =
            value === null || value === undefined || value === ""
              ? "-"
              : String(value);
        }
        return row;
      }),
    [details],
  );
  async function submit() {
    if (!plan || mutationLock.current) return;
    const rows = details
      .filter((row) => String(row.status) === "1")
      .map((row) => ({
        id: row.id,
        actual_fascia: (actual[row.id] ?? row.actual_fascia ?? "").trim(),
      }))
      .filter((row) => row.actual_fascia !== "");
    if (
      !rows.length ||
      rows.some((row) => !numberPattern.test(row.actual_fascia))
    ) {
      setConfirm(null);
      setError("Fill at least one actual fascia with a nonnegative number.");
      return;
    }
    mutationLock.current = true;
    setBusy(true);
    setError("");
    setConfirm(null);
    try {
      await fasciaRequest("edit", { id: plan.id, details: rows });
      setNotice("Actual fascia submitted.");
      const result = await fasciaRequest<{
        plan: FasciaPlan;
        details: FasciaDetail[];
      }>("view", undefined, { id: plan.id });
      setPlan(result.plan);
      setDetails(result.details);
      setActual({});
    } catch (cause) {
      setError(message(cause));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  const pending = details.filter((row) => String(row.status) === "1");
  const filled = pending.filter(
    (row) => (actual[row.id] ?? row.actual_fascia ?? "").trim() !== "",
  ).length;
  const banner = (
    <>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </>
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {mode === "list" ? (
          <View style={styles.screen}>
            <View style={styles.detailHeader}>{banner}</View>
            <View
              style={styles.detailTable}
              onLayout={(event) =>
                setTableAreaHeight(event.nativeEvent.layout.height)
              }
            >
              <DynamicDataTable
                columns={listColumns}
                data={listTableData}
                height={Math.max(
                  120,
                  (tableAreaHeight || windowHeight - 200) - 62,
                )}
                refreshKey={`plans-${currentPage}`}
                compact
                showPagination
                serverSidePagination
                currentPage={currentPage}
                pageSize={PAGE_SIZE}
                totalRecords={total}
                loading={loading}
                onRefresh={() => {
                  if (!loading && !busy) void loadList(currentPage);
                }}
                onPageChange={(nextPage) => {
                  if (!loading && !busy && nextPage !== currentPage) {
                    void loadList(nextPage);
                  }
                }}
                emptyMessage="No fascia plans found."
              />
            </View>
          </View>
        ) : (
          <View style={styles.screen}>
            <View style={styles.detailHeader}>
              {banner}
              {loading || busy ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : null}
              <View style={styles.card}>
                <View style={styles.cardHeading}>
                  <Text style={styles.storeName}>{plan?.store_name}</Text>
                  <StatusBadge status={plan?.status ?? "1"} detail />
                </View>
                <View style={styles.fieldGrid}>
                  <View style={styles.field}>
                    <Text style={styles.infoLabel}>Start Date</Text>
                    <Text style={styles.infoValue}>{plan?.start_date}</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.infoLabel}>End Date</Text>
                    <Text style={styles.infoValue}>{plan?.end_date}</Text>
                  </View>
                </View>
                <Text style={styles.notice}>
                  {details.length} rows | {pending.length} pending
                </Text>
              </View>
            </View>
            <View
              style={styles.detailTable}
              onLayout={(event) =>
                setTableAreaHeight(event.nativeEvent.layout.height)
              }
            >
              <DynamicDataTable
                columns={detailColumns}
                data={detailTableData}
                height={Math.max(
                  120,
                  (tableAreaHeight || windowHeight - 320) - 8,
                )}
                compact
                loading={loading}
                emptyMessage="No detail rows found."
              />
            </View>
            {pending.length > 0 && String(plan?.status) === "1" ? (
              <View style={styles.submitBar}>
                <Text style={styles.summary}>
                  {filled} filled | {pending.length - filled} remaining
                </Text>
                <AppButton
                  title={busy ? "Submitting..." : "Submit All"}
                  style={styles.submitButton}
                  onPress={() => setConfirm("submit")}
                  disabled={busy || loading}
                />
              </View>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
      <Modal
        visible={confirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(null)}
      >
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <View accessible={false} style={styles.questionIcon}>
              <Text style={styles.questionMark}>?</Text>
            </View>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {confirm === "submit" ? "Are you sure?" : "Return to plans?"}
            </Text>
            <Text style={styles.dialogMessage}>
              {confirm === "submit"
                ? "Do you want to submit fascia data?"
                : "Unsaved entries will be discarded."}
            </Text>
            <View style={styles.dialogActions}>
              <AppButton
                title="Cancel"
                style={styles.cancelButton}
                onPress={() => setConfirm(null)}
              />
              <AppButton
                title={confirm === "submit" ? "Yes, Submit" : "Yes, Return"}
                style={styles.confirmButton}
                onPress={() => {
                  if (confirm === "discard") {
                    setConfirm(null);
                    returnToList();
                  } else if (confirm) void submit();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  error: { color: COLORS.danger },
  notice: { color: COLORS.textLight },
  cardHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  storeName: {
    flex: 1,
    minWidth: 150,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "600",
  },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  field: { flexGrow: 1, flexBasis: "46%", gap: 4, minWidth: 120 },
  infoLabel: { color: COLORS.textLight, fontSize: 12 },
  infoValue: { color: COLORS.text, fontSize: 14, lineHeight: 21 },
  detailHeader: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 4,
  },
  detailTable: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
  },
  badge: {
    alignSelf: "flex-start",
    color: COLORS.white,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  tableText: {
    // color: COLORS.text,
    // fontSize: 12,
    // lineHeight: 13,
    // flexShrink: 1,

    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
    flexShrink: 1,
    flexWrap: "wrap",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  compactButton: {
    minHeight: 24,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactButtonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  compactInput: {
    minHeight: 24,
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontSize: 11,
  },
  submitBar: {
    backgroundColor: "#faf0f1",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    gap: 4,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: { backgroundColor: "#CD5D67", borderColor: "#CD5D67" },
  summary: {
    color: COLORS.text,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 24,
    gap: SPACING.md,
    alignItems: "center",
  },
  questionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#c9dae1",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  questionMark: {
    color: "#87adbd",
    fontSize: 56,
    lineHeight: 66,
    fontWeight: "300",
  },
  dialogTitle: {
    color: "#545454",
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
  },
  dialogMessage: {
    color: "#545454",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  dialogActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: SPACING.sm,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#9FA6B2",
    borderColor: "#9FA6B2",
    minWidth: 100,
    borderRadius: 5,
  },
  confirmButton: {
    backgroundColor: "#91171f",
    borderColor: "#91171f",
    minWidth: 120,
    borderRadius: 5,
  },
});
