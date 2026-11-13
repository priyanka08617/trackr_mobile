import { AppButton } from "@/components/AppButton";
import { AppLoader } from "@/components/AppLoader";
import { CARD, COLORS, SPACING } from "@/constants/theme";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import DateField from "../../report/screens/DateField";
import SearchSelect from "../../report/screens/SearchSelect";
import {
  planRequest,
  today,
  validDate,
  type Plan,
  type PlanOptions,
  type VisitInput,
} from "../../report/services/service";
import ChecklistDialog, { type ChecklistNotice } from "./ChecklistDialog";
import LocationPicker from "./LocationPicker";

export default function PlanForm({
  plan,
  actual = false,
  onDone,
  onDirtyChange,
  onBusyChange,
}: {
  plan?: Plan;
  actual?: boolean;
  onDone: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [zone, setZone] = useState(actual ? "" : (plan?.zone ?? ""));
  const [region, setRegion] = useState(actual ? "" : (plan?.region ?? ""));
  const [rows, setRows] = useState<(VisitInput & { key: number })[]>([
    {
      key: 0,
      date: actual ? plan?.actualDate || today() : (plan?.date ?? today()),
      locations: actual ? (plan?.actual ?? []) : (plan?.planned ?? []),
    },
  ]);
  const nextKey = useRef(1);
  const [options, setOptions] = useState<PlanOptions>({
    zones: [],
    regions: [],
    options: [],
  });
  const [optionsBusy, setOptionsBusy] = useState(true);
  const [optionsError, setOptionsError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<ChecklistNotice>();
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    let cancelled = false;
    planRequest<PlanOptions>("options", undefined, { zone, region })
      .then((result) => {
        if (cancelled) return;
        if (
          !Array.isArray(result.options) ||
          !Array.isArray(result.zones) ||
          !Array.isArray(result.regions)
        )
          throw new Error("Invalid visit location options.");
        setOptions(result);
        setOptionsError(undefined);
      })
      .catch((cause) => {
        if (!cancelled)
          setOptionsError(
            cause instanceof Error
              ? cause.message
              : "Unable to load locations.",
          );
      })
      .finally(() => {
        if (!cancelled) setOptionsBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [zone, region, retry]);

  function update(key: number, patch: Partial<VisitInput>) {
    setDirty(true);
    setError(undefined);
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }
  function changeFilter(value: string, isZone: boolean) {
    if (isZone) {
      setZone(value);
      setRegion("");
    } else setRegion(value);
    setOptionsBusy(true);
    setDirty(true);
    setRows((current) => current.map((row) => ({ ...row, locations: [] })));
  }
  function requestSave() {
    if (optionsBusy || optionsError) {
      setError("Load visit locations before saving.");
      return;
    }
    if (rows.some((row) => !validDate(row.date) || !row.locations.length)) {
      setError(
        "Enter a valid date (YYYY-MM-DD) and at least one location for every visit.",
      );
      return;
    }
    if (actual && rows.some((row) => row.date < today())) {
      setError(
        "Actual Visit Date must be today or a future date, as in the web form.",
      );
      return;
    }
    const allowed = new Set(options.options.map((option) => option.id));
    if (rows.some((row) => row.locations.some((id) => !allowed.has(id)))) {
      setError(
        "A selected location is no longer available. Please select it again.",
      );
      return;
    }
    setError(undefined);
    setConfirm(true);
  }
  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = actual
        ? await planRequest<{ message: string }>("update", {
            id: plan!.id,
            visit_date: rows[0].date,
            actual_visit_location: rows[0].locations,
          })
        : plan
          ? await planRequest<{ message: string }>("edit", {
              id: plan.id,
              istZone: zone,
              istRegion: region,
              visit_date: rows[0].date,
              istStore: rows[0].locations,
            })
          : await planRequest<{ message: string }>("add", {
              istZone: zone,
              istRegion: region,
              wptp_date: rows.map((row) => row.date),
              istStore: rows.map((row) => row.locations),
            });
      setConfirm(false);
      setDirty(false);
      setNotice({
        kind: "success",
        title: "Saved",
        message: result.message || "Work plan saved successfully.",
      });
    } catch (cause) {
      setConfirm(false);
      setNotice({
        kind: "error",
        title: "Unable to save",
        message: cause instanceof Error ? cause.message : "Please retry.",
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const names = new Map(
    options.options.map((option) => [option.id, option.name]),
  );
  return (
    <View style={styles.container}>
      {(actual || plan) && (
        <Text style={styles.heading}>
          {actual ? "Update Actual Visit" : "Edit Work Plan Travel Plan"}
        </Text>
      )}
      {!actual && (
        <View style={styles.card}>
          <View style={styles.filterRow}>
            <View style={styles.filterColumn}>
              <SearchSelect
                label="Zone"
                value={[zone]}
                options={[
                  { value: "", label: "All" },
                  ...options.zones.map((value) => ({ value, label: value })),
                ]}
                disabled={busy || optionsBusy}
                onChange={(value) => changeFilter(value[0] ?? "", true)}
              />
            </View>
            <View style={styles.filterColumn}>
              <SearchSelect
                label="Region"
                value={[region]}
                options={[
                  { value: "", label: "All" },
                  ...options.regions.map((value) => ({ value, label: value })),
                ]}
                disabled={busy || optionsBusy || !zone}
                onChange={(value) => changeFilter(value[0] ?? "", false)}
              />
            </View>
          </View>
          <Text style={styles.hint}>
            Changing Zone or Region clears selected visit locations.
          </Text>
        </View>
      )}
      {optionsBusy && <AppLoader message="Loading visit locations…" />}
      {optionsError && (
        <View style={styles.container}>
          <Text accessibilityRole="alert" style={styles.error}>
            {optionsError}
          </Text>
          <AppButton
            title="Retry locations"
            onPress={() => {
              setOptionsBusy(true);
              setRetry((value) => value + 1);
            }}
          />
        </View>
      )}
      {rows.map((row, index) => (
        <View key={row.key} style={styles.card}>
          <Text style={styles.heading}>Visit {index + 1}</Text>
          <DateField
            label={actual ? "Actual Visit Date" : "WPTP Date"}
            value={row.date}
            disabled={busy}
            minDate={actual ? today() : undefined}
            onChange={(date) => update(row.key, { date })}
          />
          <LocationPicker
            value={row.locations}
            options={options.options}
            disabled={busy || optionsBusy || Boolean(optionsError)}
            onChange={(locations) => update(row.key, { locations })}
          />
          {!plan && rows.length > 1 && (
            <AppButton
              title="Remove Visit"
              variant="outline"
              disabled={busy}
              onPress={() => {
                setRows((current) =>
                  current.filter((item) => item.key !== row.key),
                );
                setDirty(true);
              }}
            />
          )}
        </View>
      ))}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.actions}>
        <AppButton
          title={plan ? "Update" : "Submit Plan"}
          style={styles.submitButton}
          disabled={busy || optionsBusy || Boolean(optionsError)}
          onPress={requestSave}
        />
        {!plan && (
          <AppButton
            title="+ Add Visit"
            variant="outline"
            style={styles.addVisitButton}
            textStyle={styles.addVisitText}
            disabled={busy}
            onPress={() => {
              const key = nextKey.current++;
              setRows((current) => [
                ...current,
                { key, date: today(), locations: [] },
              ]);
              setDirty(true);
            }}
          />
        )}
      </View>
      <ChecklistDialog
        visible={confirm || Boolean(notice)}
        busy={busy}
        kind={notice?.kind ?? "warning"}
        title={notice?.title ?? "Are you sure?"}
        message={
          notice?.message ??
          `Do you want to ${plan ? "update" : "submit"} this data?\n\n${rows.map((row) => `${row.date}: ${row.locations.map((id) => names.get(id) ?? id).join(", ")}`).join("\n")}`
        }
        confirmText={notice ? "OK" : "Yes, proceed"}
        onConfirm={() => {
          if (notice) {
            const success = notice.kind === "success";
            setNotice(undefined);
            if (success) onDone();
          } else void save();
        }}
        onCancel={
          notice
            ? undefined
            : () => {
                setConfirm(false);
              }
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: SPACING.lg },
  filterRow: { flexDirection: "row", gap: SPACING.md },
  filterColumn: { flex: 1, minWidth: 0 },
  card: {
    ...CARD,
    gap: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { color: COLORS.primary, fontSize: 18, fontWeight: "600" },
  actions: { flexDirection: "row", gap: SPACING.sm },
  submitButton: { flex: 3, minWidth: 0 },
  addVisitButton: { flex: 1, minWidth: 0, paddingHorizontal: SPACING.xs },
  addVisitText: { textAlign: "center" },
  hint: { color: COLORS.textLight, fontSize: 12 },
  error: { color: COLORS.danger },
});
