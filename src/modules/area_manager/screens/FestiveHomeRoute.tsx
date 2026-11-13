import { Directory, File, Paths } from "expo-file-system";
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
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { COLORS, FONT_SIZE, SPACING } from "@/constants/theme";
import ActionCard from "@/components/ActionCard";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import DataTable from "./FasciaTable";
import {
  exportFestiveHomeReport,
  loadFestiveHomeOptions,
  loadFestiveHomeReport,
  type FestiveHomeChecklist,
  type FestiveHomeFilters,
  type FestiveHomeReport,
  type FestiveHomeStore,
} from "../services/FestiveHomeService";
import { prepareReportCsv } from "../../report/services/reportCsv";
import { reportTableValue } from "../../report/services/reportTableFormat";
import SelectField from "../../report/screens/SelectField";
import { isPickerCancellation, trackerPlainText } from "../../report/services/trackerText";
import DateField from "../../report/screens/DateField";
import { today, validDate } from "../../report/services/service";

const EMPTY_FILTERS: FestiveHomeFilters = {
  from: "",
  to: "",
  region: "",
  zone: "",
  store: "",
};
const text = (value: string | null | undefined) =>
  value ? trackerPlainText(value) : "-";
const answerLabel = (answer: number | null | undefined) =>
  ({ 1: "YES", 2: "NO", 3: "N/A" })[answer ?? 0] ?? "-";

