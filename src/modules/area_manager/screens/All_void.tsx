import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import DateField from "@/components/DateField";
import SelectField from "@/components/SelectField";
import DynamicAutoDataTable, {
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
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { today, validDate } from "../../report/services/service";
import { trackerPlainText } from "../../report/services/trackerText";
import {
  approveVoidRecords,
  loadVoidOptions,
  loadVoidRecords,
  type VoidFilters,
  type VoidModule,
  type VoidRecord,
} from "../services/All_void_service";
import ChecklistDialog from "./ChecklistDialog";

const PAGE_SIZE = 20; // Matches existing All_void_service API pagination.

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to load void records.";

const display = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  String(value).startsWith("0000-00-00")
    ? "-"
    : trackerPlainText(value);

export default function VoidScreen() {
  const [modules, setModules] = useState<VoidModule[]>([]);
  const [category, setCategory] = useState(1);
  const [filters, setFilters] = useState<VoidFilters>();
  const [records, setRecords] = useState<VoidRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [confirm, setConfirm] = useState<string[]>();
  const [notice, setNotice] = useState<string>();
  const lock = useRef(false);
  const backRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setTitle = useContext(AreaHeaderTitleContext);

  const [previousRequest, setPreviousRequest] = useState({ filters, refresh });
  if (previousRequest.filters !== filters || previousRequest.refresh !== refresh) {
    setPreviousRequest({ filters, refresh });
    setLoading(true);
    setError(undefined);
    setSelected([]);
    setRecords([]);
  }

  useEffect(() => {
    let active = true;

    const task = filters
      ? loadVoidRecords(filters).then((result) => {
          if (!active) return;
          setRecords(result.records);
          setTotal(result.total);
        })
      : loadVoidOptions().then((result) => {
          if (active) setModules(result.modules);
        });

    task
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, refresh]);

  const goBack = useCallback(() => {
    if (lock.current) return;
    if (filters) {
      setFilters(undefined);
      setSearch("");
    } else if (router.canGoBack()) router.back();
    else router.replace("/area_manager/settings");
  }, [filters]);

  useEffect(() => {
    if (backRef) backRef.current = goBack;
    setBackVisible(true);
    setTitle(
      filters
        ? (modules.find((module) => module.table === filters.table)?.name ??
            "Void Requests")
        : "All Void List",
    );
    return () => {
      if (backRef?.current === goBack) backRef.current = null;
      setBackVisible(false);
      setTitle(null);
    };
  }, [backRef, filters, goBack, modules, setBackVisible, setTitle]);

  function open(module: VoidModule, status: "pending" | "voided") {
    setSearch("");
    setFrom(today());
    setTo(today());
    setFilters({
      table: module.table,
      status, // Pending for Pending card; Voided for Void card.
      from: today(),
      to: today(),
      search: "",
      page: 1,
    });
  }

  async function approve() {
    if (!filters || !confirm?.length || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await approveVoidRecords(filters.table, confirm);
      setNotice(result.message);
      setConfirm(undefined);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setConfirm(undefined);
      setError(errorMessage(cause));
      setRecords([]);
      setSelected([]);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const banner = (
    <View style={styles.stack}>
      {error && (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <AppButton
            title="Retry"
            variant="outline"
            disabled={loading || busy}
            onPress={() => setRefresh((value) => value + 1)}
          />
        </>
      )}
      {loading && <ActivityIndicator color={COLORS.primary} />}
    </View>
  );

  const categoryModules = modules.filter(
    (module) => Number(module.category) === category,
  );

  // Dynamic columns depend on the fields supplied by the current API page.
  const dynamicFieldLabels = useMemo(
    () => [
      ...new Set(
        records.flatMap((record) => record.fields.map((field) => field.label)),
      ),
    ],
    [records],
  );

  const tableData: DynamicTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        __rowKey: record.id,
      })),
    [records],
  );

  const isPending = filters?.status === "pending";
  const allSelected =
    records.length > 0 &&
    records.every((record) => selected.includes(record.id));

  const columns = useMemo<DynamicColumn[]>(() => {
    const cell = (value: unknown) => (
      <Text style={styles.cellText}>{display(value)}</Text>
    );
    const paired = (first: unknown, second: unknown) => (
      <View style={styles.pairedCell}>
        <Text style={styles.cellText}>{display(first)}</Text>
        <Text style={styles.subText}>{display(second)}</Text>
      </View>
    );

    const result: DynamicColumn[] = [];

    if (isPending) {
      result.push({
        title: "Select",
        dataIndex: "__select",
        width: 76,
        fixed: "left",
        searchable: false,
        render: (row) => {
          const item = row as unknown as VoidRecord;
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Select void request for ${display(item.store_name)}`}
              accessibilityState={{
                checked: selected.includes(item.id),
                disabled: busy || loading,
              }}
              disabled={busy || loading}
              onPress={() =>
                setSelected((current) =>
                  current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id],
                )
              }
              style={styles.checkbox}
            >
              <Text style={styles.checkText}>
                {selected.includes(item.id) ? "☑" : "☐"}
              </Text>
            </Pressable>
          );
        },
      });
    }

    result.push(
      {
        title: "#",
        dataIndex: "__serial",
        // width: 65,
        searchable: false,
        render: (_row, index) =>
          cell(((filters?.page ?? 1) - 1) * PAGE_SIZE + index + 1),
      },
      {
        title: "Store",
        dataIndex: "store_name",
        // width: 170,
        render: (row) => cell(row.store_name),
      },
      {
        title: "Region / Zone",
        dataIndex: "region",
        // width: 170,
        render: (row) => paired(row.region, row.zone),
      },
      {
        title: "Requested By / On",
        dataIndex: "requested_by",
        // width: 175,
        render: (row) => paired(row.requested_by, row.requested_on),
      },
      {
        title: "Void Reason / Remark",
        dataIndex: "reason",
        // width: 230,
        render: (row) => paired(row.reason, row.remark),
      },
    );

    if (!isPending) {
      result.push({
        title: "Approved By / On",
        dataIndex: "approved_by",
        // width: 175,
        render: (row) => paired(row.approved_by, row.approved_on),
      });
    }

    for (const label of dynamicFieldLabels) {
      result.push({
        title: label,
        dataIndex: `__field_${label}`,
        // width: 160,
        searchable: false,
        render: (row) => {
          const item = row as unknown as VoidRecord;
          return cell(
            item.fields.find((field) => field.label === label)?.value,
          );
        },
      });
    }

    if (records.some((record) => record.product_count > 0)) {
      result.push({
        title: "Exchange Products",
        dataIndex: "product_count",
        // width: 150,
        render: (row) => cell(row.product_count ?? 0),
      });
    }

    result.push({
      title: "Status",
      dataIndex: "__status",
      // width: 120,
      searchable: false,
      render: () => (
        <Text
          style={[
            styles.statusText,
            { color: isPending ? COLORS.danger : COLORS.success },
          ]}
        >
          {isPending ? "Pending" : "Voided"}
        </Text>
      ),
    });

    return result;
  }, [
    busy,
    dynamicFieldLabels,
    filters?.page,
    isPending,
    loading,
    records,
    selected,
  ]);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      {!filters ? (
        <FlatList
          data={categoryModules}
          keyExtractor={(item) => item.table}
          numColumns={2}
          columnWrapperStyle={styles.moduleRow}
          contentContainerStyle={styles.content}
          refreshing={loading}
          onRefresh={() => {
            if (!busy) setRefresh((value) => value + 1);
          }}
          ListHeaderComponent={
            <View style={styles.stack}>
              <View style={styles.navTabs}>
                {[
                  { id: 1, title: "All Register" },
                  { id: 2, title: "All Tracker" },
                ].map((tab) => (
                  <Pressable
                    key={tab.id}
                    onPress={() => setCategory(tab.id)}
                    style={[
                      styles.navTab,
                      category === tab.id && styles.activeNavTab,
                    ]}
                  >
                    <Text
                      style={[
                        styles.navTabText,
                        category === tab.id && styles.activeNavTabText,
                      ]}
                    >
                      {tab.title}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Total Pending</Text>
                  <Text
                    style={[styles.summaryNumber, { color: COLORS.danger }]}
                  >
                    {categoryModules.reduce(
                      (sum, item) => sum + Number(item.pending || 0),
                      0,
                    )}
                  </Text>
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Total Void</Text>
                  <Text
                    style={[styles.summaryNumber, { color: COLORS.success }]}
                  >
                    {categoryModules.reduce(
                      (sum, item) => sum + Number(item.voided || 0),
                      0,
                    )}
                  </Text>
                </View>
              </View>
              {banner}
            </View>
          }
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.label}>
                No supported void registers found.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.moduleCard}>
              <View style={styles.moduleTop}>
                <View style={styles.moduleCounts}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.pending} pending requests for ${display(item.name)}`}
                    disabled={loading || busy}
                    style={({ pressed }) => [
                      styles.moduleCount,
                      pressed && styles.moduleCountPressed,
                    ]}
                    onPress={() => open(item, "pending")}
                  >
                    <View style={styles.countCircle}>
                      <Text style={styles.countText}>{item.pending}</Text>
                    </View>
                    <Text style={styles.countLabel}>Pending</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.voided} voided requests for ${display(item.name)}`}
                    disabled={loading || busy}
                    style={({ pressed }) => [
                      styles.moduleCount,
                      pressed && styles.moduleCountPressed,
                    ]}
                    onPress={() => open(item, "voided")}
                  >
                    <View style={styles.countCircle}>
                      <Text style={styles.countText}>{item.voided}</Text>
                    </View>
                    <Text style={styles.countLabel}>Void</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.moduleBottom}>
                <Text style={styles.moduleTitle}>{display(item.name)}</Text>
              </View>
            </View>
          )}
        />
      ) : (
        <ScrollView
          style={styles.detailsScroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stack}>
            <View style={styles.row}>
              <View style={styles.column}>
                <SelectField
                  label={category === 1 ? "Register" : "Tracker"}
                  value={filters.table}
                  options={categoryModules.map((module) => ({
                    value: module.table,
                    label: display(module.name),
                  }))}
                  disabled={loading || busy}
                  onChange={(table) =>
                    setFilters((current) =>
                      current
                        ? { ...current, table, status: "pending", page: 1 }
                        : current,
                    )
                  }
                />
              </View>
              <View style={styles.column}>
                <SelectField
                  label="Status"
                  value={filters.status}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "voided", label: "Voided" },
                  ]}
                  disabled={loading || busy}
                  onChange={(status) =>
                    setFilters((current) =>
                      current
                        ? {
                            ...current,
                            status: status as "pending" | "voided",
                            page: 1,
                          }
                        : current,
                    )
                  }
                />
              </View>
            </View>

            {filters.status === "voided" && (
              <View style={styles.row}>
                <View style={styles.column}>
                  <DateField
                    maxDate={today()}
                    compact
                    label="From Date"
                    value={from}
                    onChange={(value) => {
                      setFrom(value);
                      if (validDate(value)) setTo(value);
                    }}
                    disabled={busy || loading}
                  />
                </View>
                <View style={styles.column}>
                  <DateField
                    maxDate={today()}
                    compact
                    label="To Date"
                    value={to}
                    minDate={from}
                    onChange={setTo}
                    disabled={busy || loading}
                  />
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.column}>
                <AppInput
                  accessibilityLabel="Search void records"
                  placeholder="Search store, region or zone"
                  value={search}
                  maxLength={150}
                  editable={!busy}
                  onChangeText={setSearch}
                  style={{ height: 40 }}
                />
              </View>
              <View style={styles.column}>
                <AppButton
                  title="Apply Filters"
                  disabled={loading || busy}
                  onPress={() =>
                    setFilters((current) =>
                      current
                        ? {
                            ...current,
                            search: search.trim(),
                            from,
                            to,
                            page: 1,
                          }
                        : current,
                    )
                  }
                />
              </View>
            </View>
            <View style={styles.hr} />
            {banner}
            {/* <Text style={styles.label}>{total} records</Text> */}

            {isPending && records.length > 0 && (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Select all records on this page"
                accessibilityState={{
                  checked: allSelected,
                  disabled: busy || loading,
                }}
                disabled={busy || loading}
                style={styles.selectAll}
                onPress={() =>
                  setSelected(
                    allSelected ? [] : records.map((record) => record.id),
                  )
                }
              >
                <Text style={styles.checkText}>{allSelected ? "☑" : "☐"}</Text>
                <Text style={styles.selectAllText}>
                  Select all on this page
                </Text>
              </Pressable>
            )}

            <DynamicAutoDataTable
              columns={columns}
              data={tableData}
              height={420}
              refreshKey={`${filters.table}:${filters.status}:${filters.page}:${refresh}`}
              loading={loading}
              showSearch={false} // API search above searches all matching records.
              showColumnFilter={false}
              showPagination
              serverSidePagination
              currentPage={filters.page}
              totalRecords={total}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => {
                if (loading || busy) return;
                setFilters((current) =>
                  current ? { ...current, page } : current,
                );
              }}
              emptyMessage={
                loading
                  ? "Loading records..."
                  : "No matching void records found."
              }
            />
          </View>
        </ScrollView>
      )}

      {filters?.status === "pending" && selected.length > 0 && (
        <View style={styles.footer}>
          <AppButton
            title={`Approve ${selected.length} Void Request${selected.length === 1 ? "" : "s"}`}
            disabled={busy || loading}
            onPress={() => setConfirm([...selected])}
          />
        </View>
      )}

      <ChecklistDialog
        visible={Boolean(confirm)}
        title="Do you want to Approve these void request(s)?"
        message={` Once approved, the selected records will be marked as voided.`}
        // destructive
        busy={busy}
        confirmText="Yes, Approve Void"
        onConfirm={() => void approve()}
        onCancel={() => setConfirm(undefined)}
      />
      <ChecklistDialog
        visible={Boolean(notice)}
        title="Approved"
        kind="success"
        message={notice ?? ""}
        onConfirm={() => setNotice(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  detailsScroll: { flex: 1 },
  content: {
    paddingHorizontal: 7,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
    flexGrow: 1,
  },
  stack: { gap: SPACING.md },
  row: { flexDirection: "row", gap: SPACING.sm },
  column: { flex: 1, minWidth: 0 },
  label: { color: COLORS.textLight, fontSize: 12 },
  error: { color: COLORS.danger },
  cellText: { color: COLORS.text, fontSize: 12 },
  pairedCell: { paddingVertical: 0 },
  subText: { color: COLORS.textLight, fontSize: 11, marginTop: 3 },
  statusText: { fontWeight: "700", fontSize: 12 },
  checkbox: { alignItems: "center", justifyContent: "center" },
  checkText: { color: COLORS.text, fontSize: 21 },
  selectAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  selectAllText: { color: COLORS.text, fontSize: 12 },
  moduleRow: { gap: SPACING.md },
  moduleCard: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fdf7f7",
    ...Platform.select({
      web: { boxShadow: "0px 1px 2px rgba(0,0,0,0.12)" },
      ios: { boxShadow: "0px 1px 2px rgba(0,0,0,0.12)" },
      android: { elevation: 2 },
    }),
  },
  moduleTop: { backgroundColor: COLORS.white },
  moduleCounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  moduleCount: {
    flex: 1,
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderRadius: 8,
  },
  moduleCountPressed: { opacity: 0.7 },
  countCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger,
  },
  countText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
  countLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  moduleBottom: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    backgroundColor: "#7a121b",
  },
  moduleTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  navTabs: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeNavTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  navTabText: { color: COLORS.textLight, fontSize: 16, fontWeight: "500" },
  activeNavTabText: { color: COLORS.primary, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 8, width: "100%" },
  summaryBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: "600" },
  summaryNumber: { fontSize: 22, fontWeight: "700" },
  hr: {
    height: 2,
    backgroundColor: COLORS.border,
    width: "100%",
    // marginVertical: 1,
  },
});
