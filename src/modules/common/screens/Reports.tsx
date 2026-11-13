import ActionRow from "@/components/ActionRow";
import { AppButton } from "@/components/AppButton";
import AreaPage from "@/components/AreaPage";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import DateField from "../../report/screens/DateField";
import { today } from "../../report/services/service";

export const REPORTS = [
  ["alteration_report", "Alteration Report"],
  ["footfall_report", "Footfall Report"],
  ["exchange_report", "Exchange Report"],
  ["generator_report", "Generator Report"],
  ["grc_report", "GRC Report"],
  ["local_procurement", "Local Procurement Report"],
  ["key_report", "Key Movement Report"],
  ["lost_found_report", "Lost & Found Report"],
  ["scrap_records_report", "Scrap Report"],
  ["hk_sg_report", "HK & SG Report"],
  ["visitor_report", "Visitor Report"],
  ["electricity_report", "Electricity Report"],
  ["grt_report", "GRT Report"],
  ["pi_report", "PI Report"],
  ["dsd_inward_report", "DSD Inward Report"],
  ["global_count_report", "Global Count Report"],
  ["rm_checklist_report", "RM Checklist Report"],
] as const;

function parseDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}

export default function Reports({
  onDownload,
}: {
  onDownload: (report: string, start: string, end: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<(typeof REPORTS)[number] | null>(
    null,
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!selected || busy) return;
    const from = parseDate(start);
    const to = parseDate(end);
    if (from === null || to === null) {
      setError("Enter valid dates using YYYY-MM-DD.");
      return;
    }
    if (end > today() || to < from || (to - from) / 86400000 + 1 > 31) {
      setError(
        "Select a date range of up to 31 days, with the end on or after the start.",
      );
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onDownload(selected[0], start, end);
      setSelected(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to download this report.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AreaPage title="Report">
      <Text style={styles.note}>
        Choose a report and a date range of up to 31 days.
      </Text>
      {REPORTS.map((report) => (
        <ActionRow
          key={report[0]}
          title={report[1]}
          icon="report"
          onPress={() => {
            setError(undefined);
            setStart("");
            setEnd("");
            setSelected(report);
          }}
        />
      ))}
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(selected)}
        onRequestClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        <View style={styles.overlay}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            <View accessibilityViewIsModal style={styles.dialog}>
              <Text style={styles.dialogTitle}>{selected?.[1]}</Text>
              <DateField
                maxDate={today()}
                label="From date"
                value={start}
                onChange={(value) => {
                  setStart(value);
                  if (parseDate(value) !== null) setEnd(value);
                }}
                disabled={busy}
              />
              <DateField
                maxDate={today()}
                label="To date"
                value={end}
                onChange={setEnd}
                disabled={busy}
                minDate={start || undefined}
              />
              {!!error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              <View style={styles.actions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  disabled={busy}
                  onPress={() => setSelected(null)}
                  style={styles.actionButton}
                />
                <AppButton
                  title="Download CSV"
                  loading={busy}
                  onPress={() => void download()}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  note: { color: COLORS.textLight, fontSize: FONT_SIZE.sm },
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: SPACING.lg,
  },
  modalScroll: { flexGrow: 1, justifyContent: "center" },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  dialogTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  actionButton: { flex: 1 },
});