export default function FestiveHomeRoute() {
  const [checklist, setChecklist] = useState<FestiveHomeChecklist | null>(null);
  const [stores, setStores] = useState<FestiveHomeStore[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState<FestiveHomeReport>();
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string>();
  const busy = useRef(false);
  const generation = useRef(0);
  const backHandler = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await loadFestiveHomeOptions();
      setChecklist(result.checklist);
      setStores(result.stores);
      setFilters({
        ...EMPTY_FILTERS,
        from: result.checklist?.start_date ?? "",
        to: result.checklist?.end_date ?? "",
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load festive checklist.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);
  useEffect(() => {
    if (backHandler)
      backHandler.current = () => {
        if (opened) {
          generation.current++;
          setOpened(false);
          setReport(undefined);
          setError(undefined);
        } else router.back();
      };
    setBackVisible(true);
    return () => {
      if (backHandler) backHandler.current = null;
      setBackVisible(false);
    };
  }, [backHandler, opened, setBackVisible]);
  const zones = useMemo(
    () => [...new Set(stores.map((s) => text(s.zone)))].sort(),
    [stores],
  );
  const regions = useMemo(
    () =>
      [
        ...new Set(
          stores
            .filter((s) => !filters.zone || text(s.zone) === filters.zone)
            .map((s) => text(s.region)),
        ),
      ].sort(),
    [filters.zone, stores],
  );
  const filteredStores = stores.filter(
    (s) =>
      (!filters.zone || text(s.zone) === filters.zone) &&
      (!filters.region || text(s.region) === filters.region),
  );

  function validate() {
    if (
      !validDate(filters.from) ||
      !validDate(filters.to) ||
      filters.from > filters.to
    ) {
      setError("Choose valid dates with From on or before To.");
      return false;
    }
    return true;
  }
  async function loadReport(more = false) {
    if (busy.current || (!more && !validate())) return;
    busy.current = true;
    const requestId = ++generation.current;
    const selectedFilters = more ? applied : { ...filters };
    setLoading(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await loadFestiveHomeReport(
        selectedFilters,
        more ? (report?.records.length ?? 0) : 0,
      );
      if (requestId !== generation.current) return;
      setReport((current) => ({
        ...result,
        records: more
          ? [...(current?.records ?? []), ...result.records]
          : result.records,
      }));
      setApplied(selectedFilters);
    } catch (cause) {
      if (requestId === generation.current)
        setError(
          cause instanceof Error ? cause.message : "Unable to load report.",
        );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  async function exportCsv() {
    if (exporting || !validate()) return;
    setExporting(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const csv = await exportFestiveHomeReport(filters);
      const filename = `festive-checklist-${filters.from}-to-${filters.to}.csv`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([prepareReportCsv(csv)], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(`Downloaded ${filename}.`);
      } else {
        let file: File;
        if (Platform.OS === "android") {
          const directory = await Directory.pickDirectoryAsync();
          if (!directory) return;
          file = directory.createFile(filename, "text/csv");
        } else {
          file = new File(Paths.document, filename);
          file.create({ overwrite: true });
        }
        file.write(prepareReportCsv(csv));
        setMessage(`Saved ${filename}.`);
      }
    } catch (cause) {
      if (!isPickerCancellation(cause))
        setError(
          cause instanceof Error ? cause.message : "Unable to export report.",
        );
    } finally {
      setExporting(false);
    }
  }

  function renderTable({ item }: { item: FestiveHomeReport }) {
    const columns = [
      { title: "#", width: 56 },
      { title: "Festive Date", width: 140 },
      { title: "Store", width: 200 },
      { title: "Region", width: 160 },
      { title: "Zone", width: 160 },
      ...item.questions.map((question) => ({
        title: text(question.question),
        width: 240,
      })),
      { title: "Score", width: 100 },
      { title: "S1 Name", width: 180 },
      { title: "S1 Created On", width: 190 },
      { title: "S2 Name", width: 180 },
      { title: "S2 Created On", width: 190 },
      { title: "Approval", width: 140 },
    ];
    return (
      <View style={styles.tableSection}>
        {/* <Text style={styles.detail}>
          Swipe left or right to view all columns
        </Text> */}
        <View style={styles.table}>
          <DataTable
            columns={columns}
            rows={item.records.map((record) => ({
              ...record,
              id: String(record.id),
            }))}
            empty="No matching festive checklists found."
            renderCells={(record, index) => [
              String(index + 1),
              reportTableValue("festive_date", record.festive_date),
              text(record.store_name),
              text(record.region),
              text(record.zone),
              ...item.questions.map((question) => (
                <Text
                  key={String(question.id)}
                  style={[
                    styles.detail,
                    record.answers[String(question.id)] === 2 && styles.error,
                  ]}
                >
                  {answerLabel(record.answers[String(question.id)])}
                </Text>
              )),
              `${record.score}%`,
              text(record.created_by),
              reportTableValue("s1_created_on", record.s1_created_on),
              text(record.reviewed_by),
              reportTableValue("s2_created_on", record.s2_created_on),
              <View
                key="status"
                style={[
                  styles.statusBadge,
                  Number(record.status) === 1
                    ? styles.pendingBadge
                    : Number(record.status) === 2
                      ? styles.approvedBadge
                      : Number(record.status) === 3
                        ? styles.rejectedBadge
                        : styles.unknownBadge,
                ]}
              >
                <Text
                  accessibilityLabel={`Checklist status: ${{ 1: "Pending", 2: "Approved", 3: "Rejected" }[Number(record.status)] ?? "Unknown"}`}
                  style={[
                    styles.statusText,
                    Number(record.status) === 1
                      ? styles.pendingText
                      : Number(record.status) === 2
                        ? styles.approvedText
                        : Number(record.status) === 3
                          ? styles.rejectedText
                          : styles.detail,
                  ]}
                >
                  {{ 1: "Pending", 2: "Approved", 3: "Rejected" }[
                    Number(record.status)
                  ] ?? "Unknown"}
                </Text>
              </View>,
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <FlatList
        data={opened && report && report.records.length > 0 ? [report] : []}
        keyExtractor={() => "festive-report-table"}
        renderItem={renderTable}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.form}>
            {error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            {message && (
              <Text accessibilityLiveRegion="polite" style={styles.detail}>
                {message}
              </Text>
            )}
            {!opened ? (
              <>
                {/* <Text style={styles.detail}>
                  Select the configured festive checklist to view its store
                  report.
                </Text> */}
                {checklist && (
                  <ActionCard
                    title={text(checklist.name)}
                    icon="plan"
                    onPress={() => {
                      setOpened(true);
                      void loadReport();
                    }}
                  />
                )}
                {!loading && !checklist && !error && (
                  <Text style={styles.detail}>
                    No active festive checklist found.
                  </Text>
                )}
                {error && (
                  <AppButton
                    title="Retry"
                    onPress={() => void loadOptions()}
                    disabled={loading}
                  />
                )}
              </>
            ) : (
              <>
                <Text style={styles.title}>{text(checklist?.name)} Report</Text>
                <Text style={styles.detail}>Set: {checklist?.set_no}</Text>
                <View style={styles.filterRow}>
                  <View style={styles.filterCell}>
                    <DateField
                      maxDate={today()}
                      label="From Date"
                      value={filters.from}
                      onChange={(from) =>
                        setFilters((current) => ({
                          ...current,
                          from,
                          ...(validDate(from) ? { to: from } : {}),
                        }))
                      }
                      disabled={loading || exporting}
                    />
                  </View>
                  <View style={styles.filterCell}>
                    <DateField
                      maxDate={today()}
                      label="To Date"
                      value={filters.to}
                      onChange={(to) =>
                        setFilters((current) => ({ ...current, to }))
                      }
                      minDate={filters.from}
                      disabled={loading || exporting}
                    />
                  </View>
                </View>
                <View style={styles.filterRow}>
                  <View style={styles.filterCell}>
                    <SelectField
                      label="Zone"
                      value={filters.zone}
                      options={[
                        { value: "", label: "All" },
                        ...zones.map((value) => ({ value, label: value })),
                      ]}
                      disabled={loading || exporting}
                      onChange={(zone) =>
                        setFilters((current) => ({
                          ...current,
                          zone,
                          region: "",
                          store: "",
                        }))
                      }
                    />
                  </View>
                  <View style={styles.filterCell}>
                    <SelectField
                      label="Region"
                      value={filters.region}
                      options={[
                        { value: "", label: "All" },
                        ...regions.map((value) => ({ value, label: value })),
                      ]}
                      disabled={loading || exporting}
                      onChange={(region) =>
                        setFilters((current) => ({
                          ...current,
                          region,
                          store: "",
                        }))
                      }
                    />
                  </View>
                </View>
                <View style={styles.filterRow}>
                  <View style={styles.filterCell}>
                    <SelectField
                      label="Store"
                      value={filters.store}
                      options={[
                        { value: "", label: "All" },
                        ...filteredStores.map((store) => ({
                          value: String(store.id),
                          label: text(store.store_name),
                        })),
                      ]}
                      disabled={loading || exporting}
                      onChange={(store) =>
                        setFilters((current) => ({ ...current, store }))
                      }
                    />
                  </View>
                  {/* <View style={styles.filterCell} /> */}
                </View>
                <View style={styles.filterRow}>
                  <View style={styles.filterCell}>
                    <AppButton
                      title="Apply filters"
                      onPress={() => void loadReport()}
                      disabled={loading || exporting}
                    />
                  </View>
                  <View style={styles.filterCell}>
                    <AppButton
                      title="Export CSV"
                      variant="outline"
                      onPress={() => void exportCsv()}
                      loading={exporting}
                      disabled={loading}
                    />
                  </View>
                </View>
                <Text style={styles.detail}>{report?.total ?? 0} records</Text>
              </>
            )}
            {loading && <ActivityIndicator color={COLORS.primary} />}
          </View>
        }
        ListEmptyComponent={
          opened && !loading && !error ? (
            <Text style={styles.detail}>
              No matching festive checklists found.
            </Text>
          ) : null
        }
        ListFooterComponent={
          opened && report && report.records.length < report.total ? (
            <AppButton
              title="Load more"
              variant="outline"
              disabled={loading || exporting}
              onPress={() => void loadReport(true)}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  pendingBadge: { backgroundColor: "#FFF0B3" },
  approvedBadge: { backgroundColor: "#E4F3E8" },
  rejectedBadge: { backgroundColor: "#FCE5E5" },
  unknownBadge: { backgroundColor: COLORS.surface },
  pendingText: { color: "#805500" },
  approvedText: { color: "#186B32" },
  rejectedText: { color: "#A6212E" },
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  form: { gap: SPACING.md },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  filterCell: { flex: 1, minWidth: 0 },
  tableSection: { gap: SPACING.sm },
  table: { height: 500, borderWidth: 1, borderColor: COLORS.border },

  title: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: "700" },
  detail: { color: COLORS.textLight, fontSize: FONT_SIZE.sm, lineHeight: 21 },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  answer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
});
