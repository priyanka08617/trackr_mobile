import { AppButton } from "@/components/AppButton";
import { AppLoader } from "@/components/AppLoader";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import AreaIcon from "@/components/AreaIcon";
import DateField from "@/components/DateField";
import DynamicDataTable, {
  type DynamicColumn,
} from "@/components/table/DynamicAutoDataTable";
import { CARD, COLORS, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

type Tab = "new" | "unchecked" | "verified";
export default function WorkPlanScreen() {
  const { height } = useWindowDimensions();
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
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  useEffect(() => {
    setHeaderTitle("Work Plan/Travel Plan");
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);
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

  const tableData = records.map((plan, index) => ({
    id: plan.id,
    serial: (page - 1) * 20 + index + 1,
    date: reportTableValue("date", plan.date),
    zone: plan.zone || "All",
    region: plan.region || "All",
    plannedNames: plan.plannedNames || "-",
    actualNames: plan.actualNames || "-",
    actualDate: reportTableValue("date", plan.actualDate),
    status: plan.status === 2 ? "Verified" : "Unchecked",
  }));
  const getTablePlan = (id: unknown) =>
    records.find((plan) => plan.id === String(id));
  const compactCell = (value: unknown) => (
    <Text style={styles.tableCellText} numberOfLines={0}>
      {String(value ?? "-")}
    </Text>
  );
  const tableColumns: DynamicColumn[] = [
    ...(tab === "unchecked"
      ? [
          {
            title: "Select",
            dataIndex: "id",
            width: 52,
            align: "center" as const,
            searchable: false,
            render: (record: Record<string, unknown>) => {
              const plan = getTablePlan(record.id);
              if (!plan) return null;
              const isSelected = selected.includes(plan.id);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Select plan dated ${plan.date} for verification`}
                  accessibilityState={{ checked: isSelected, disabled: busy }}
                  disabled={busy}
                  hitSlop={{ top: 8, right: 6, bottom: 8, left: 6 }}
                  onPress={() =>
                    setSelected((current) =>
                      current.includes(plan.id)
                        ? current.filter((id) => id !== plan.id)
                        : [...current, plan.id],
                    )
                  }
                  style={[
                    styles.tableCheckButton,
                    isSelected && styles.checkSelected,
                  ]}
                >
                  <AreaIcon
                    name="check"
                    size={15}
                    color={isSelected ? COLORS.white : COLORS.textLight}
                  />
                </Pressable>
              );
            },
          },
        ]
      : []),
    {
      title: "#",
      dataIndex: "serial",
      // width: 48,
      align: "center",
      searchable: false,
      render: (record) => compactCell(record.serial),
    },
    {
      title: "Plan Date",
      dataIndex: "date",
      // width: 105,
      render: (record) => compactCell(record.date),
    },
    {
      title: "Zone",
      dataIndex: "zone",
      // width: 90,
      render: (record) => compactCell(record.zone),
    },
    {
      title: "Region",
      dataIndex: "region",
      // width: 100,
      render: (record) => compactCell(record.region),
    },
    {
      title: "Planned Visit Location",
      dataIndex: "plannedNames",
      render: (record) => compactCell(record.plannedNames),
    },
    {
      title: "Actual Visit Location",
      dataIndex: "actualNames",
      render: (record) => compactCell(record.actualNames),
    },
    {
      title: "Actual Visit Date",
      dataIndex: "actualDate",
      render: (record) => compactCell(record.actualDate),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (record) => {
        const plan = getTablePlan(record.id);
        if (!plan) return compactCell(record.status);
        return (
          <Text
            style={[
              styles.tableStatus,
              {
                color: plan.status === 2 ? COLORS.success : COLORS.primary,
                backgroundColor: plan.status === 2 ? "#E4F3E8" : "#FFF0B3",
              },
            ]}
          >
            {record.status === "Verified" ? "Verified" : "Unchecked"}
          </Text>
        );
      },
    },
    ...(tab === "unchecked"
      ? [
          {
            title: "Actions",
            dataIndex: "id",
            searchable: false,
            render: (record: Record<string, unknown>) => {
              const plan = getTablePlan(record.id);
              if (!plan) return "-";
              return (
                <View style={styles.tableRowActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit plan dated ${plan.date}`}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    hitSlop={{ top: 8, right: 2, bottom: 8, left: 2 }}
                    onPress={() => setEditor({ plan, actual: false })}
                    style={[styles.tableEditButton, busy && styles.disabled]}
                  >
                    <AreaIcon name="edit" size={14} />
                    <Text style={styles.tableActionText}>Edit</Text>
                  </Pressable>
                  <AppButton
                    title="Update"
                    accessibilityLabel={`Update actual visit for plan dated ${plan.date}`}
                    style={styles.tableUpdateButton}
                    textStyle={styles.tableUpdateButtonText}
                    disabled={busy}
                    onPress={() => setEditor({ plan, actual: true })}
                  />
                </View>
              );
            },
          },
        ]
      : []),
  ];
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={[styles.section, styles.listHeader]}>
        {tabs}
        {tab === "verified" && (
          <View style={styles.filterCard}>
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
                title="Clear"
                variant="outline"
                style={styles.compactHeaderButton}
                textStyle={styles.compactHeaderButtonText}
                disabled={busy || loading}
                onPress={() => {
                  resetDates();
                  setPage(1);
                  reload();
                }}
              />
              <AppButton
                title="Apply Filters"
                style={styles.compactHeaderButton}
                textStyle={styles.compactHeaderButtonText}
                onPress={applyFilters}
                disabled={busy || loading}
              />
            </View>
          </View>
        )}
        {error && (
          <>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <AppButton
              title="Retry"
              style={styles.compactHeaderButton}
              textStyle={styles.compactHeaderButtonText}
              onPress={reload}
            />
          </>
        )}
        {tab === "verified" && (
          <View style={styles.actions}>
            {/* <AppButton
              title="Refresh"
              variant="outline"
              style={styles.compactHeaderButton}
              textStyle={styles.compactHeaderButtonText}
              disabled={busy || loading}
              onPress={reload}
            /> */}
          </View>
        )}
        {tab === "unchecked" && (
          <View style={styles.actions}>
            {records.length > 0 && !loading && !error && (
              <>
                <AppButton
                  title={
                    records.length > 0 &&
                    records.every((plan) => selected.includes(plan.id))
                      ? "Deselect All"
                      : "Select Page"
                  }
                  variant="outline"
                  style={styles.compactHeaderButton}
                  textStyle={styles.compactHeaderButtonText}
                  disabled={busy || loading}
                  onPress={() => {
                    const allSelected = records.every((plan) =>
                      selected.includes(plan.id),
                    );
                    setSelected(
                      allSelected ? [] : records.map((plan) => plan.id),
                    );
                  }}
                />
                <AppButton
                  title={`Verify Selected (${selected.length})`}
                  style={styles.compactHeaderButton}
                  textStyle={styles.compactHeaderButtonText}
                  disabled={!selected.length || busy}
                  onPress={() => setConfirm(true)}
                />
              </>
            )}
            {/* <AppButton
              title="Refresh"
              variant="outline"
              style={styles.compactHeaderButton}
              textStyle={styles.compactHeaderButtonText}
              disabled={busy || loading}
              onPress={reload}
            /> */}
          </View>
        )}
      </View>
      {loading && <AppLoader message="Loading work plans..." />}
      <View style={styles.tableContainer}>
        <DynamicDataTable
          columns={tableColumns}
          data={loading || error ? [] : tableData}
          // height={Math.max(240, Math.min(560, height - 250))}
          height={Math.max(180, height - (tab === "verified" ? 350 : 250))}
          refreshKey={`${tab}-${page}-${refresh}`}
          showPagination
          serverSidePagination
          currentPage={page}
          totalRecords={total}
          pageSize={20}
          loading={loading}
          emptyMessage={loading || error ? "" : `No ${tab} plans found.`}
          onPageChange={(nextPage) => {
            if (nextPage === page || loading || busy) return;
            setPage(nextPage);
            setSelected([]);
            setLoading(true);
          }}
        />
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
  screen: { minHeight: 0, flex: 1, backgroundColor: COLORS.surface },
  listHeader: { padding: 0 },
  tableContainer: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    // overflow: "hidden",
  },
  // gap: SPACING.md
  section: { gap: SPACING.sm },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: COLORS.primary, backgroundColor: "#f5e9ea" },
  tabLabel: { fontSize: 14, color: COLORS.textLight, textAlign: "center" },
  activeTabLabel: { color: COLORS.primary, fontWeight: "700" },
  filterCard: {
    ...CARD,
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: 5,
    marginTop: -3,
  },
  heading: { fontSize: 18, color: COLORS.primary, fontWeight: "600" },
  text: { color: COLORS.text, lineHeight: 22 },
  error: { color: COLORS.danger },
  empty: { color: COLORS.textLight, padding: 24, textAlign: "center" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    margin: 5,
  },
  compactHeaderButton: {
    minHeight: 30,
    paddingVertical: 2,
    paddingHorizontal: 8,
    flexGrow: 0,
  },
  compactHeaderButtonText: { fontSize: 11, lineHeight: 15 },
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
  tableCheckButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    marginVertical: -5,
  },
  tableCellText: {
    // color: COLORS.text,
    // fontSize: 11,
    // lineHeight: 15,
    // includeFontPadding: false,
    // marginVertical: -5,

    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
    flexShrink: 1,
    flexWrap: "wrap",
    includeFontPadding: false,
    marginVertical: 0,
  },
  tableStatus: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    includeFontPadding: false,
    marginVertical: -5,
  },
  tableRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginVertical: -5,
  },
  tableEditButton: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
  },
  tableActionText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  tableUpdateButton: {
    minHeight: 27,
    paddingHorizontal: 6,
  },
  tableUpdateButtonText: { fontSize: 10 },
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
