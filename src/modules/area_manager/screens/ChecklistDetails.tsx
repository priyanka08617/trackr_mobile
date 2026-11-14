import { AppButton } from "@/components/AppButton";
import { AppLoader } from "@/components/AppLoader";
import AreaPage from "@/components/AreaPage";
import {
    CARD,
    COLORS,
    FONT_SIZE,
    FONT_WEIGHT,
    SPACING,
} from "@/constants/theme";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import SelectField from "../../../components/SelectField";
import {
    AreaHeaderBackContext,
    AreaHeaderBackVisibleContext,
} from "../../report/services/AreaHeaderBackContext";
import { useRmChecklistData } from "./DataContext";

export default function ChecklistDetails() {
  const headerBackHandlerRef = useContext(AreaHeaderBackContext);
  const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);
  useEffect(() => {
    if (headerBackHandlerRef)
      headerBackHandlerRef.current = () =>
        router.replace("/area_manager/rm_checklist");
    setHeaderBackVisible(true);
    return () => {
      if (headerBackHandlerRef) headerBackHandlerRef.current = null;
      setHeaderBackVisible(false);
    };
  }, [headerBackHandlerRef, setHeaderBackVisible]);
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const selectedCode = Array.isArray(code) ? code[0] : code;
  const { records, loading, error, onLoadDetails } = useRmChecklistData();
  const hasSelectedRecord = records.some(
    (record) => record.code === selectedCode,
  );
  useEffect(() => {
    if (selectedCode && hasSelectedRecord && onLoadDetails)
      void onLoadDetails(selectedCode);
  }, [selectedCode, hasSelectedRecord, onLoadDetails]);
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const selected = records.find((record) => record.code === selectedCode);
  const pages = Math.max(1, Math.ceil(records.length / 10));
  const current = Math.min(page, pages);
  const pageRecords = records.slice((current - 1) * 10, current * 10);
  const categories = Array.from(
    new Set(selected?.details.map((detail) => detail.category) ?? []),
  ).sort();

  return (
    <AreaPage title="RM Checklist Details">
      <SelectField
        label="Checklist"
        value={selectedCode ?? ""}
        options={pageRecords.map((record) => ({
          value: record.code,
          label: `${record.code} · ${record.store} · ${record.date}`,
        }))}
        onChange={(value) => {
          setCollapsed([]);
          router.setParams({ code: value });
        }}
      />
      {pages > 1 && (
        <View style={styles.pagination}>
          <AppButton
            title="Previous"
            variant="outline"
            disabled={current === 1}
            onPress={() => setPage(current - 1)}
          />
          <Text style={styles.text}>
            {current} / {pages}
          </Text>
          <AppButton
            title="Next"
            variant="outline"
            disabled={current === pages}
            onPress={() => setPage(current + 1)}
          />
        </View>
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {error && selectedCode && onLoadDetails && (
        <AppButton
          title="Retry details"
          onPress={() => void onLoadDetails(selectedCode)}
        />
      )}
      {!selected ? (
        loading ? (
          <AppLoader message="Loading checklist details…" />
        ) : (
          <Text style={styles.empty}>Checklist not found.</Text>
        )
      ) : (
        <>
          <View style={styles.metadata}>
            <View style={styles.headerRow}>
              <Text style={styles.code}>{selected.code}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      selected.status === 2 ? COLORS.success : COLORS.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.status,
                    {
                      color:
                        selected.status === 2 ? COLORS.white : COLORS.black,
                    },
                  ]}
                >
                  {selected.status === 2
                    ? "Completed"
                    : "Waiting For Store Remark"}
                </Text>
              </View>
            </View>
            <Text style={styles.text}>Store: {selected.store}</Text>
            <Text style={styles.text}>RM Name: {selected.manager}</Text>
            <Text style={styles.text}>Date: {selected.date}</Text>
          </View>
          {!selected.detailsLoaded && onLoadDetails && !error ? (
            <AppLoader message="Loading answers…" />
          ) : (
            !selected.details.length && (
              <Text style={styles.empty}>No question answers found.</Text>
            )
          )}
          {categories.map((group) => (
            <View key={group} style={styles.category}>
              <AppButton
                title={`${group} ${collapsed.includes(group) ? "+" : "−"}`}
                style={styles.categoryButton}
                onPress={() =>
                  setCollapsed((previous) =>
                    previous.includes(group)
                      ? previous.filter((item) => item !== group)
                      : [...previous, group],
                  )
                }
              />
              {!collapsed.includes(group) &&
                selected.details
                  .filter((detail) => detail.category === group)
                  .map((detail) => (
                    <View key={detail.questionId} style={styles.question}>
                      <Text style={styles.questionText}>
                        #{selected.details.indexOf(detail) + 1} ·{" "}
                        {detail.question}
                      </Text>
                      <View style={styles.ratingRow}>
                        <Text
                          style={[
                            styles.mark,
                            {
                              color:
                                detail.mark === 0
                                  ? COLORS.danger
                                  : COLORS.success,
                            },
                          ]}
                        >
                          Marks: {detail.mark}
                        </Text>
                        <Text style={styles.text}>Rating: {detail.rating}</Text>
                      </View>
                      <Text style={styles.text}>
                        Why: {detail.reason || "—"}
                      </Text>
                      <Text style={styles.text}>
                        RM Remark: {detail.remark || "—"}
                      </Text>
                      <Text style={styles.text}>
                        Point Status: {detail.pointStatus || "—"}
                      </Text>
                      <Text style={styles.text}>
                        Store Remark: {detail.storeRemark || "—"}
                      </Text>
                    </View>
                  ))}
            </View>
          ))}
        </>
      )}
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  metadata: { ...CARD, borderRadius: 18, gap: SPACING.sm },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  statusBadge: {
    maxWidth: "58%",
    flexShrink: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  code: {
    flex: 1,
    minWidth: 0,
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  text: { color: COLORS.text, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  status: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "center",
  },
  category: { ...CARD, padding: 0, borderRadius: 18, overflow: "hidden" },
  categoryButton: {
    backgroundColor: "#6b161d",
    borderColor: "#6b161d",
    alignItems: "flex-start",
    borderRadius: 0,
  },
  question: {
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  questionText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: 23,
  },
  ratingRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  mark: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  empty: {
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: SPACING.xl,
  },
  error: { color: COLORS.danger },
});
