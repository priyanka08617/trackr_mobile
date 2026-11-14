import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import DateField from "@/components/DateField";
import SelectField from "@/components/SelectField";
import { CARD, COLORS, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{display(value)}</Text>
    </View>
  );
}
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
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [confirm, setConfirm] = useState<string[]>();
  const [notice, setNotice] = useState<string>();
  const lock = useRef(false);
  const back = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setTitle = useContext(AreaHeaderTitleContext);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    setSelected([]);
    setExpanded([]);
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
    else router.replace("/area_manager/all_void");
  }, [filters]);
  useEffect(() => {
    if (back) back.current = goBack;
    setBackVisible(true);
    setTitle(
      filters
        ? (modules.find((module) => module.table === filters.table)?.name ??
            "Void Requests")
        : "All Void List",
    );
    return () => {
      if (back) back.current = null;
      setBackVisible(false);
      setTitle(null);
    };
  }, [back, filters, goBack, modules, setBackVisible, setTitle]);
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
              <Text style={styles.label}>
                {regions.length ? regions.join(", ") : "All available regions"}
              </Text>
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
                    <Text style={styles.countLabel}>Total Pending</Text>
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
                    <Text style={styles.countLabel}>Total Void</Text>
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
          extraData={{ selected, expanded, busy }}
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
              {filters.status === "pending" && records.length > 0 && (
                <AppButton
                  title={
                    selected.length === records.length
                      ? "Clear selection"
                      : "Select this page"
                  }
                  variant="outline"
                  disabled={busy || loading}
                  onPress={() =>
                    setSelected(
                      selected.length === records.length
                        ? []
                        : records.map((record) => record.id),
                    )
                  }
                />
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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.heading}>
                <Text style={[styles.title, styles.column]}>
                  {display(item.store_name)}
                </Text>
                <Text
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        filters.status === "pending"
                          ? COLORS.danger
                          : COLORS.success,
                    },
                  ]}
                >
                  {filters.status === "pending" ? "Pending" : "Voided"}
                </Text>
              </View>
              <Text style={styles.label}>
                {display(item.region)} · {display(item.zone)}
              </Text>
              <Info label="Requested By" value={item.requested_by} />
              <Info label="Requested On" value={item.requested_on} />
              <Info label="Void Reason" value={item.reason} />
              <Info label="Void Remark" value={item.remark} />
              {item.product_count > 0 && (
                <Text style={styles.label}>
                  {item.product_count} exchange products
                </Text>
              )}
              {filters.status === "voided" && (
                <>
                  <Info label="Approved By" value={item.approved_by} />
                  <Info label="Approved On" value={item.approved_on} />
                </>
              )}
              {expanded.includes(item.id) &&
                item.fields.map((field, index) => (
                  <Info
                    key={`${index}-${field.label}`}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              <AppButton
                title={
                  expanded.includes(item.id) ? "Hide Details" : "View Details"
                }
                variant="outline"
                onPress={() =>
                  setExpanded((current) =>
                    current.includes(item.id)
                      ? current.filter((id) => id !== item.id)
                      : [...current, item.id],
                  )
                }
              />
              {filters.status === "pending" && (
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
                  <Text style={styles.value}>
                    {selected.includes(item.id) ? "☑" : "☐"} Select for approval
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          ListFooterComponent={
            total > 0 && !error ? (
              <View style={styles.pagination}>
                <AppButton
                  title="Previous"
                  variant="outline"
                  disabled={loading || busy || filters.page <= 1}
                  onPress={() =>
                    setFilters((current) =>
                      current
                        ? { ...current, page: current.page - 1 }
                        : current,
                    )
                  }
                />
                <Text style={styles.label}>
                  Page {filters.page} of {Math.max(1, Math.ceil(total / 20))}
                </Text>
                <AppButton
                  title="Next"
                  variant="outline"
                  disabled={loading || busy || filters.page * 20 >= total}
                  onPress={() =>
                    setFilters((current) =>
                      current
                        ? { ...current, page: current.page + 1 }
                        : current,
                    )
                  }
                />
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
  card: { ...CARD, borderRadius: 12, gap: SPACING.sm },
  row: { flexDirection: "row", gap: SPACING.sm },
  column: { flex: 1, minWidth: 0 },
  moduleRow: { gap: SPACING.md },
  moduleCard: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fdf7f7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  moduleTop: { backgroundColor: COLORS.white, padding: SPACING.sm },
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
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
});
