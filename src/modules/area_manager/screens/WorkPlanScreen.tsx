import { AppButton } from "@/components/AppButton";
import { AppLoader } from "@/components/AppLoader";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import AreaIcon from "@/components/AreaIcon";
import { CARD, COLORS, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateField from "../../report/screens/DateField";
import { reportTableValue } from "../../report/services/reportTableFormat";
import {
  listPlans,
  planRequest,
  today,
  validDate,
  type Plan,
} from "../../report/services/service";
import ChecklistDialog, { type ChecklistNotice } from "./ChecklistDialog";
import PlanForm from "./PlanForm";
import DataTable, { type WorkPlanColumn } from "./WorkPlanTable";

type Tab = "new" | "unchecked" | "verified";
export default function WorkPlanScreen() {
  const [tab, setTab] = useState<Tab>("new");
  const [editor, setEditor] = useState<{ plan: Plan; actual: boolean }>();
  const [formDirty, setFormDirty] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab>();
  const [records, setRecords] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [initialDate] = useState(today);
  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);
  const [filters, setFilters] = useState({
    from: initialDate,
    to: initialDate,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState<ChecklistNotice>();
  const [pendingBack, setPendingBack] = useState(false);
  const headerBackRef = useContext(AreaHeaderBackContext);
  const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);
  const leavePage = useCallback(() => {
    setPendingBack(false);
    setFormDirty(false);
    if (editor) setEditor(undefined);
    else if (router.canGoBack()) router.back();
    else router.replace("/area_manager/settings");
  }, [editor]);
  const goBack = useCallback(() => {
    if (busy || formBusy) return;
    if ((editor || tab === "new") && formDirty) setPendingBack(true);
    else leavePage();
  }, [busy, editor, formBusy, formDirty, leavePage, tab]);
  useEffect(() => {
    if (headerBackRef) headerBackRef.current = goBack;
    setHeaderBackVisible(true);
    return () => {
      if (headerBackRef) headerBackRef.current = null;
      setHeaderBackVisible(false);
    };
  }, [goBack, headerBackRef, setHeaderBackVisible]);

  useEffect(() => {
    if (tab === "new") return;
    let cancelled = false;
    listPlans(
      tab === "verified" ? 2 : 1,
      page,
      tab === "verified" ? filters.from : "",
      tab === "verified" ? filters.to : "",
    )
      .then((result) => {
        if (cancelled) return;
        setRecords(result.records);
        setTotal(result.total);
        setError(undefined);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Unable to load plans.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page, filters, refresh]);

  function switchTab(next: Tab, discard = false) {
    if (next === tab) return;
    if (tab === "new" && formDirty && !discard) {
      setPendingTab(next);
      return;
    }
    setFormDirty(false);
    setPendingTab(undefined);
    setTab(next);
    setPage(1);
    setSelected([]);
    setRecords([]);
    setError(undefined);
    setLoading(next !== "new");
  }
  function resetDates() {
    const date = today();
    setFrom(date);
    setTo(date);
    setFilters({ from: date, to: date });
  }
  function reload() {
    setLoading(true);
    setError(undefined);
    setSelected([]);
    setRefresh((value) => value + 1);
  }
  function applyFilters() {
    if (
      (from && !validDate(from)) ||
      (to && !validDate(to)) ||
      (from && to && from > to)
    ) {
      setError(
        "Enter valid YYYY-MM-DD dates with From Date before or equal to To Date.",
      );
      return;
    }
    setPage(1);
    setSelected([]);
    setLoading(true);
    setError(undefined);
    setFilters({ from, to });
  }
  async function verify() {
    if (inFlight.current || !selected.length) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await planRequest<{ message: string }>("verify", {
        allowed_ids: selected,
      });
      setConfirm(false);
      setNotice({
        kind: "success",
        title: "Verified",
        message: result.message || "Verification completed successfully.",
      });
      reload();
    } catch (cause) {
      setConfirm(false);
      setNotice({
        kind: "error",
        title: "Verification failed",
        message: cause instanceof Error ? cause.message : "Please retry.",
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const tabs = (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {(
        [
          ["new", "New"],
          ["unchecked", "Unchecked"],
          ["verified", "Verified"],
        ] as const
      ).map(([value, label]) => (
        <Pressable
          key={value}
          accessibilityRole="tab"
          accessibilityState={{
            selected: tab === value,
            disabled: busy || formBusy,
          }}
          onPress={() => switchTab(value)}
          disabled={busy || formBusy}
          style={[styles.tab, tab === value && styles.activeTab]}
        >
          <Text
            style={[styles.tabLabel, tab === value && styles.activeTabLabel]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (editor || tab === "new")
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!editor && tabs}
          <PlanForm
            key={editor ? `${editor.plan.id}-${editor.actual}` : "new"}
            plan={editor?.plan}
            actual={editor?.actual}
            onDirtyChange={setFormDirty}
            onBusyChange={setFormBusy}
            onDone={() => {
              setEditor(undefined);
              setFormDirty(false);
              setTab("unchecked");
              setPage(1);
              resetDates();
              reload();
            }}
            onCancel={() => {
              if (editor) setEditor(undefined);
              else switchTab("unchecked", true);
            }}
          />
        </ScrollView>
        <ChecklistDialog
          visible={pendingBack || Boolean(pendingTab)}
          title="Discard changes?"
          message="Your unsaved work plan will be lost."
          confirmText="Yes, Discard"
          onConfirm={() => {
            if (pendingBack) leavePage();
            else if (pendingTab) switchTab(pendingTab, true);
          }}
          onCancel={() => {
            setPendingBack(false);
            setPendingTab(undefined);
          }}
        />
      </SafeAreaView>
    );

  const pages = Math.max(1, Math.ceil(total / 20));
  const columns: WorkPlanColumn[] = [
    ...(tab === "unchecked" ? [{ title: "Select", width: 70 }] : []),
    { title: "#", width: 56 },
    { title: "Plan Date", width: 140 },
    { title: "Zone", width: 140 },
    { title: "Region", width: 140 },
    // { title: "Area Manager", width: 180 },
    { title: "Planned Visit Location", width: 240 },
    { title: "Actual Visit Location", width: 240 },
    { title: "Actual Visit Date", width: 140 },
    { title: "Status", width: 120 },
    ...(tab === "unchecked" ? [{ title: "Actions", width: 210 }] : []),
  ];
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={[styles.section, styles.listHeader]}>
        {tabs}
        {tab === "verified" && (
          <View style={styles.card}>
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <DateField
                  compact
                  label="From Date"
                  value={from}
                  onChange={setFrom}
                  disabled={busy || loading}
                />
              </View>
              <View style={styles.dateColumn}>
                <DateField
                  compact
                  label="To Date"
                  value={to}
                  onChange={setTo}
                  disabled={busy || loading}
                />
              </View>
            </View>
            <View style={styles.actions}>
              <AppButton
                title="Apply Filters"
                onPress={applyFilters}
                disabled={busy || loading}
              />
              <AppButton
                title="Clear"
                variant="outline"
                disabled={busy || loading}
                onPress={() => {
                  resetDates();
                  setPage(1);
                  reload();
                }}
              />
            </View>
          </View>
        )}
        {error && (
          <>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <AppButton title="Retry" onPress={reload} />
          </>
        )}
        {tab === "unchecked" && records.length > 0 && !loading && !error && (
          <View style={styles.actions}>
            <AppButton
              title={
                selected.length === records.length
                  ? "Deselect All"
                  : "Select Page"
              }
              variant="outline"
              disabled={busy}
              onPress={() =>
                setSelected(
                  selected.length === records.length
                    ? []
                    : records.map((plan) => plan.id),
                )
              }
            />
            <AppButton
              title={`Verify Selected (${selected.length})`}
              disabled={!selected.length || busy}
              onPress={() => setConfirm(true)}
            />
          </View>
        )}
        <Text style={styles.tableHint}>
          Swipe left or right to view all columns
        </Text>
      </View>
      {loading && <AppLoader message="Loading work plans..." />}
      <View style={styles.tableContainer}>
        <DataTable
          key={`${tab}-${page}`}
          columns={columns}
          rows={loading || error ? [] : records}
          extraData={{ selected, busy }}
          refreshing={loading}
          onRefresh={() => {
            if (!loading && !busy) reload();
          }}
          empty={loading || error ? "" : `No ${tab} plans found.`}
          renderCells={(item, index) => [
            ...(tab === "unchecked"
              ? [
                  <Pressable
                    key="select"
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Select plan dated ${item.date} for verification`}
                    accessibilityState={{
                      checked: selected.includes(item.id),
                      disabled: busy,
                    }}
                    disabled={busy}
                    onPress={() =>
                      setSelected((current) =>
                        current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id],
                      )
                    }
                    style={[
                      styles.checkButton,
                      selected.includes(item.id) && styles.checkSelected,
                    ]}
                  >
                    <AreaIcon
                      name="check"
                      size={24}
                      color={
                        selected.includes(item.id)
                          ? COLORS.white
                          : COLORS.textLight
                      }
                    />
                  </Pressable>,
                ]
              : []),
            String((page - 1) * 20 + index + 1),
            reportTableValue("date", item.date),
            item.zone || "All",
            item.region || "All",
            // item.manager || "-",
            item.plannedNames || "-",
            item.actualNames || "-",
            reportTableValue("date", item.actualDate),
            <Text
              key="status"
              style={[
                styles.text,
                { color: item.status === 2 ? COLORS.success : COLORS.primary },
              ]}
            >
              {item.status === 2 ? "Verified" : "Unchecked"}
            </Text>,
            ...(tab === "unchecked"
              ? [
                  <View key="actions" style={styles.rowActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit plan dated ${item.date}`}
                      disabled={busy}
                      onPress={() => setEditor({ plan: item, actual: false })}
                      style={[styles.editButton, busy && styles.disabled]}
                    >
                      <AreaIcon name="edit" size={18} />
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                    <AppButton
                      title="Update"
                      accessibilityLabel={`Update actual visit for plan dated ${item.date}`}
                      style={styles.updateButton}
                      disabled={busy}
                      onPress={() => setEditor({ plan: item, actual: true })}
                    />
                  </View>,
                ]
              : []),
          ]}
        />
      </View>
      <View style={[styles.section, styles.listFooter]}>
        <Text style={styles.text}>
          Page {page} of {pages} | {total} records
        </Text>
        <View style={styles.actions}>
          <AppButton
            title="Previous"
            variant="outline"
            disabled={page <= 1 || loading || busy}
            onPress={() => {
              setPage((value) => value - 1);
              setSelected([]);
              setLoading(true);
            }}
          />
          <AppButton
            title="Next"
            variant="outline"
            disabled={page >= pages || loading || busy}
            onPress={() => {
              setPage((value) => value + 1);
              setSelected([]);
              setLoading(true);
            }}
          />
        </View>
      </View>
      <ChecklistDialog
        visible={confirm || Boolean(notice)}
        busy={busy}
        kind={notice?.kind ?? "warning"}
        title={notice?.title ?? "Are you sure?"}
        message={
          notice?.message ??
          `Do you want to verify ${selected.length} selected record(s)? Verified records cannot be edited.`
        }
        confirmText={notice ? "OK" : "Yes, proceed"}
        onConfirm={() => (notice ? setNotice(undefined) : void verify())}
        onCancel={notice ? undefined : () => setConfirm(false)}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 20, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  listHeader: { padding: SPACING.md },
  listFooter: { padding: SPACING.md },
  tableHint: { color: COLORS.textLight, fontSize: 12 },
  tableContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  section: { gap: SPACING.md },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: COLORS.primary, backgroundColor: "#f5e9ea" },
  tabLabel: { fontSize: 14, color: COLORS.textLight, textAlign: "center" },
  activeTabLabel: { color: COLORS.primary, fontWeight: "700" },
  card: {
    ...CARD,
    gap: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { fontSize: 18, color: COLORS.primary, fontWeight: "600" },
  text: { color: COLORS.text, lineHeight: 22 },
  error: { color: COLORS.danger },
  empty: { color: COLORS.textLight, padding: 24, textAlign: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  dateRow: { flexDirection: "row", gap: SPACING.sm },
  dateColumn: { flex: 1, minWidth: 0 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  cardDate: { flex: 1 },
  checkButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  checkSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectedCard: { borderColor: COLORS.primary },
  verifiedIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rowActions: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  editButton: {
    minHeight: 44,
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
  },
  editText: { color: COLORS.primary, fontWeight: "600" },
  updateButton: { flexGrow: 1, minHeight: 44 },
  disabled: { opacity: 0.5 },
});
