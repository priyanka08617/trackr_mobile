import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import { COLORS, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
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
import FasciaTable, { type FasciaColumn } from "./FasciaTable";
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
const planColumns: FasciaColumn[] = [
  { title: "#", width: 56 },
  { title: "Store", width: 220 },
  { title: "Start Date", width: 110 },
  { title: "End Date", width: 110 },
  { title: "Created On", width: 170 },
  { title: "Status", width: 120 },
  { title: "Action", width: 100 },
];
const detailFields = Object.keys(labels) as (keyof FasciaInput)[];
const detailColumns: FasciaColumn[] = [
  { title: "#", width: 56 },
  ...detailFields.map((key) => ({ title: labels[key], width: 140 })),
  { title: "Actual Fascia", width: 190 },
  { title: "Status", width: 120 },
  { title: "Submitted By", width: 180 },
  { title: "Submitted On", width: 190 },
];
const numberPattern = /^[0-9]+(?:\.[0-9]+)?$/;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to process fascia plan.";

export default function FasciaPlanScreen() {
  const [records, setRecords] = useState<FasciaPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
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

  const loadList = useCallback(async (nextOffset = 0) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const result = await fasciaRequest<{
        records: FasciaPlan[];
        total: number;
      }>("view", undefined, { limit: "20", offset: String(nextOffset) });
      if (version !== requestVersion.current) return;
      setRecords(result.records);
      setTotal(Number(result.total));
      setOffset(nextOffset);
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
    void loadList();
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
    else router.replace("/area_manager/fascia_plan");
  }, [actual, busy, loading, mode, returnToList]);
  useEffect(() => {
    if (backRef) backRef.current = goBack;
    setBackVisible(true);
    return () => {
      if (backRef) backRef.current = null;
      setBackVisible(false);
    };
  }, [backRef, goBack, setBackVisible]);

  async function openPlan(id: string) {
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
  }
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
      {loading || busy ? <ActivityIndicator color={COLORS.primary} /> : null}
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
            <View style={styles.detailHeader}>
              {banner}
              <Text style={styles.infoLabel}>
                Swipe left or right to view all columns
              </Text>
            </View>
            <View style={styles.detailTable}>
              <FasciaTable
                key={offset}
                columns={planColumns}
                rows={records}
                extraData={{ loading, busy }}
                refreshing={loading}
                onRefresh={() => {
                  if (!loading && !busy) void loadList(offset);
                }}
                empty={
                  loading ? "Loading fascia plans..." : "No fascia plans found."
                }
                renderCells={(item, index) => [
                  String(offset + index + 1),
                  item.store_name,
                  reportTableValue("date", item.start_date),
                  reportTableValue("date", item.end_date),
                  reportTableValue("created_on", item.row_created_on),
                  <StatusBadge key="status" status={item.status} />,
                  <AppButton
                    key="view"
                    title="View"
                    accessibilityLabel={`View fascia plan for ${item.store_name}`}
                    onPress={() => void openPlan(item.id)}
                    disabled={loading || busy}
                  />,
                ]}
              />
            </View>
            <View style={styles.planFooter}>
              <Text style={styles.notice}>
                Showing {total === 0 ? 0 : offset + 1} to{" "}
                {Math.min(offset + records.length, total)} of {total} plans
              </Text>
              <View style={styles.actions}>
                <AppButton
                  title="Previous"
                  variant="outline"
                  disabled={loading || offset === 0}
                  onPress={() => void loadList(Math.max(0, offset - 20))}
                />
                <AppButton
                  title="Next"
                  variant="outline"
                  disabled={loading || offset + records.length >= total}
                  onPress={() => void loadList(offset + 20)}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.screen}>
            <View style={styles.detailHeader}>
              {banner}
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
              <Text style={styles.infoLabel}>
                Swipe left or right to view all columns
              </Text>
            </View>
            <View style={styles.detailTable}>
              <FasciaTable
                columns={detailColumns}
                rows={details}
                extraData={{ actual, busy, plan }}
                empty="No detail rows found."
                renderCells={(item, index) => [
                  String(index + 1),
                  ...detailFields.map((key) => item[key] || "-"),
                  String(item.status) === "1" &&
                  String(plan?.status) === "1" ? (
                    <AppInput
                      key="actual"
                      accessibilityLabel={`Actual Fascia row ${index + 1}`}
                      placeholder="Enter Actual Fascia"
                      keyboardType="decimal-pad"
                      value={actual[item.id] ?? item.actual_fascia ?? ""}
                      maxLength={300}
                      editable={!busy}
                      onChangeText={(value) =>
                        setActual((current) => ({
                          ...current,
                          [item.id]: value.replace(/[^0-9.]/g, ""),
                        }))
                      }
                    />
                  ) : (
                    (item.actual_fascia ?? "-")
                  ),
                  <StatusBadge key="status" status={item.status} />,
                  item.submitted_name || item.submited_by || "-",
                  displayTimestamp(item.submited_on),
                ]}
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
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "600" },
  error: { color: COLORS.danger },
  notice: { color: COLORS.textLight },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  header: { gap: SPACING.md },
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
  stackedField: { gap: 4 },
  infoLabel: { color: COLORS.textLight, fontSize: 12 },
  infoValue: { color: COLORS.text, fontSize: 14, lineHeight: 21 },
  planFooter: { padding: SPACING.lg, gap: SPACING.md },
  detailHeader: { padding: SPACING.lg, gap: SPACING.md },
  detailTable: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  badge: {
    alignSelf: "flex-start",
    color: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  submitBar: {
    backgroundColor: "#faf0f1",
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: { backgroundColor: "#CD5D67", borderColor: "#CD5D67" },
  summary: {
    color: COLORS.text,
    fontSize: 12,
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
