import ActionRow from "@/components/ActionRow";
import { AppButton } from "@/components/AppButton";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import AreaPage from "@/components/AreaPage";

import SelectField, { type SelectOption } from "@/components/SelectField";
import { loadLocationFilterOptions } from "@/modules/report/services/locationFilters";


import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useState,   } from "react";
import {  Modal,  ScrollView, StyleSheet, Text, View } from "react-native";
import DateField from "../../../components/DateField";
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
  onDownload: (
    report: string, 
    start: string, 
    end: string,
      region: string,
    zone: string,
  ) => Promise<void>;
}) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const goToDashboard = useCallback(
    () => router.replace("/common/home"),
    [],
  );
  const [selected, setSelected] = useState<(typeof REPORTS)[number] | null>(
    null,
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);


// =================================================
   useEffect(() => {
      if (!selected) return;
    let active = true;
    loadLocationFilterOptions(region, zone) 
      .then((options) => {
        if (!active) return;
        setRegionOptions(options.regions.map((value) => ({ value, label: value })));
        setZoneOptions(options.zones.map((value) => ({ value, label: value })));
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load region and zone filters.",
          );
      });
    return () => {
      active = false;
    };
  }, [selected,region, zone]);


// =================================================
  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = goToDashboard;
    setBackVisible(true);
    return () => {
      if (backHandlerRef?.current === goToDashboard)
        backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, goToDashboard, setBackVisible]);

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
      // await onDownload(selected[0], start, end);
      await onDownload(selected[0], start, end, region, zone);
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

  // return (
    // <AreaPage title="Report">
    //   <Text style={styles.note}>
    //     Choose a report and a date range of up to 31 days.
    //   </Text>
    //   {REPORTS.map((report) => (
    //     <ActionRow
    //       key={report[0]}
    //       title={report[1]}
    //       icon="report"
    //       onPress={() => {
    //         setError(undefined);
    //         setStart("");
    //         setEnd("");
    //         setSelected(report);
    //       }}
    //     />
    //   ))}
    //   <Modal
    //     transparent
    //     animationType="fade"
    //     visible={Boolean(selected)}
    //     onRequestClose={() => {
    //       if (!busy) setSelected(null);
    //     }}
    //   >
    //     <SafeAreaView style={styles.overlay}>
    //       <KeyboardAvoidingView
    //         style={styles.modalKeyboard}
    //         behavior={Platform.OS === "ios" ? "padding" : undefined}
    //       >
    //         <ScrollView
    //           keyboardShouldPersistTaps="handled"
    //           contentContainerStyle={styles.modalScroll}
    //         >
    //           <View accessibilityViewIsModal style={styles.dialog}>
    //             <Text style={styles.dialogTitle}>{selected?.[1]}</Text>
    //             <DateField
    //               maxDate={today()}
    //               label="From date"
    //               value={start}
    //               onChange={(value) => {
    //                 setStart(value);
    //                 if (parseDate(value) !== null) setEnd(value);
    //               }}
    //               disabled={busy}
    //             />
    //             <DateField
    //               maxDate={today()}
    //               label="To date"
    //               value={end}
    //               onChange={setEnd}
    //               disabled={busy}
    //               minDate={start || undefined}
    //             />
    //             {!!error && (
    //               <Text accessibilityRole="alert" style={styles.error}>
    //                 {error}
    //               </Text>
    //             )}
    //             <View style={styles.actions}>
    //               <AppButton
    //                 title="Cancel"
    //                 variant="outline"
    //                 disabled={busy}
    //                 onPress={() => setSelected(null)}
    //                 style={styles.actionButton}
    //               />
    //               <AppButton
    //                 title="Download CSV"
    //                 loading={busy}
    //                 onPress={() => void download()}
    //                 style={styles.actionButton}
    //               />
    //             </View>
    //           </View>
    //         </ScrollView>
    //       </KeyboardAvoidingView>
    //     </SafeAreaView>
    //   </Modal>
    // </AreaPage>
  // );

  // ==============================================

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
            setRegion("");
            setZone("");
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
              <View style={styles.filterRow}>
                <View style={styles.filterColumn}>
                  <SelectField
                    label="Zone"
                    value={zone}
                    options={[
                      { value: "", label: "All zones" },
                      ...zoneOptions,
                    ]}
                    placeholder="Select zone"
                    onChange={(value) => {
                      setZone(value);
                      setRegion("");
                    }}
                    disabled={busy}
                  />
                </View>
                <View style={styles.filterColumn}>
                  <SelectField
                    label="Region"
                    value={region}
                    options={[
                      { value: "", label: "All regions" },
                      ...regionOptions,
                    ]}
                    placeholder="Select region"
                    onChange={setRegion}
                    disabled={busy}
                  />
                </View>
              </View>
              <View style={styles.filterRow}>
                <View style={styles.filterColumn}>
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
                </View>
                <View style={styles.filterColumn}>
                  <DateField
                    maxDate={today()}
                    label="To date"
                    value={end}
                    onChange={setEnd}
                    disabled={busy}
                    minDate={start || undefined}
                  />
                </View>
              </View>
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


  // ==================================================
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
  modalKeyboard: { flex: 1, padding: SPACING.lg },
  modalScroll: { flexGrow: 1, justifyContent: "center" },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  filterRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  filterColumn: { flex: 1, minWidth: 0 },
  // ===========================================
  dialogTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  actionButton: { flex: 1 },
});
