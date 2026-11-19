import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";

import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import DateField from "@/components/DateField";
import SelectField from "@/components/SelectField";
import { COLORS, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import DynamicDataTable from "@/components/DynamicAutoDataTable";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
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

const message = (error: unknown) =>
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
  const [regions, setRegions] = useState<string[]>([]);
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
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    setSelected([]);
    setRecords([]);
    const task = filters
      ? loadVoidRecords(filters).then((result) => {
          if (active) {
            setRecords(result.records);
            setTotal(result.total);
          }
        })
      : loadVoidOptions().then((result) => {
          if (active) {
            setModules(result.modules);
            setRegions(result.regions);
          }
        });
    task
      .catch((cause) => {
        if (active) setError(message(cause));
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
      status,
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
      setError(message(cause));
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
    (module) => module.category === category,
  );
  const tabs = (
    values: { value: string; label: string }[],
    current: string,
    onChange: (value: string) => void,
  ) => (
    <View style={styles.row}>
      {values.map((tab) => (
        <AppButton
          key={tab.value}
          title={tab.label}
          variant={tab.value === current ? "primary" : "outline"}
          style={styles.column}
          disabled={loading || busy}
          onPress={() => onChange(tab.value)}
        />
      ))}
    </View>
  );
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
              {tabs(
                [
                  { value: "1", label: "All Register" },
                  { value: "2", label: "All Tracker" },
                ],
                String(category),
                (value) => setCategory(Number(value)),
              )}
              <View style={styles.regionHighlight}>
                <Text style={styles.regionHighlightLabel}>REGION</Text>
                <Text style={styles.regionHighlightValue}>
                  {regions.length ? regions.join(", ") : "All available regions"}
                </Text>
              </View>
              <Text style={styles.value}>
                {categoryModules.reduce((sum, item) => sum + item.pending, 0)}{" "}
                pending ·{" "}
                {categoryModules.reduce((sum, item) => sum + item.voided, 0)}{" "}
                voided
              </Text>
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
                    <Text style={styles.countLabel}>Complete</Text>
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
        <FlatList
          key={filters.table}
          data={records}
          keyExtractor={(item) => item.id}
          extraData={{ selected, busy }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => {
            if (!busy) setRefresh((value) => value + 1);
          }}
          ListHeaderComponent={
            <View style={styles.stack}>
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
                    current ? { ...current, table, page: 1 } : current,
                  )
                }
              />
              {tabs(
                [
                  { value: "pending", label: "Pending" },
                  { value: "voided", label: "Voided" },
                ],
                filters.status,
                (status) =>
                  setFilters((current) =>
                    current
                      ? {
                          ...current,
                          status: status as "pending" | "voided",
                          page: 1,
                        }
                      : current,
                  ),
              )}
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
              <AppInput
                accessibilityLabel="Search void records"
                placeholder="Search store, region or zone"
                value={search}
                maxLength={150}
                editable={!busy}
                onChangeText={setSearch}
              />
              <AppButton
                title="Apply Filters"
                disabled={loading || busy}
                onPress={() =>
                  setFilters((current) =>
                    current
                      ? { ...current, search: search.trim(), from, to, page: 1 }
                      : current,
                  )
                }
              />
              {banner}
              <Text style={styles.label}>{total} records</Text>

              {records.length > 0 && (
                <View style={styles.tableContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    nestedScrollEnabled
                  >
                    <View>
                      <View style={[styles.tableRow, styles.tableHeader]}>
                        {filters.status === "pending" && (
                          <View style={styles.selectColumn}>
                            <Pressable
                              accessibilityRole="checkbox"
                              accessibilityLabel={
                                selected.length === records.length
                                  ? "Deselect all records on this page"
                                  : "Select all records on this page"
                              }
                              accessibilityState={{
                                checked:
                                  records.length > 0 &&
                                  selected.length === records.length,
                                disabled: busy || loading,
                              }}
                              disabled={busy || loading}
                              style={styles.checkbox}
                              onPress={() =>
                                setSelected(
                                  selected.length === records.length
                                    ? []
                                    : records.map((record) => record.id),
                                )
                              }
                            >
                              <Text style={styles.headerCheckbox}>
                                {records.length > 0 &&
                                selected.length === records.length
                                  ? "☑"
                                  : "☐"}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                        <Text style={[styles.headerText, styles.serialColumn]}>
                          #
                        </Text>
                        <Text style={[styles.headerText, styles.storeColumn]}>
                          Store
                        </Text>
                        <Text style={[styles.headerText, styles.regionColumn]}>
                          Region / Zone
                        </Text>
                        <Text style={[styles.headerText, styles.requestColumn]}>
                          Requested By / On
                        </Text>
                        <Text style={[styles.headerText, styles.reasonColumn]}>
                          Void Reason / Remark
                        </Text>
                        {filters.status === "voided" && (
                          <Text
                            style={[styles.headerText, styles.requestColumn]}
                          >
                            Approved By / On
                          </Text>
                        )}
                        {records
                          .flatMap((record) => record.fields)
                          .filter(
                            (field, index, all) =>
                              all.findIndex(
                                (candidate) => candidate.label === field.label,
                              ) === index,
                          )
                          .map((field) => (
                            <Text
                              key={field.label}
                              style={[styles.headerText, styles.dynamicColumn]}
                            >
                              {field.label}
                            </Text>
                          ))}
                        {records.some((record) => record.product_count > 0) && (
                          <Text
                            style={[styles.headerText, styles.requestColumn]}
                          >
                            Exchange Products
                          </Text>
                        )}
                        <Text style={[styles.headerText, styles.actionColumn]}>
                          Status
                        </Text>
                      </View>
                      {records.map((item, index) => (
                        <View
                          key={item.id}
                          style={[
                            styles.tableRow,
                            index % 2 === 1 && styles.alternateRow,
                          ]}
                        >
                          {filters.status === "pending" && (
                            <View style={styles.selectColumn}>
                              <Pressable
                                accessibilityRole="checkbox"
                                accessibilityLabel={`Select void request for ${display(item.store_name)}`}
                                accessibilityState={{
                                  checked: selected.includes(item.id),
                                  disabled: busy || loading,
                                }}
                                disabled={busy || loading}
                                style={styles.checkbox}
                                onPress={() =>
                                  setSelected((current) =>
                                    current.includes(item.id)
                                      ? current.filter((id) => id !== item.id)
                                      : [...current, item.id],
                                  )
                                }
                              >
                                <Text style={styles.CheckcellText}>
                                  {selected.includes(item.id) ? "☑" : "☐"}
                                </Text>
                              </Pressable>
                            </View>
                          )}
                          <Text style={[styles.cellText, styles.serialColumn]}>
                            {(filters.page - 1) * 20 + index + 1}
                          </Text>
                          <Text style={[styles.cellText, styles.storeColumn]}>
                            {display(item.store_name)}
                          </Text>
                          <Text style={[styles.cellText, styles.regionColumn]}>
                            {display(item.region)} / {display(item.zone)}
                          </Text>
                          <View style={styles.requestColumn}>
                            <Text style={styles.cellText}>
                              {display(item.requested_by)}
                            </Text>
                            <Text style={styles.subText}>
                              {display(item.requested_on)}
                            </Text>
                          </View>
                          <View style={styles.reasonColumn}>
                            <Text style={styles.cellText}>
                              {display(item.reason)}
                            </Text>
                            <Text style={styles.subText}>
                              {display(item.remark)}
                            </Text>
                          </View>
                          {filters.status === "voided" && (
                            <View style={styles.requestColumn}>
                              <Text style={styles.cellText}>
                                {display(item.approved_by)}
                              </Text>
                              <Text style={styles.subText}>
                                {display(item.approved_on)}
                              </Text>
                            </View>
                          )}
                          {records
                            .flatMap((record) => record.fields)
                            .filter(
                              (field, fieldIndex, all) =>
                                all.findIndex(
                                  (candidate) =>
                                    candidate.label === field.label,
                                ) === fieldIndex,
                            )
                            .map((field) => (
                              <Text
                                key={field.label}
                                style={[styles.cellText, styles.dynamicColumn]}
                              >
                                {display(
                                  item.fields.find(
                                    (itemField) =>
                                      itemField.label === field.label,
                                  )?.value,
                                )}
                              </Text>
                            ))}
                          {records.some(
                            (record) => record.product_count > 0,
                          ) && (
                            <Text
                              style={[styles.cellText, styles.requestColumn]}
                            >
                              {item.product_count || 0}
                            </Text>
                          )}
                          <View style={styles.actionColumn}>
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    filters.status === "pending"
                                      ? COLORS.danger
                                      : COLORS.success,
                                },
                              ]}
                            >
                              {filters.status === "pending"
                                ? "Pending"
                                : "Voided"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.label}>
                No{" "}
                {filters.status === "pending"
                  ? "pending void requests"
                  : "voided records"}{" "}
                found.
              </Text>
            ) : null
          }
          renderItem={() => null}
          ListFooterComponent={
            total > 0 && !error ? (
              <View style={styles.paginationContainer}>
                <Text style={styles.pageLabel}>
                  Page {filters.page} of {Math.max(1, Math.ceil(total / 20))} |{" "}
                  {(filters.page - 1) * 20 + 1}-
                  {Math.min(filters.page * 20, total)} of {total}
                </Text>
                <View style={styles.pagination}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous page"
                    accessibilityState={{
                      disabled: loading || busy || filters.page <= 1,
                    }}
                    style={({ pressed }) => [
                      styles.pageButton,
                      (loading || busy || filters.page <= 1) &&
                        styles.pageButtonDisabled,
                      pressed && styles.pageButtonPressed,
                    ]}
                    disabled={loading || busy || filters.page <= 1}
                    onPress={() =>
                      setFilters((current) =>
                        current
                          ? { ...current, page: current.page - 1 }
                          : current,
                      )
                    }
                  >
                    <Text style={styles.pageButtonText}>‹</Text>
                  </Pressable>
                  {Array.from(
                    { length: Math.max(1, Math.ceil(total / 20)) },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <Pressable
                      key={page}
                      accessibilityRole="button"
                      accessibilityLabel={`Page ${page}${filters.page === page ? ", current page" : ""}`}
                      accessibilityState={{
                        selected: filters.page === page,
                        disabled: loading || busy,
                      }}
                      style={({ pressed }) => [
                        styles.pageButton,
                        filters.page === page && styles.pageButtonCurrent,
                        pressed && styles.pageButtonPressed,
                      ]}
                      disabled={loading || busy || filters.page === page}
                      onPress={() =>
                        setFilters((current) =>
                          current ? { ...current, page } : current,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.pageButtonText,
                          filters.page === page && styles.pageButtonCurrentText,
                        ]}
                      >
                        {page}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next page"
                    accessibilityState={{
                      disabled: loading || busy || filters.page * 20 >= total,
                    }}
                    style={({ pressed }) => [
                      styles.pageButton,
                      (loading || busy || filters.page * 20 >= total) &&
                        styles.pageButtonDisabled,
                      pressed && styles.pageButtonPressed,
                    ]}
                    disabled={loading || busy || filters.page * 20 >= total}
                    onPress={() =>
                      setFilters((current) =>
                        current
                          ? { ...current, page: current.page + 1 }
                          : current,
                      )
                    }
                  >
                    <Text style={styles.pageButtonText}>›</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
        />
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
        title="Approve void requests?"
        message={`Approve ${confirm?.length ?? 0} selected request(s)? The selected records will be marked void.`}
        destructive
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
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  stack: { gap: SPACING.md },
  tableContainer: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 58,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  tableHeader: { backgroundColor: COLORS.primary, minHeight: 48 },
  alternateRow: { backgroundColor: COLORS.surface },
  serialColumn: { width: 56, paddingHorizontal: SPACING.sm },
  selectColumn: {
    width: 72,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  storeColumn: { width: 170, padding: SPACING.sm },
  regionColumn: { width: 150, padding: SPACING.sm },
  requestColumn: {
    width: 160,
    padding: SPACING.sm,
  },
  reasonColumn: {
    width: 210,
    padding: SPACING.sm,
  },
  actionColumn: {
    width: 190,
    padding: SPACING.sm,
    gap: 4,
  },
  headerText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  headerCheckbox: { color: COLORS.white, fontSize: 20, fontWeight: "700" },
  cellText: { color: COLORS.text, fontSize: 14 },
  CheckcellText: { color: COLORS.text, fontSize: 20 },
  subText: { color: COLORS.textLight, fontSize: 11, marginTop: 3 },
  statusText: { fontWeight: "700", fontSize: 13 },
  dynamicColumn: { width: 160, padding: SPACING.sm },
  row: { flexDirection: "row", gap: SPACING.sm },
  column: { flex: 1, minWidth: 0 },
  moduleRow: { gap: SPACING.md },
  // moduleCard: {
  //   flex: 1,
  //   borderRadius: 10,
  //   overflow: "hidden",
  //   backgroundColor: "#fdf7f7",
  //   elevation: 2,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.12,
  //   shadowRadius: 2,
  // },

  moduleCard: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fdf7f7",

    ...Platform.select({
      web: {
        boxShadow: "0px 1px 2px rgba(0,0,0,0.12)",
      },
      ios: {
        boxShadow: "0px 1px 2px rgba(0,0,0,0.12)",
      },
      android: {
        elevation: 2,
      },
    }),
  },

  moduleTop: { backgroundColor: COLORS.white, padding: SPACING.sm },
  regionHighlight: {
    backgroundColor: "#fff4e5",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 2,
  },
  regionHighlightLabel: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  regionHighlightValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
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
    minHeight: 56,
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
  title: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  label: { color: COLORS.textLight, fontSize: 12 },
  value: { color: COLORS.text, fontSize: 14, lineHeight: 21 },
  heading: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  badge: {
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
  },
  info: { gap: 4 },
  checkbox: { minHeight: 44, justifyContent: "center" },
  error: { color: COLORS.danger },
  paginationContainer: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  pageLabel: { color: COLORS.textLight, fontSize: 12, textAlign: "center" },
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  pageButton: {
    minWidth: 38,
    height: 40,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  pageButtonCurrent: { backgroundColor: COLORS.primary },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonPressed: { opacity: 0.7 },
  pageButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
  pageButtonCurrentText: { color: COLORS.white },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
});
