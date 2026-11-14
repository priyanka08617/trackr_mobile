import { router } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { CARD, COLORS, SPACING } from "@/constants/theme";
import {
  AreaHeaderBackContext,
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
  type HoChecklist,
  type HoDetails,
  type HoList,
} from "../services/HoService";

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
  const mutation = useRef(false);
  const headerBack = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setTitle = useContext(AreaHeaderTitleContext);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    if (code) setDetail(undefined);
    else setList(undefined);
    
    // Removed the company param from loadHoList, if needed, we can pass it
    const task = code
      ? loadHoDetails(code).then((result) => {
          if (active) setDetail(result);
        })
      : loadHoList(page, appliedSearch).then((result) => {
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
    if (headerBack) headerBack.current = goBack;
    setBackVisible(true);
    setTitle(code ? "HO Checklist Details" : "HO Checklist");
    return () => {
      if (headerBack) headerBack.current = null;
      setBackVisible(false);
      setTitle(null);
    };
  }, [code, goBack, headerBack, setBackVisible, setTitle]);

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
            <Field column label="HO Mobile" value={item.ho_mobile_no} />
            <Field column label="HO Email" value={item.ho_email} />
          </View>
          <View style={styles.fieldRow}>
            <Field column label="Approved By" value={item.approved_by_name} />
            <Field column label="Approved On" value={item.approved_on} />
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      {code ? (
        <FlatList
          key={code}
          data={detail?.details ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshing={loading}
          onRefresh={() => {
            if (!busy) setRefresh((value) => value + 1);
          }}
          ListHeaderComponent={
            <View style={styles.stack}>
              {banner}
              {detail && (
                <View style={styles.card}>
                  {summary(detail.checklist, true)}
                </View>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.stack}>
              {(index === 0 ||
                item.area_category !==
                  detail?.details[index - 1].area_category) && (
                <Text accessibilityRole="header" style={styles.category}>
                  {display(item.area_category || "General")}
                </Text>
              )}
              <View style={styles.card}>
                <Text style={styles.title}>
                  {index + 1}. {display(item.question_text)}
                </Text>
                <View style={styles.fieldRow}>
                  <Field column label="Marks" value={item.marks} />
                  <Field column label="Rating" value={item.rating} />
                </View>
                <Field label="Why" value={item.complied} />
                <Field label="HO Remark" value={item.remark} />
                <Field label="Point Status" value={item.point_status} />
                <Field label="Store Remark" value={item.store_remark} />
                {item.file_name ? (
                  <AppButton
                    title={
                      item.original_file_name
                        ? `View: ${display(item.original_file_name)}`
                        : "View attachment"
                    }
                    variant="outline"
                    onPress={() => void openAttachment(item.file_name)}
                  />
                ) : (
                  <Field label="Attachment" value={null} />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading && detail ? (
              <Text style={styles.label}>No checklist rows found.</Text>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={list?.records ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => {
            if (!busy) setRefresh((value) => value + 1);
          }}
          ListHeaderComponent={
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
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {summary(item)}
              <View style={styles.actions}>
                <AppButton
                  title="View Details"
                  variant="outline"
                  style={styles.action}
                  disabled={loading || busy}
                  onPress={() => setCode(item.checklist_code)}
                />
                {Number(item.status) === 2 && (
                  <AppButton
                    title="Approve"
                    style={styles.action}
                    disabled={loading || busy}
                    onPress={() => setConfirm(item)}
                  />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.label}>No HO checklists found.</Text>
            ) : null
          }
          ListFooterComponent={
            list && list.total > 0 ? (
              <View style={styles.pagination}>
                <AppButton
                  title="Previous"
                  variant="outline"
                  disabled={loading || busy || page <= 1}
                  onPress={() => setPage((value) => value - 1)}
                />
                <Text style={styles.label}>
                  Page {page} of {Math.max(1, Math.ceil(list.total / 10))}
                </Text>
                <AppButton
                  title="Next"
                  variant="outline"
                  disabled={loading || busy || page * 10 >= list.total}
                  onPress={() => setPage((value) => value + 1)}
                />
              </View>
            ) : null
          }
        />
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
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
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
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  field: { gap: 4 },
  column: { flex: 1, minWidth: 0 },
  label: { color: COLORS.textLight, fontSize: 12 },
  value: { color: COLORS.text, fontSize: 14, lineHeight: 21 },
  searchRow: { flexDirection: "row", gap: SPACING.sm, alignItems: "center" },
  search: { flex: 1, minWidth: 0 },
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