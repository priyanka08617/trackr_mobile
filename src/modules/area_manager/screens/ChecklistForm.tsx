import { router } from "expo-router";
import { memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { AppLoader } from "@/components/AppLoader";
import {
  CARD,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";
import { useRmChecklistData, type RmChecklistData } from "./DataContext";
import {
  getAnswerError,
  getScore,
  todayForChecklist,
  type RmAnswer,
  type RmDraft,
  type RmQuestion,
} from "../services/model";
import SelectField from "../../report/screens/SelectField";
import ChecklistDialog, { type ChecklistNotice } from "./ChecklistDialog";
import { AreaHeaderActionContext, AreaHeaderBackContext } from "../../report/services/AreaHeaderBackContext";

type FormAction = "submit" | "draft" | "remove" | "leave";
type FilterChange = { kind: "region" | "zone" | "store"; value: string };

export default function ChecklistForm() {
  const data = useRmChecklistData("form");
  if (data.initialized === false) return <View style={styles.content}>
    {data.loading ? <AppLoader message="Loading RM checklist…" /> : <>
      <Text accessibilityRole="alert" style={styles.error}>{data.error}</Text>
      <AppButton title="Retry" onPress={data.onRefresh} />
    </>}
  </View>;
  return <ChecklistFormContent data={data} />;
}

function ChecklistFormContent({ data }: { data: RmChecklistData }) {
  const headerBackHandlerRef = useContext(AreaHeaderBackContext);
  const setHeaderAction = useContext(AreaHeaderActionContext);
  const initialStore = data.stores.find(
    (store) => store.id === data.draft?.storeId,
  );
  const [region, setRegion] = useState(initialStore?.region ?? "");
  const [zone, setZone] = useState(initialStore?.zone ?? "");
  const [storeId, setStoreId] = useState(data.draft?.storeId ?? "");
  const [date] = useState(data.draft?.date ?? todayForChecklist());
  const [answers, setAnswers] = useState<RmAnswer[]>(data.draft?.answers ?? []);
  const [savedAnswers, setSavedAnswers] = useState<RmAnswer[]>(
    data.draft?.answers ?? [],
  );
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [validation, setValidation] = useState(false);
  const [confirmation, setConfirmation] = useState<FormAction | null>(null);
  const [filterChange, setFilterChange] = useState<FilterChange | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<ChecklistNotice>();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const regions = Array.from(
    new Set(data.stores.map((store) => store.region)),
  ).sort();
  const zones = Array.from(
    new Set(
      data.stores
        .filter((store) => !region || store.region === region)
        .map((store) => store.zone),
    ),
  ).sort();
  const stores = data.stores.filter(
    (store) =>
      (!region || store.region === region) && (!zone || store.zone === zone),
  );
  const categories = Array.from(
    new Set(data.questions.map((question) => question.category)),
  ).sort();
  const score = getScore(data.questions, answers);
  const previous = data.previousByStore?.[storeId];
  const onLoadPrevious = data.onLoadPrevious;
  useEffect(() => {
    if (storeId && onLoadPrevious) void onLoadPrevious(storeId);
  }, [storeId, onLoadPrevious]);
  const dirty = JSON.stringify(answers) !== JSON.stringify(savedAnswers);

  function applyFilter(change: FilterChange) {
    if (change.kind === "region") {
      setRegion(change.value);
      setZone("");
      setStoreId("");
    }
    if (change.kind === "zone") {
      setZone(change.value);
      setStoreId("");
    }
    if (change.kind === "store") setStoreId(change.value);
    setAnswers([]);
    setSavedAnswers([]);
    setValidation(false);
    setError(undefined);
    setFilterChange(null);
  }

  function changeFilter(change: FilterChange) {
    const current =
      change.kind === "region"
        ? region
        : change.kind === "zone"
          ? zone
          : storeId;
    if (change.value === current) return;
    if (data.draft?.code) {
      setError("Remove the saved draft before changing its store or filters.");
      return;
    }
    if (answers.length) setFilterChange(change);
    else applyFilter(change);
  }

  const update = useCallback((question: RmQuestion, patch: Partial<RmAnswer>) => {
    setAnswers((current) => {
      const old = current.find((answer) => answer.questionId === question.id) ?? {
        questionId: question.id, rating: "", reason: "", remark: "",
      };
      const next = { ...old, ...patch };
      if (patch.rating !== undefined) { next.reason = ""; next.remark = ""; }
      return [...current.filter((answer) => answer.questionId !== question.id), next];
    });
  }, []);

  const request = useCallback((action: FormAction) => {
    setError(undefined);
    if (action === "leave" && !dirty) {
      router.replace("/area_manager/rm_checklist");
      return;
    }
    if (action === "submit" || action === "draft") {
      setValidation(true);
      if (!storeId || !data.stores.some((store) => store.id === storeId)) {
        setError("Please select a store.");
        return;
      }
      if (!data.questions.length) {
        setError("No check parameters are available yet.");
        return;
      }
      const checked =
        action === "submit"
          ? data.questions
          : data.questions.filter((question) =>
              answers.some((answer) => answer.questionId === question.id),
            );
      if (!checked.length) {
        setError("Complete at least one check parameter.");
        return;
      }
      if (
        checked.some((question) =>
          getAnswerError(
            question,
            answers.find((answer) => answer.questionId === question.id),
          ),
        )
      ) {
        setError("Complete the required rating, reason and remark fields.");
        return;
      }
    }
    setConfirmation(action);
  }, [dirty, storeId, data.stores, data.questions, answers]);

  useEffect(() => {
    if (!headerBackHandlerRef) return;
    headerBackHandlerRef.current = () => {
      if (!busy) request("leave");
    };
    return () => {
      headerBackHandlerRef.current = null;
    };
  }, [headerBackHandlerRef, request, busy]);
  const hasDraft = Boolean(data.draft || savedAnswers.length > 0);
  useEffect(() => {
    setHeaderAction(hasDraft ? <AppButton title="Delete Draft" variant="danger" disabled={busy}
      style={{ minHeight: 44, paddingHorizontal: SPACING.sm }} onPress={() => request("remove")} /> : null);
    return () => setHeaderAction(null);
  }, [setHeaderAction, hasDraft, busy, request]);

  async function perform() {
    if (!confirmation || busy) return;
    if (confirmation === "leave") {
      setConfirmation(null);
      router.replace("/area_manager/rm_checklist");
      return;
    }
    const callback =
      confirmation === "submit"
        ? data.onSubmit
        : confirmation === "draft"
          ? data.onSaveDraft
          : data.onRemoveDraft;
    if (!callback) {
      setError("Saving and submitting RM checklists are not connected yet.");
      return;
    }
    const snapshot: RmDraft = {
      code: data.draft?.storeId === storeId ? data.draft.code : undefined,
      date,
      storeId,
      answers,
    };
    setBusy(true);
    setError(undefined);
    try {
      if (confirmation === "remove") {
        await data.onRemoveDraft?.();
        setAnswers([]);
        setSavedAnswers([]);
        setStoreId("");
        setRegion("");
        setZone("");
        setValidation(false);
      } else {
        if (confirmation === "submit") await data.onSubmit?.(snapshot);
        else await data.onSaveDraft?.(snapshot);
        setSavedAnswers(snapshot.answers);
      }
      const submitted = confirmation === "submit";
      setConfirmation(null);
      setNotice({ kind: "success", title: submitted ? "Submitted" : confirmation === "remove" ? "Removed" : "Saved",
        message: submitted ? "Checklist submitted successfully." : confirmation === "remove" ? "Draft removed successfully." : "Draft saved successfully.", returnToList: submitted });
    } catch (cause) {
      setConfirmation(null);
      setNotice({ kind: "error", title: confirmation === "submit" ? "Submission failed" : confirmation === "remove" ? "Draft not removed" : "Draft not saved",
        message: cause instanceof Error ? cause.message : "Unable to save. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.card}>
            <View style={styles.headerGrid}>
              <View style={styles.field}>
                <AppInput
                  label="Checklist Date"
                  value={date}
                  editable={false}
                />
              </View>
              <View style={styles.field}>
                <SelectField
                  label="Region"
                  value={region}
                  disabled={busy}
                  placeholder="All"
                  options={[
                    { value: "", label: "All" },
                    ...regions.map((value) => ({ value, label: value })),
                  ]}
                  open={openDropdown === "region"}
                  onOpenChange={(open) =>
                    setOpenDropdown(open ? "region" : null)
                  }
                  onChange={(value) => changeFilter({ kind: "region", value })}
                />
              </View>
              <View style={styles.field}>
                <SelectField
                  label="Zone"
                  value={zone}
                  disabled={busy}
                  placeholder="All"
                  options={[
                    { value: "", label: "All" },
                    ...zones.map((value) => ({ value, label: value })),
                  ]}
                  open={openDropdown === "zone"}
                  onOpenChange={(open) => setOpenDropdown(open ? "zone" : null)}
                  onChange={(value) => changeFilter({ kind: "zone", value })}
                />
              </View>
              <View style={styles.field}>
                <SelectField
                  label="Store Name"
                  value={storeId}
                  disabled={busy}
                  options={stores.map((store) => ({
                    value: store.id,
                    label: store.name,
                  }))}
                  open={openDropdown === "store"}
                  onOpenChange={(open) =>
                    setOpenDropdown(open ? "store" : null)
                  }
                  onChange={(value) => changeFilter({ kind: "store", value })}
                />
              </View>
            </View>
            <SelectField
              label="Choose category"
              value={category}
              disabled={busy}
              options={categories.map((value) => ({ value, label: value }))}
              open={openDropdown === "category"}
              onOpenChange={(open) => setOpenDropdown(open ? "category" : null)}
              onChange={(value) => {
                setCategory(value);
                setCollapsed((current) =>
                  current.filter((item) => item !== value),
                );
                setTimeout(
                  () =>
                    scroll.current?.scrollTo({
                      y: positions.current[value] ?? 0,
                      animated: true,
                    }),
                  100,
                );
              }}
            />
          </View>
          {(data.error || (error && !confirmation)) && (
            <Text accessibilityRole="alert" style={styles.error}>
              {data.error ?? error}
            </Text>
          )}
          {!data.questions.length && (
            <Text style={styles.empty}>No check parameters available yet.</Text>
          )}
          {categories.map((group) => (
            <View
              key={group}
              style={styles.category}
              onLayout={({ nativeEvent }) => {
                positions.current[group] = nativeEvent.layout.y;
              }}
            >
              <AppButton
                title={`${group} ${collapsed.includes(group) ? "+" : "−"}`}
                style={styles.categoryButton}
                disabled={busy}
                onPress={() =>
                  setCollapsed((current) =>
                    current.includes(group)
                      ? current.filter((item) => item !== group)
                      : [...current, group],
                  )
                }
              />
              {!collapsed.includes(group) &&
                data.questions
                  .filter((question) => question.category === group)
                  .map((question, index) => <ChecklistQuestionRow
                    key={question.id} question={question} index={index}
                    answer={answers.find((answer) => answer.questionId === question.id)}
                    saved={savedAnswers.find((answer) => answer.questionId === question.id)}
                    previousRating={previous?.ratings[question.id]}
                    storeId={storeId} busy={busy} validation={validation} onUpdate={update}
                  />)}
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.summary}>
            Current: {score.scoring} complied / {score.nonScoring} not complied
          </Text>
          <Text style={styles.previous}>
            Previous:{" "}
            {previous
              ? `${previous.scoring} complied / ${previous.nonScoring} not complied`
              : "—"}
          </Text>
          <View style={styles.footerActions}>
            <View style={styles.primaryActions}>
              <AppButton
                title="Save Draft"
                variant="outline"
                disabled={busy}
                onPress={() => request("draft")}
                style={styles.halfButton}
              />
              <AppButton
                title="Submit Checklist"
                disabled={busy}
                onPress={() => request("submit")}
                style={[styles.halfButton, styles.themeButton]}
              />
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
      <ChecklistDialog visible={Boolean(confirmation || filterChange)} busy={busy}
        title={filterChange ? "Change store selection?" : confirmation === "remove" ? "Remove draft?" : confirmation === "leave" ? "Discard unsaved changes?" : "Are you sure?"}
        message={filterChange ? "Changing Region, Zone or Store clears the answers in this form." : confirmation === "submit" ? "Do you want to submit this checklist?" : confirmation === "draft" ? "Do you want to save this checklist as a draft?" : confirmation === "remove" ? "All of your saved draft checklist data will be deleted." : "Your unsaved changes will be lost."}
        confirmText={filterChange ? "Yes, Change" : confirmation === "submit" ? "Yes, Submit" : confirmation === "draft" ? "Yes, Save" : confirmation === "remove" ? "Yes, Remove" : "Yes, Discard"}
        cancelText={confirmation === "submit" ? "No" : "Cancel"}
        onConfirm={() => { if (filterChange) applyFilter(filterChange); else void perform(); }}
        onCancel={() => { setConfirmation(null); setFilterChange(null); setError(undefined); }} />
      <ChecklistDialog visible={Boolean(notice)} title={notice?.title ?? ""} message={notice?.message ?? ""} kind={notice?.kind}
        onConfirm={() => { const returnToList = notice?.returnToList; setNotice(undefined); if (returnToList) router.replace("/area_manager/rm_checklist"); }} />
    </SafeAreaView>
  );
}

const ChecklistQuestionRow = memo(function ChecklistQuestionRow({
  question, index, answer, saved, previousRating, storeId, busy, validation, onUpdate,
}: {
  question: RmQuestion; index: number; answer?: RmAnswer; saved?: RmAnswer;
  previousRating?: string; storeId: string; busy: boolean; validation: boolean;
  onUpdate: (question: RmQuestion, patch: Partial<RmAnswer>) => void;
}) {
  const reasonRequired = Boolean(answer?.rating && answer.rating === question.chooseCompliance);
  const rowSaved = answer && saved && JSON.stringify(answer) === JSON.stringify(saved);
  return (
                      <View key={question.id} style={styles.question}>
                        <View style={styles.questionTop}>
                          <Text style={styles.number}>#{index + 1}</Text>
                          <Text
                            style={[
                              styles.saveStatus,
                              {
                                color: rowSaved
                                  ? COLORS.success
                                  : COLORS.textLight,
                              },
                            ]}
                          >
                            {rowSaved ? "Saved" : "Not Saved"}
                          </Text>
                        </View>
                        <Text style={styles.parameter}>{question.text}</Text>
                        <SelectField
                          label="Rating" presentation="modal" disabledReason={!storeId ? "Select a store first to choose a rating." : undefined}
                          value={answer?.rating ?? ""}
                          disabled={!storeId || busy}
                          options={question.ratings.map((rating) => ({
                            value: rating.label,
                            label: rating.label,
                          }))}
                          onChange={(rating) => onUpdate(question, { rating })}
                        />
                        {previousRating && (
                          <Text style={styles.previous}>
                            Prev: {previousRating}
                          </Text>
                        )}
                        <SelectField
                          label="Why" presentation="modal" disabledReason={!storeId ? "Select a store first." : !answer?.rating ? "Choose a rating first." : undefined}
                          value={answer?.reason ?? ""}
                          disabled={!reasonRequired || busy}
                          placeholder={
                            reasonRequired ? "Select Reason" : "No Reason"
                          }
                          options={question.reasons.map((reason) => ({
                            value: reason,
                            label: reason,
                          }))}
                          onChange={(reason) => onUpdate(question, { reason })}
                        />
                        <AppInput
                          label="Remark"
                          multiline
                          numberOfLines={3}
                          value={answer?.remark ?? ""}
                          editable={reasonRequired && !busy}
                          style={styles.remark}
                          onChangeText={(remark) =>
                            onUpdate(question, { remark })
                          }
                        />
                        {reasonRequired && (
                          <Text style={styles.hint}>
                            {answer?.remark.trim().length ?? 0} / 60 characters
                            minimum
                          </Text>
                        )}
                        {validation && getAnswerError(question, answer) && (
                          <Text accessibilityRole="alert" style={styles.error}>
                            {getAnswerError(question, answer)}
                          </Text>
                        )}
                      </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 20, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  card: { ...CARD, borderRadius: 18, gap: SPACING.md },
  headerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: SPACING.md,
  },
  field: { width: "48%", minWidth: 0 },
  category: { ...CARD, padding: 0, borderRadius: 18, overflow: "hidden" },
  categoryButton: {
    backgroundColor: "#6b161d",
    borderColor: "#6b161d",
    borderRadius: 0,
    alignItems: "flex-start",
  },
  question: {
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  questionTop: { flexDirection: "row", justifyContent: "space-between" },
  number: { color: COLORS.textLight, fontWeight: FONT_WEIGHT.semibold },
  parameter: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: 23,
  },
  text: { color: COLORS.text, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  saveStatus: { fontSize: FONT_SIZE.xs },
  remark: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingVertical: SPACING.sm,
  },
  hint: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  previous: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  footer: {
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  summary: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  footerActions: { gap: SPACING.sm },
  primaryActions: { flexDirection: "row", gap: SPACING.sm },
  halfButton: { flex: 1, minWidth: 0, paddingHorizontal: SPACING.sm },
  deleteButton: { width: "100%" },
  themeButton: { backgroundColor: "#91171f", borderColor: "#91171f" },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  empty: {
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: SPACING.xl,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  dialog: { ...CARD, width: "100%", maxWidth: 440, gap: SPACING.lg },
});
