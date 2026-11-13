import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppButton from "@/components/AppButton";
import AppHeader from "@/components/AppHeader";
import AppInput from "@/components/AppInput";
import AppLoader from "@/components/AppLoader";
import {
  CARD,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "../../report/services/AreaHeaderBackContext";
import { reportTableValue } from "../../report/services/reportTableFormat";
import DataTable, { type FasciaColumn } from "./FasciaTable";
import Settings from "./Settings";

export type ChecklistStatus = 1 | 2 | 3;
export type ChecklistAnswer = 1 | 2 | 3;

export interface FestiveQuestion {
  id: string;
  subcategory: string;
  question: string;
  answer: ChecklistAnswer;
}

export interface FestiveSubmission {
  id: string;
  store: string;
  festiveDate: string;
  category: string;
  createdBy: string;
  createdOn: string;
  reviewedBy?: string;
  reviewedOn?: string;
  status: ChecklistStatus;
  questions: FestiveQuestion[];
}

export interface FestiveChecklistProps {
  embedded?: boolean;
  submissions?: FestiveSubmission[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onLoadDetails?: (id: string) => Promise<FestiveSubmission>;
  onBackPress?: () => void;
  initialSubmissionId?: string;
  onReview?: (id: string, status: 2 | 3) => Promise<void>;
  onUpdateAnswer?: (
    submissionId: string,
    answerId: string,
    answer: ChecklistAnswer,
  ) => Promise<void>;
}

const STATUS = { 1: "Waiting for approval", 2: "Approved", 3: "Rejected" };
const ANSWER = { 1: "Yes", 2: "No", 3: "Not Applicable" };
const STATUS_COLOR = { 1: COLORS.warning, 2: COLORS.success, 3: COLORS.danger };
const PAGE_SIZE = 10;
const CHECKLIST_COLUMNS: FasciaColumn[] = [
  { title: "#", width: 56 },
  { title: "Store", width: 200 },
  { title: "Category", width: 220 },
  { title: "Festive Date", width: 140 },
  { title: "Created By", width: 180 },
  { title: "Created On", width: 190 },
  { title: "Reviewed By", width: 180 },
  { title: "Reviewed On", width: 190 },
  { title: "Status", width: 180 },
  { title: "View", width: 90 },
  { title: "Actions", width: 180 },
];

type Confirmation =
  | { kind: "review"; id: string; status: 2 | 3 }
  | { kind: "answer"; id: string; answerId: string; answer: ChecklistAnswer };

/** Area manager festive approval interface. Data and persistence are supplied by its parent. */
export default function FestiveChecklist({
  submissions = [],
  loading = false,
  error,
  onRefresh,
  onBackPress,
  onLoadDetails,
  onReview,
  onUpdateAnswer,
  initialSubmissionId,
  embedded = false,
}: FestiveChecklistProps) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 400 || fontScale > 1.2;
  const saveInFlight = useRef(false);
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSubmissionId ?? null,
  );
  const [page, setPage] = useState(1);
  const [editingQuestion, setEditingQuestion] =
    useState<FestiveQuestion | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [loadedDetail, setLoadedDetail] = useState<FestiveSubmission | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const headerBack = useContext(AreaHeaderBackContext);
  const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);
  const goBack = useCallback(() => {
    if (saving) return;
    if (selectedId) {
      setSelectedId(null);
      setEditingQuestion(null);
      setLoadedDetail(null);
    } else onBackPress?.();
  }, [onBackPress, saving, selectedId]);
  useEffect(() => {
    if (!embedded) return;
    if (headerBack) headerBack.current = goBack;
    setHeaderBackVisible(Boolean(selectedId || onBackPress));
    return () => {
      if (headerBack) headerBack.current = null;
      setHeaderBackVisible(false);
    };
  }, [
    embedded,
    goBack,
    headerBack,
    onBackPress,
    selectedId,
    setHeaderBackVisible,
  ]);
  const selected =
    (loadedDetail?.id === selectedId ? loadedDetail : undefined) ??
    submissions.find((item) => item.id === selectedId);
  const confirmationSubmission = confirmation
    ? loadedDetail?.id === confirmation.id
      ? loadedDetail
      : submissions.find((item) => item.id === confirmation.id)
    : undefined;
  const questionGroups = useMemo(() => {
    const groups = new Map<string, FestiveQuestion[]>();
    for (const question of selected?.questions ?? []) {
      const group = groups.get(question.subcategory) ?? [];
      group.push(question);
      groups.set(question.subcategory, group);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [selected?.questions]);
  const filtered = submissions.filter((item) =>
    item.category.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function confirm(action: Confirmation) {
    if (saveInFlight.current) return;
    setSaveError(undefined);
    setNotice(null);
    setConfirmation(action);
  }

  async function openSubmission(id: string) {
    if (saveInFlight.current) return;
    setSelectedId(id);
    setEditingQuestion(null);
    setLoadedDetail(null);
    setDetailError(undefined);
    if (!onLoadDetails) return;
    setDetailLoading(true);
    try {
      setLoadedDetail(await onLoadDetails(id));
    } catch (cause) {
      setDetailError(
        cause instanceof Error
          ? cause.message
          : "Unable to load checklist details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function save() {
    if (!confirmation || saveInFlight.current) return;
    const current =
      loadedDetail?.id === confirmation.id
        ? loadedDetail
        : submissions.find((item) => item.id === confirmation.id);
    if (!current || current.status !== 1) {
      setSaveError(
        "This submission is no longer awaiting approval. Refresh and try again.",
      );
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setSaveError(undefined);
    try {
      if (confirmation.kind === "review") {
        if (!onReview) throw new Error("Approval is not connected yet.");
        await onReview(confirmation.id, confirmation.status);
        setLoadedDetail((current) =>
          current?.id === confirmation.id
            ? { ...current, status: confirmation.status }
            : current,
        );
      } else {
        if (!onUpdateAnswer)
          throw new Error("Answer updates are not connected yet.");
        await onUpdateAnswer(
          confirmation.id,
          confirmation.answerId,
          confirmation.answer,
        );
        setLoadedDetail({
          ...current,
          questions: current.questions.map((question) =>
            question.id === confirmation.answerId
              ? { ...question, answer: confirmation.answer }
              : question,
          ),
        });
      }
      setNotice({
        title:
          confirmation.kind === "answer"
            ? "Answer updated"
            : confirmation.status === 2
              ? "Checklist approved"
              : "Checklist rejected",
        message:
          confirmation.kind === "answer"
            ? "The checklist answer was saved successfully."
            : "Your review was saved successfully.",
      });
      setConfirmation(null);
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Unable to save. Please try again.",
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  function pagination(
    current: number,
    total: number,
    change: (next: number) => void,
  ) {
    return (
      <View style={styles.pagination}>
        <AppButton
          title="Previous"
          variant="outline"
          disabled={current <= 1 || saving}
          onPress={() => change(current - 1)}
        />
        <Text style={styles.text}>
          Page {current} of {total}
        </Text>
        <AppButton
          title="Next"
          variant="outline"
          disabled={current >= total || saving}
          onPress={() => change(current + 1)}
        />
      </View>
    );
  }

  function reviewActions(item: FestiveSubmission) {
    if (item.status !== 1 || !onReview) return null;
    return (
      <View style={styles.actions}>
        <AppButton
          title="Approve"
          style={styles.reviewAction}
          disabled={saving}
          onPress={() => confirm({ kind: "review", id: item.id, status: 2 })}
        />
        <AppButton
          title="Reject"
          style={styles.reviewAction}
          variant="danger"
          disabled={saving}
          onPress={() => confirm({ kind: "review", id: item.id, status: 3 })}
        />
      </View>
    );
  }

  function metadata(item: FestiveSubmission, details = false) {
    if (details) {
      const fields = [
        ["Category", item.category],
        ["Festive Date", item.festiveDate],
        ["Created By", item.createdBy],
        ["Created On", item.createdOn],
        ["Store", item.store],
        ...(item.status !== 1
          ? [
              [
                item.status === 2 ? "Approved By" : "Rejected By",
                item.reviewedBy ?? "—",
              ],
              [
                item.status === 2 ? "Approved On" : "Rejected On",
                item.reviewedOn ?? "—",
              ],
            ]
          : []),
      ];
      return (
        <View style={styles.metadata}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.detailStatusBadge,
                {
                  backgroundColor:
                    item.status === 1
                      ? "#FFF0B3"
                      : item.status === 2
                        ? "#E4F3E8"
                        : "#FCE5E5",
                },
              ]}
            >
              <Text
                accessibilityLabel={`Status: ${STATUS[item.status]}`}
                style={[
                  styles.detailStatus,
                  {
                    color:
                      item.status === 1 ? "#805500" : STATUS_COLOR[item.status],
                  },
                ]}
              >
                {STATUS[item.status]}
              </Text>
            </View>
          </View>
          <View style={styles.detailFields}>
            {fields.map(([label, value]) => (
              <View
                key={label}
                style={[styles.detailField, compact && styles.fullField]}
              >
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.metadata}>
        <View style={styles.cardHeading}>
          <Text style={[styles.title, styles.storeTitle]}>{item.store}</Text>
          <View
            style={[
              styles.detailStatusBadge,
              {
                backgroundColor:
                  item.status === 1
                    ? "#FFF0B3"
                    : item.status === 2
                      ? "#E4F3E8"
                      : "#FCE5E5",
              },
            ]}
          >
            <Text
              accessibilityLabel={`Status: ${STATUS[item.status]}`}
              style={[
                styles.detailStatus,
                {
                  color:
                    item.status === 1 ? "#805500" : STATUS_COLOR[item.status],
                },
              ]}
            >
              {item.status === 1 ? "Pending" : STATUS[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.text}>
          {details ? "Festive Date" : "Festive Checklist Date"}:{" "}
          {item.festiveDate}
        </Text>
        <Text style={styles.text}>Created By: {item.createdBy}</Text>
        <Text style={styles.text}>Created On: {item.createdOn}</Text>
        {item.status !== 1 && (
          <>
            <Text style={styles.text}>
              {item.status === 2 ? "Approved" : "Rejected"} By:{" "}
              {item.reviewedBy ?? "—"}
            </Text>
            <Text style={styles.text}>
              {item.status === 2 ? "Approved" : "Rejected"} On:{" "}
              {item.reviewedOn ?? "—"}
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={
        embedded
          ? ["left", "right", "bottom"]
          : ["top", "left", "right", "bottom"]
      }
      style={styles.screen}
    >
      {!embedded && <StatusBar style="dark" />}
      {!embedded ? (
        <AppHeader
          title={selectedId ? "Festive Checklist Details" : "Festive Checklist"}
          onBackPress={
            selectedId
              ? () => {
                  setSelectedId(null);
                  setEditingQuestion(null);
                  setLoadedDetail(null);
                }
              : onBackPress
          }
          rightContent={
            <AppButton
              title="Setting"
              variant="secondary"
              onPress={() => setShowSettings(true)}
            />
          }
        />
      ) : null}
      {error && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          {onRefresh && (
            <AppButton title="Retry" onPress={onRefresh} disabled={loading} />
          )}
        </View>
      )}
      {selectedId ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {selected ? (
            <>
              <View style={styles.card}>{metadata(selected, true)}</View>
              {detailLoading ? (
                <AppLoader message="Loading checklist details…" />
              ) : detailError ? (
                <View style={styles.errorBox}>
                  <Text accessibilityRole="alert" style={styles.error}>
                    {detailError}
                  </Text>
                  <AppButton
                    title="Retry"
                    onPress={() => {
                      void openSubmission(selected.id);
                    }}
                  />
                </View>
              ) : (
                <>
                  {!selected.questions.length && (
                    <Text style={styles.empty}>No question answers found.</Text>
                  )}
                  {questionGroups.map(([group, questions]) => (
                    <View
                      key={group}
                      style={[
                        styles.questionSection,
                        questions.some(
                          (question) => question.id === editingQuestion?.id,
                        ) && styles.openDropdownSection,
                      ]}
                    >
                      <View style={styles.sectionHeading}>
                        <Text
                          accessibilityRole="header"
                          style={styles.fieldLabel}
                        >
                          {group}
                        </Text>
                      </View>
                      {questions.map((question, index) => (
                        <View
                          key={question.id}
                          style={[
                            styles.question,
                            editingQuestion?.id === question.id &&
                              styles.openDropdownQuestion,
                          ]}
                        >
                          <View style={styles.questionHeading}>
                            <Text style={styles.questionNumber}>
                              {index + 1}
                            </Text>
                            <Text style={[styles.text, styles.questionText]}>
                              {question.question}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.answerRow,
                              (width < 340 || fontScale > 1.2) &&
                                styles.answerRowCompact,
                            ]}
                          >
                            <View style={styles.answerValue}>
                              <Text style={styles.answerLabel}>Answer</Text>
                              <Text
                                style={[
                                  styles.status,
                                  {
                                    color:
                                      question.answer === 1
                                        ? COLORS.success
                                        : question.answer === 2
                                          ? COLORS.danger
                                          : COLORS.textLight,
                                  },
                                ]}
                              >
                                {ANSWER[question.answer]}
                              </Text>
                            </View>
                            {selected.status === 1 && onUpdateAnswer && (
                              <View style={styles.answerControl}>
                                <Text style={styles.answerLabel}>
                                  Edit Answer
                                </Text>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityState={{
                                    expanded:
                                      editingQuestion?.id === question.id,
                                    disabled: saving,
                                  }}
                                  accessibilityLabel={`Edit answer for question ${index + 1}: ${question.question}. Current answer: ${ANSWER[question.answer]}`}
                                  style={styles.answerSelect}
                                  disabled={saving}
                                  onPress={() =>
                                    setEditingQuestion((current) =>
                                      current?.id === question.id
                                        ? null
                                        : question,
                                    )
                                  }
                                >
                                  <Text style={styles.text}>
                                    {ANSWER[question.answer]}
                                  </Text>
                                  <Text style={styles.text}>{"\u2304"}</Text>
                                </Pressable>
                                {editingQuestion?.id === question.id && (
                                  <View style={styles.answerOptions}>
                                    {([1, 2, 3] as const).map((answer) => (
                                      <Pressable
                                        key={answer}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                          selected: question.answer === answer,
                                        }}
                                        style={[
                                          styles.answerOption,
                                          question.answer === answer &&
                                            styles.selectedOption,
                                        ]}
                                        onPress={() => {
                                          setEditingQuestion(null);
                                          if (question.answer !== answer)
                                            confirm({
                                              kind: "answer",
                                              id: selected.id,
                                              answerId: question.id,
                                              answer,
                                            });
                                        }}
                                      >
                                        <Text style={styles.text}>
                                          {ANSWER[answer]}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                  {reviewActions(selected)}
                </>
              )}
            </>
          ) : loading ? (
            <AppLoader message="Loading checklist details…" />
          ) : (
            <Text accessibilityRole="alert" style={styles.error}>
              Record not found.
            </Text>
          )}
        </ScrollView>
      ) : (
        <View style={styles.screen}>
          <View style={styles.listControls}>
            <AppInput
              accessibilityLabel="Search festive category"
              placeholder="Search festive category"
              value={search}
              editable={!saving}
              onChangeText={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <Text style={styles.selectorMeta}>
              Swipe left or right to view all columns
            </Text>
            {loading && <AppLoader message="Loading festive checklists..." />}
          </View>
          <View style={styles.tableContainer}>
            <DataTable
              key={currentPage}
              columns={CHECKLIST_COLUMNS}
              rows={pageItems}
              extraData={{ saving }}
              refreshing={loading}
              onRefresh={
                onRefresh
                  ? () => {
                      if (!saving && !loading) onRefresh();
                    }
                  : undefined
              }
              empty={
                loading
                  ? ""
                  : search
                    ? "No matching checklists."
                    : "No festive checklists available."
              }
              renderCells={(item, index) => [
                String((currentPage - 1) * PAGE_SIZE + index + 1),
                item.store,
                item.category,
                reportTableValue("date", item.festiveDate),
                item.createdBy,
                reportTableValue("created_on", item.createdOn),
                item.status !== 1 ? (item.reviewedBy ?? "-") : "-",
                item.status !== 1
                  ? reportTableValue("created_on", item.reviewedOn)
                  : "-",
                <View
                  key="status"
                  style={[
                    styles.detailStatusBadge,
                    {
                      backgroundColor:
                        item.status === 1
                          ? "#FFF0B3"
                          : item.status === 2
                            ? "#E4F3E8"
                            : "#FCE5E5",
                    },
                  ]}
                >
                  <Text
                    accessibilityLabel={`Status: ${STATUS[item.status]}`}
                    style={[
                      styles.detailStatus,
                      {
                        color:
                          item.status === 1
                            ? "#805500"
                            : STATUS_COLOR[item.status],
                      },
                    ]}
                  >
                    {STATUS[item.status]}
                  </Text>
                </View>,
                <AppButton
                  key="view"
                  title="View"
                  variant="secondary"
                  disabled={saving}
                  style={styles.viewButton}
                  textStyle={styles.viewButtonText}
                  accessibilityLabel={`View ${item.category} checklist for ${item.store}`}
                  onPress={() => void openSubmission(item.id)}
                />,
                reviewActions(item) ?? "-",
              ]}
            />
          </View>
          {filtered.length > 0 && (
            <View style={styles.listControls}>
              {pagination(currentPage, pageCount, setPage)}
            </View>
          )}
        </View>
      )}
      <Modal
        animationType="slide"
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <Settings
          onBackPress={() => setShowSettings(false)}
          onOpenCard={{
            "festive-checklist": () => {
              setSelectedId(null);
              setShowSettings(false);
            },
          }}
        />
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(confirmation || notice)}
        onRequestClose={() => {
          if (saveInFlight.current) return;
          setEditingQuestion(null);
          setConfirmation(null);
          setNotice(null);
        }}
      >
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <ScrollView
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
            >
              {notice ? (
                <>
                  <View style={[styles.reviewIcon, styles.successIcon]}>
                    <Text style={styles.successSymbol}>{"\u2713"}</Text>
                  </View>
                  <Text accessibilityRole="header" style={styles.dialogTitle}>
                    {notice.title}
                  </Text>
                  <Text accessibilityRole="alert" style={styles.dialogMessage}>
                    {notice.message}
                  </Text>
                  <AppButton title="OK" onPress={() => setNotice(null)} />
                </>
              ) : confirmation ? (
                <>
                  <View style={styles.reviewIcon}>
                    <Text style={styles.reviewIconText}>!</Text>
                  </View>
                  <Text accessibilityRole="header" style={styles.dialogTitle}>
                    {confirmation.kind === "answer"
                      ? "Update answer?"
                      : confirmation.status === 2
                        ? "Approve checklist?"
                        : "Reject checklist?"}
                  </Text>
                  {confirmationSubmission && (
                    <Text style={styles.dialogMessage}>
                      {confirmationSubmission.store}
                      {"\n"}
                      {confirmationSubmission.category}
                    </Text>
                  )}
                  <Text style={styles.dialogMessage}>
                    {confirmation.kind === "answer"
                      ? `Change this answer to ${ANSWER[confirmation.answer]}?`
                      : `This checklist will be marked as ${confirmation.status === 2 ? "approved" : "rejected"}.`}
                  </Text>
                  {saveError && (
                    <Text accessibilityRole="alert" style={styles.error}>
                      {saveError}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.dialogActions,
                      compact && styles.stackedActions,
                    ]}
                  >
                    <AppButton
                      title={
                        confirmation.kind === "answer"
                          ? "Yes, Update"
                          : confirmation.status === 2
                            ? "Yes, Approve"
                            : "Yes, Reject"
                      }
                      variant={
                        confirmation.kind === "review" &&
                        confirmation.status === 3
                          ? "danger"
                          : "primary"
                      }
                      loading={saving}
                      style={styles.dialogAction}
                      onPress={() => void save()}
                    />
                    <AppButton
                      title="Cancel"
                      variant="outline"
                      disabled={saving}
                      style={styles.dialogAction}
                      onPress={() => setConfirmation(null)}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  listControls: { padding: SPACING.md, gap: SPACING.md },
  viewButton: {
    width: 64,
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
    alignSelf: "center",
  },
  viewButtonText: { fontSize: FONT_SIZE.xs },
  tableContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  selectorSection: { gap: SPACING.sm },
  selectorContent: { gap: SPACING.sm, paddingVertical: 2 },
  selectorCard: {
    width: 250,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  selectedChecklist: {
    borderColor: COLORS.primary,
    backgroundColor: "#FFF7F7",
    borderWidth: 2,
  },
  selectorHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  selectorTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  selectorBadge: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 1,
  },
  selectorMeta: { color: COLORS.textLight, fontSize: FONT_SIZE.sm },
  detailFields: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  statusRow: { flexDirection: "row", justifyContent: "flex-end" },
  detailStatusBadge: {
    flexDirection: "row",
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "100%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailStatus: {
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  detailField: { flexBasis: "46%", flexGrow: 1, gap: 4 },
  fullField: { flexBasis: "100%" },
  fieldLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  fieldValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
    flexShrink: 1,
  },
  questionSection: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  openDropdownSection: { zIndex: 20 },
  openDropdownQuestion: { zIndex: 20 },
  sectionHeading: { padding: SPACING.md, backgroundColor: "#F6F6F6" },
  questionHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  questionNumber: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
    minWidth: 22,
  },
  questionText: { flex: 1 },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingLeft: 30,
  },
  answerRowCompact: { flexDirection: "column", paddingLeft: 0 },
  answerValue: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 4 },
  answerLabel: { color: COLORS.textLight, fontSize: FONT_SIZE.sm },
  answerControl: {
    width: 170,
    maxWidth: "100%",
    flexShrink: 0,
    gap: 4,
    position: "relative",
  },
  answerSelect: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  answerOptions: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  answerOption: {
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: "center",
  },
  selectedOption: { backgroundColor: "#FFF0F0" },
  cardHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  storeTitle: { flex: 1, minWidth: 0 },
  compactHeading: { flexDirection: "column" },
  compactStatus: { maxWidth: "100%", textAlign: "left" },
  cardStatus: { maxWidth: "55%", textAlign: "right" },
  submissionStatus: { alignSelf: "flex-end", textAlign: "right" },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  card: { ...CARD, borderRadius: 12, gap: SPACING.md },
  metadata: { gap: SPACING.sm },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  category: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  text: { color: COLORS.text, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  status: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  question: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  submission: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  reviewAction: { flex: 1, minWidth: 120, minHeight: 44 },
  empty: {
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: SPACING.xxl,
  },
  errorBox: { padding: SPACING.lg, gap: SPACING.sm },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: SPACING.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  dialogContent: { padding: SPACING.lg, gap: SPACING.md },
  dialogTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
  },
  dialogMessage: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    lineHeight: 24,
    textAlign: "center",
  },
  reviewIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#FACEA8",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewIconText: { color: "#D99538", fontSize: 40, lineHeight: 48 },
  successIcon: { borderColor: "#A5DC86" },
  successSymbol: { color: COLORS.success, fontSize: 36, lineHeight: 44 },
  dialogActions: { flexDirection: "row", gap: SPACING.sm },
  stackedActions: { flexDirection: "column" },
  dialogAction: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 48,
    paddingHorizontal: SPACING.sm,
  },
});
