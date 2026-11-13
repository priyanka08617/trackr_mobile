import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  loadFestiveSubmissionDetails,
  loadFestiveSubmissions,
  reviewFestiveSubmission,
  updateFestiveAnswer,
} from "../services/FestiveChecklistService";
import FestiveChecklist, { type FestiveSubmission } from "./FestiveChecklist";

export default function FestiveRoute() {
  const [submissions, setSubmissions] = useState<FestiveSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setSubmissions(await loadFestiveSubmissions());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load festive checklists.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadFestiveSubmissions()
      .then((records) => {
        if (active) setSubmissions(records);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load festive checklists.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <FestiveChecklist
      embedded
      submissions={submissions}
      loading={loading}
      error={error}
      onRefresh={() => void refresh()}
      onLoadDetails={loadFestiveSubmissionDetails}
      onReview={async (id, status) => {
        await reviewFestiveSubmission(id, status);
        await refresh();
      }}
      onUpdateAnswer={updateFestiveAnswer}
      onBackPress={() =>
        router.replace("/area_manager/all_register")
      }
    />
  );
}
