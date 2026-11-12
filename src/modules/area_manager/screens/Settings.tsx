import { StatusBar } from "expo-status-bar";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// import { AppButton } from "../src/components/AppButton";
// import { COLORS, SPACING } from "../src/constants/theme";
// import ActionCard from "./ActionCard";
// import type { AreaIconName } from "./AreaIcon";

import { AppButton } from "@/components/AppButton";
import { COLORS, SPACING } from "@/constants/theme";
// import ActionCard from "../components/ActionCard";
// import type { AreaIconName } from "../components/AreaIcon";

// Keep the order and labels from area_manager/views/setting.php.
export const SETTINGS_CARDS = [
  {
    id: "void-list",
    title: "All Void List",
    source: "all_void_register_am.php",
  },
  {
    id: "festive-checklist",
    title: "Festive Checklist",
    source: "festive_checklist_for_store_approval.php",
  },
  { id: "wptp", title: "WPTP", source: "work_plan_travel_plan.php" },
  {
    id: "rm-checklist",
    title: "RM Checklist",
    source: "rm_checklist_view.php",
  },
  {
    id: "monthly-lp",
    title: "Monthly LP Global Count",
    source: "monthly_lp_global_count_report.php",
  },
  { id: "fascia-plan", title: "Fascia Plan", source: "fascia_plan_rm.php" },
  {
    id: "fascia-report",
    title: "Fascia Report",
    source: "fascia_plan_report_rm.php",
  },
  {
    id: "ho-checklist",
    title: "Ho Checklist",
    source: "ho_checklist_approval.php",
  },
] as const;

export type SettingsCardId = (typeof SETTINGS_CARDS)[number]["id"];

// const CARD_ICONS: Record<SettingsCardId, AreaIconName> = {
//   "void-list": "ban",
//   "festive-checklist": "gift",
//   wptp: "calendar",
//   "rm-checklist": "clipboard",
//   "monthly-lp": "globe",
//   "fascia-plan": "plan",
//   "fascia-report": "report",
//   "ho-checklist": "check",
// };

export interface SettingsProps {
  embedded?: boolean;
  onBackPress?: () => void;
  onOpenCard?: Partial<Record<SettingsCardId, () => void>>;
}

export default function Settings({
  onBackPress,
  onOpenCard,
  embedded = false,
}: SettingsProps) {
  function openCard(card: (typeof SETTINGS_CARDS)[number]) {
    const open = onOpenCard?.[card.id];
    if (open) {
      open();
      return;
    }
    Alert.alert(
      card.title,
      "This page has not been connected in the mobile app yet.",
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
      <FlatList
        data={SETTINGS_CARDS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          onBackPress ? (
            <AppButton
              title="Back"
              variant="outline"
              onPress={onBackPress}
              style={styles.back}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            {/* <ActionCard
              filled
              title={item.title}
              icon={CARD_ICONS[item.id]}
              onPress={() => openCard(item)}
            /> */}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  grid: { padding: 20, gap: SPACING.md, paddingBottom: SPACING.xxl },
  row: { gap: SPACING.md },
  cell: { flex: 1, minWidth: 0 },
  back: { alignSelf: "flex-start", minHeight: 44 },
});
