import { useCallback, useEffect, useRef, useState } from "react";
import type { RmChecklistData } from "./DataContext";
import {
  loadRmDetails,
  loadRmDraft,
  loadRmQuestions,
  loadRmRecords,
  loadRmStores,
  rmRequest,
  saveRmDraft,
} from "../services/ChecklistService";
import { getAnswerError, type RmDraft } from "../services/model";

export function useRmChecklistData(
  mode: "records" | "form" = "records",
): RmChecklistData {
  const [data, setData] = useState<RmChecklistData>({
    records: [],
    stores: [],
    questions: [],
  });
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const draftRef = useRef<RmDraft | undefined>(undefined);
  const mutation = useRef(false);
  const pendingDetails = useRef(new Map<string, Promise<void>>());
  const active = useRef(true);

  const refresh = useCallback(() => {
    return Promise.allSettled([
      mode === "records" ? loadRmRecords() : Promise.resolve([]),
      mode === "form" ? loadRmStores() : Promise.resolve([]),
      mode === "form" ? loadRmQuestions() : Promise.resolve([]),
      mode === "form" ? loadRmDraft() : Promise.resolve(undefined),
    ])
      .then(([records, stores, questions, draft]) => {
        if (!active.current) return;
        const failed = [records, stores, questions, draft].find(
          (result) => result.status === "rejected",
        );
        setError(
          failed?.status === "rejected"
            ? failed.reason instanceof Error
              ? failed.reason.message
              : "Unable to load RM checklists."
            : undefined,
        );
        if (draft.status === "fulfilled") draftRef.current = draft.value;
        setData((current) => ({
          ...current,
          records:
            records.status === "fulfilled"
              ? records.value.map((record) => {
                  const existing = current.records.find(
                    (item) => item.code === record.code,
                  );
                  return existing?.detailsLoaded
                    ? {
                        ...record,
                        details: existing.details,
                        detailsLoaded: true,
                      }
                    : record;
                })
              : current.records,
          stores: stores.status === "fulfilled" ? stores.value : current.stores,
          questions:
            questions.status === "fulfilled"
              ? questions.value
              : current.questions,
          draft: draft.status === "fulfilled" ? draft.value : current.draft,
        }));
        setReady(
          mode === "records"
            ? records.status === "fulfilled"
            : stores.status === "fulfilled" &&
                questions.status === "fulfilled" &&
                draft.status === "fulfilled",
        );
      })
      .catch((cause) => {
        if (active.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load RM checklists.",
          );
      })
      .finally(() => {
        if (active.current) setLoading(false);
      });
  }, [mode]);

  useEffect(() => {
    active.current = true;
    void refresh();
    return () => {
      active.current = false;
    };
  }, [refresh]);

  const onLoadDetails = useCallback((code: string) => {
    const pending = pendingDetails.current.get(code);
    if (pending) return pending;
    const task = loadRmDetails(code)
      .then((details) => {
        if (active.current) {
          setError(undefined);
          setData((current) => ({
            ...current,
            records: current.records.map((record) =>
              record.code === code
                ? { ...record, details, detailsLoaded: true }
                : record,
            ),
          }));
        }
      })
      .catch((cause) => {
        if (active.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load checklist details.",
          );
      })
      .finally(() => pendingDetails.current.delete(code));
    pendingDetails.current.set(code, task);
    return task;
  }, []);

  const onLoadPrevious = useCallback(async (storeId: string) => {
    try {
      const result = await rmRequest<{
        previous:
          | NonNullable<RmChecklistData["previousByStore"]>[string]
          | null;
      }>("rm_checklist_previous.php", undefined, { store_id: storeId });
      if (active.current && result.previous)
        setData((current) => ({
          ...current,
          previousByStore: {
            ...current.previousByStore,
            [storeId]: result.previous!,
          },
        }));
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load previous checklist results.",
        );
    }
  }, []);

  function progress(draft: RmDraft) {
    draftRef.current = draft;
    if (active.current) setData((current) => ({ ...current, draft }));
  }

  async function mutate(action: () => Promise<void>) {
    if (mutation.current)
      throw new Error("An RM checklist action is already in progress.");
    mutation.current = true;
    setError(undefined);
    try {
      await action();
    } finally {
      mutation.current = false;
    }
  }

  async function persist(snapshot: RmDraft, submit: boolean) {
    if (!data.stores.some((store) => store.id === snapshot.storeId))
      throw new Error("Select an assigned store.");
    const questions = submit
      ? data.questions
      : data.questions.filter((question) =>
          snapshot.answers.some((answer) => answer.questionId === question.id),
        );
    if (
      !questions.length ||
      questions.some((question) =>
        getAnswerError(
          question,
          snapshot.answers.find((answer) => answer.questionId === question.id),
        ),
      )
    )
      throw new Error(
        "Complete the required rating, reason and remark fields.",
      );
    const existing = draftRef.current;
    if (
      existing &&
      (existing.storeId !== snapshot.storeId || existing.date !== snapshot.date)
    )
      throw new Error(
        "Remove the saved draft before starting a checklist for another store or date.",
      );
    const saved = await saveRmDraft(
      { ...snapshot, code: existing?.code ?? snapshot.code },
      progress,
    );
    progress(saved);
    if (submit) {
      await rmRequest("rm_checklist_submit.php", {
        checklist_code: saved.code,
      });
      draftRef.current = undefined;
      setData((current) => ({ ...current, draft: undefined }));
      await refresh();
    }
  }

  // Each screen owns its data and loads it when mounted.
  return {
    ...data,
    initialized: ready,
    loading,
    error,
    onRefresh: () => {
      if (!mutation.current) {
        setLoading(true);
        setError(undefined);
        void refresh();
      }
    },
    onLoadDetails,
    onLoadPrevious,
    onSaveDraft: (draft) => mutate(() => persist(draft, false)),
    onSubmit: (draft) => mutate(() => persist(draft, true)),
    onRemoveDraft: () =>
      mutate(async () => {
        await rmRequest("rm_checklist_remove_draft.php", {});
        draftRef.current = undefined;
        setData((current) => ({ ...current, draft: undefined }));
      }),
    onDelete: (code) =>
      mutate(async () => {
        await rmRequest("rm_checklist_delete.php", { checklist_code: code });
        setData((current) => ({
          ...current,
          records: current.records.filter((record) => record.code !== code),
        }));
      }),
  };
}
