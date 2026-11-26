import { router } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import DynamicDataTable, {
  type DynamicColumn,
  type DynamicTableRow,
} from "@/components/table/DynamicAutoDataTable";
import { CARD, COLORS, SPACING } from "@/constants/theme";
import {
  AreaHeaderBackRegistrationContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import ChecklistDialog from "./ChecklistDialog";
import { trackerPlainText } from "../../report/services/trackerText";
import { getSavedCompany } from "@/storage/companyStorage";
import {
  approveHoChecklist,
  loadHoDetails,
  loadHoList,
  HO_CHECKLIST_PAGE_SIZE,
  type HoChecklist,
  type HoDetails,
  type HoList,
} from "../services/HoService";

const HO_API_PAGE_SIZE = 10;

async function loadHoPage(page: number, search: string): Promise<HoList> {
  const apiPagesPerPage = HO_CHECKLIST_PAGE_SIZE / HO_API_PAGE_SIZE;
  const apiStartPage = (page - 1) * apiPagesPerPage + 1;
  const firstPage = await loadHoList(apiStartPage, search);
  const rowOffset = (page - 1) * HO_CHECKLIST_PAGE_SIZE;
  const rowsNeeded = Math.min(
    HO_CHECKLIST_PAGE_SIZE,
    Math.max(0, firstPage.total - rowOffset),
  );
  const apiPageCount = Math.ceil(rowsNeeded / HO_API_PAGE_SIZE);
  const laterPages = await Promise.all(
    Array.from({ length: Math.max(0, apiPageCount - 1) }, (_, index) =>
      loadHoList(apiStartPage + index + 1, search),
    ),
  );

  return {
    ...firstPage,
    page,
    records: [firstPage, ...laterPages]
      .flatMap((result) => result.records)
      .slice(0, HO_CHECKLIST_PAGE_SIZE),
  };
}

const display = (value: unknown) =>
  value == null || value === "" || String(value).startsWith("0000-00-00")
    ? "-"
    : trackerPlainText(value);
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to process HO checklist.";

function Status({ status }: { status: HoChecklist["status"] }) {
  const approved = Number(status) === 4;
  return (
    <Text
      style={[
        styles.status,
        { backgroundColor: approved ? COLORS.success : "#087990" },
      ]}
    >
      {approved ? "RM Approved" : "Waiting for RM"}
    </Text>
  );
}

function Field({
  label,
  value,
  column = false,
}: {
  label: string;
  value: unknown;
  column?: boolean;
}) {
  return (
    <View style={[styles.field, column && styles.column]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{display(value)}</Text>
    </View>
  );
}

export default function HoChecklistScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const tableHeight = Math.max(180, windowHeight - 280);
  const [list, setList] = useState<HoList>();
  const [detail, setDetail] = useState<HoDetails>();
  const [code, setCode] = useState<string>();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<HoChecklist>();
  const [notice, setNotice] = useState<string>();
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const mutation = useRef(false);
  const registerHeaderBack = useContext(AreaHeaderBackRegistrationContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setTitle = useContext(AreaHeaderTitleContext);

  const [previousRequest, setPreviousRequest] = useState({ appliedSearch, code, page, refresh });
  if (
    previousRequest.appliedSearch !== appliedSearch ||
    previousRequest.code !== code ||
    previousRequest.page !== page ||
    previousRequest.refresh !== refresh
  ) {
    setPreviousRequest({ appliedSearch, code, page, refresh });
    setLoading(true);
    setError(undefined);
    if (code) setDetail(undefined);
    else setList(undefined);
  }

  useEffect(() => {
    let active = true;
    
    // Removed the company param from loadHoList, if needed, we can pass it
    const task = code
      ? loadHoDetails(code).then((result) => {
          if (active) setDetail(result);
        })
      : loadHoPage(page, appliedSearch).then((result) => {
          if (active) setList(result);
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
  }, [appliedSearch, code, page, refresh]);

  const goBack = useCallback(() => {
    if (mutation.current) return;
    if (code) {
      setCode(undefined);
      setDetail(undefined);
      setError(undefined);
    } else if (router.canGoBack()) router.back();
    else router.replace("/area_manager/settings");
  }, [code]);

  useEffect(() => {
    const unregister = registerHeaderBack(goBack);
    setBackVisible(true);
    setTitle(code ? "HO Checklist Details" : "HO Checklist");
    return () => {
      unregister();
      setBackVisible(false);
      setTitle(null);
    };
  }, [code, goBack, registerHeaderBack, setBackVisible, setTitle]);

  function applySearch() {
    if (busy || loading) return;
    setPage(1);
    setAppliedSearch(search.trim());
    setRefresh((value) => value + 1);
  }

  async function approve() {
    if (!confirm || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await approveHoChecklist(confirm.checklist_code);
      setConfirm(undefined);
      setNotice(result.message);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setConfirm(undefined);
      setError(errorMessage(cause));
      setDetail(undefined);
      setList(undefined);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  async function openAttachment(filename: string) {
    try {
      const basename = filename.replaceAll("\\", "/").split("/").pop();
      if (!basename || basename === "." || basename === "..") {
        throw new Error("Attachment is not available.");
      }
      
      // Fetch the company's origin URL dynamically
      const company = await getSavedCompany();
      if (!company?.api_url) {
        throw new Error("Company API URL not found.");
      }
      
      // Extract the base domain from the api_url (e.g., https://domain.com/api/v1 -> https://domain.com)
      const urlObj = new URL(company.api_url);
      const origin = `${urlObj.protocol}//${urlObj.host}`;
      
      await Linking.openURL(
        `${origin}/uploads/ho_checklist/${encodeURIComponent(basename)}`,
      );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const banner = (
    <>
      {error && (
        <View style={styles.stack}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <AppButton
            title="Retry"
            variant="outline"
            disabled={loading || busy}
            onPress={() => setRefresh((value) => value + 1)}
          />
        </View>
      )}
      {loading && <ActivityIndicator color={COLORS.primary} />}
    </>
  );

  const summary = (item: HoChecklist, full = false) => (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <Text style={styles.code}>{item.checklist_code}</Text>
        <Status status={item.status} />
      </View>
      <Text style={styles.title}>{display(item.store_name)}</Text>
      <View style={styles.fieldRow}>
        <Field column label="Checklist Date" value={item.checklist_date} />
        <Field column label="Region" value={item.region} />
      </View>
      <View style={styles.fieldRow}>
        <Field column label="HO Name" value={item.ho_visitor_name} />
        <Field column label="HO Employee Code" value={item.ho_emp_code} />
      </View>
      <Field label="Created On" value={item.row_created_on} />
      {full && (
        <>
          <View style={styles.fieldRow}>
            <Field column label="Approved By" value={item.approved_by_name} />
            <Field column label="Approved On" value={item.approved_on} />
          </View>
        </>
      )}
    </View>
  );

  const tableRows: DynamicTableRow[] = (list?.records ?? []).map(
    (item, index) => ({
      id: item.id,
      serial: (page - 1) * HO_CHECKLIST_PAGE_SIZE + index + 1,
      code: item.checklist_code,
      store: display(item.store_name),
      date: display(item.checklist_date),
      region: display(item.region),
      hoName: display(item.ho_visitor_name),
      employeeCode: display(item.ho_emp_code),
      createdOn: display(item.row_created_on),
      status: Number(item.status) === 4 ? "RM Approved" : "Waiting for RM",
    }),
  );
  const findChecklist = (row: DynamicTableRow) =>
    (list?.records ?? []).find((item) => item.id === String(row.id));
  const cell = (value: unknown) => (
    <Text style={styles.tableCell}>{String(value ?? "-")}</Text>
  );
  const columns: DynamicColumn[] = [
    {
      title: "#",
      dataIndex: "serial",
      align: "center",
      searchable: false,
      render: (row) => cell(row.serial),
    },
    {
      title: "Checklist Code",
      dataIndex: "code",
      render: (row) => cell(row.code),
    },
    { title: "Store", dataIndex: "store", render: (row) => cell(row.store) },
    {
      title: "Checklist Date",
      dataIndex: "date",
      render: (row) => cell(row.date),
    },
    { title: "Region", dataIndex: "region", render: (row) => cell(row.region) },
    { title: "HO Name", dataIndex: "hoName", render: (row) => cell(row.hoName) },
    {
      title: "Employee Code",
      dataIndex: "employeeCode",
      render: (row) => cell(row.employeeCode),
    },
    {
      title: "Created On",
      dataIndex: "createdOn",
      render: (row) => cell(row.createdOn),
    },
    { title: "Status", dataIndex: "status", render: (row) => cell(row.status) },
    {
      title: "View",
      dataIndex: "id",
      searchable: false,
      render: (row) => {
        const item = findChecklist(row);
        return item ? (
          <AppButton
            title="view"
            variant="outline"
            style={styles.tableAction}
            disabled={loading || busy}
            onPress={() => setCode(item.checklist_code)}
          />
        ) : cell("-");
      },
    },
    {
      title: "Action",
      dataIndex: "id",
      searchable: false,
      render: (row) => {
        const item = findChecklist(row);
        return item && Number(item.status) === 2 ? (
          <AppButton
            title="Approve"
            style={styles.tableAction}
            disabled={loading || busy}
            onPress={() => setConfirm(item)}
          />
        ) : cell("-");
      },
    },
  ];

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      {code ? (
        <ScrollView key={code} contentContainerStyle={styles.content}>
          {banner}
          {detail && (
            <View style={styles.card}>{summary(detail.checklist, true)}</View>
          )}
          {!loading && detail?.details.length === 0 && (
            <Text style={styles.label}>No checklist rows found.</Text>
          )}
          {detail &&
            Array.from(
              new Set(detail.details.map((item) => item.area_category || "General")),
            ).map((category) => {
              const collapsed = collapsedCategories.includes(category);
              const categoryItems = detail.details.filter(
                (item) => (item.area_category || "General") === category,
              );
              return (
                <View key={category} style={styles.categoryGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !collapsed }}
                    onPress={() =>
                      setCollapsedCategories((current) =>
                        current.includes(category)
                          ? current.filter((value) => value !== category)
                          : [...current, category],
                      )
                    }
                    style={styles.categoryHeader}
                  >
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <Text style={styles.categoryToggle}>{collapsed ? "+" : "−"}</Text>
                  </Pressable>
                  {!collapsed && categoryItems.map((item) => {
                    const index = detail.details.indexOf(item);
                    return (
                      <View key={item.id} style={styles.questionCard}>
                        <Text style={styles.questionTitle}>
                          #{index + 1} · {display(item.question_text)}
                        </Text>
                        <View style={styles.detailTable}>
                          <View style={styles.detailMetricsRow}>
                            {[
                              ["Marks", item.marks],
                              ["Rating", item.rating],
                              ["Point Status", item.point_status],
                            ].map(([label, value]) => (
                              <View key={label} style={styles.detailMetric}>
                                <Text style={styles.label}>{label}</Text>
                                <Text
                                  style={[
                                    styles.value,
                                    label === "Marks" && styles.markValue,
                                    label === "Marks" && {
                                      color:
                                        Number(value) === 1
                                          ? COLORS.success
                                          : Number(value) === 0
                                            ? COLORS.danger
                                            : COLORS.text,
                                    },
                                  ]}
                                >
                                  {display(value)}
                                </Text>
                              </View>
                            ))}
                          </View>
                          {[
                            ["Why", item.complied],
                            ["HO Remark", item.remark],
                            ["Store Remark", item.store_remark],
                          ].map(([label, value]) => (
                            <View key={label} style={styles.detailAnswerRow}>
                              <Text style={styles.detailAnswerLabel}>{label}</Text>
                              <Text style={styles.detailAnswerValue}>{display(value)}</Text>
                            </View>
                          ))}
                          <View style={styles.detailAnswerRow}>
                            <Text style={styles.detailAnswerLabel}>Attachment</Text>
                            {item.file_name ? (
                              <AppButton
                                title={item.original_file_name
                                  ? `View: ${display(item.original_file_name)}`
                                  : "View attachment"}
                                variant="outline"
                                onPress={() => void openAttachment(item.file_name)}
                              />
                            ) : (
                              <Text style={styles.detailAnswerValue}>-</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.listContent]}>
          <View style={styles.stack}>
            <View style={styles.searchRow}>
              <AppInput
                containerStyle={styles.search}
                accessibilityLabel="Search HO checklists"
                placeholder="Search code, store or HO name"
                value={search}
                maxLength={150}
                editable={!busy}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={applySearch}
              />
              <AppButton
                title="Search"
                disabled={loading || busy}
                onPress={applySearch}
              />
            </View>
            {list && (
              <Text style={styles.label}>
                {list.total} checklists · {list.region}
              </Text>
            )}
            {banner}
          </View>
          <View style={styles.tableContainer}>
            <DynamicDataTable
              columns={columns}
              data={tableRows}
              height={tableHeight}
              loading={loading}
              refreshKey={`${page}-${refresh}`}
              emptyMessage={error ? "" : "No HO checklists found."}
            />
          </View>
          {list && list.total > 0 && (
            <View style={styles.pagination}>
              <AppButton
                title="Previous"
                variant="outline"
                disabled={loading || busy || page <= 1}
                onPress={() => setPage((value) => value - 1)}
              />
              <Text style={styles.label}>
                Page {page} of {Math.max(1, Math.ceil(list.total / HO_CHECKLIST_PAGE_SIZE))}
              </Text>
              <AppButton
                title="Next"
                variant="outline"
                disabled={loading || busy || page * HO_CHECKLIST_PAGE_SIZE >= list.total}
                onPress={() => setPage((value) => value + 1)}
              />
            </View>
          )}
        </View>
      )}
      {detail && !loading && Number(detail.checklist.status) === 2 && (
        <View style={styles.approvalBar}>
          <AppButton
            title="Approve Checklist"
            disabled={busy}
            onPress={() => setConfirm(detail.checklist)}
          />
        </View>
      )}
      <ChecklistDialog
        visible={Boolean(confirm)}
        title="Approve HO checklist?"
        message={`Complete RM approval for ${confirm?.checklist_code ?? ""}?`}
        busy={busy}
        confirmText="Yes, Approve"
        onConfirm={() => void approve()}
        onCancel={() => setConfirm(undefined)}
      />
      <ChecklistDialog
        visible={Boolean(notice)}
        title="Approved"
        message={notice ?? ""}
        kind="success"
        onConfirm={() => setNotice(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface,},
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl,paddingTop:0 },
  listContent: { flex: 1 },
  stack: { gap: SPACING.sm },
  card: { ...CARD, borderRadius: 12, gap: SPACING.md },
  heading: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  code: { flex: 1, color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  status: {
    maxWidth: "50%",
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "right",
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
  },
  category: { color: COLORS.primary, fontSize: 17, fontWeight: "700" },
  categoryGroup: { gap: SPACING.sm },
  categoryHeader: {
    minHeight: 46,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryTitle: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  categoryToggle: { color: COLORS.white, fontSize: 22, fontWeight: "600" },
  questionCard: { ...CARD, borderRadius: 10, gap: SPACING.md },
  questionTitle: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  detailTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  detailMetricsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
  },
  detailMetric: {
    flex: 1,
    gap: 4,
    padding: SPACING.sm,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  markValue: { fontWeight: "700" },
  detailAnswerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  detailAnswerLabel: {
    width: 110,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
  detailAnswerValue: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 20 },
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  field: { gap: 4 },
  column: { flex: 1, minWidth: 0 },
  label: { color: COLORS.textLight, fontSize: 12 },
  value: { color: COLORS.text, fontSize: 14, lineHeight: 21 },
  searchRow: { flexDirection: "row", gap: SPACING.sm, alignItems: "center" },
  search: { flex: 1, minWidth: 0,paddingTop:10 },
  tableContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  tableCell: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
  },
  tableAction: { minHeight: 28, paddingHorizontal: SPACING.sm },
  actions: { flexDirection: "row", gap: SPACING.sm },
  action: { flex: 1 },
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  approvalBar: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  error: { color: COLORS.danger },
});
