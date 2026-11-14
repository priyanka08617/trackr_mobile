import { StatusBar } from "expo-status-bar";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ActionCard from "@/components/ActionCard";
import { AppButton } from "@/components/AppButton";
import type { AreaIconName } from "@/components/AreaIcon";
import { COLORS, SPACING } from "@/constants/theme";
import { router, type Href } from "expo-router";

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
  {
    id: "wptp",
    title: "WPTP",
    source: "work_plan_travel_plan.php",
  },

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

const SETTINGS_ROUTES: Partial<Record<SettingsCardId, Href>> = {
  "void-list": "/area_manager/all_void",
  "festive-checklist": "/area_manager/festive_checklist",
  wptp: "/area_manager/work_plan_travel_plan",
  "rm-checklist": "/area_manager/rm_checklist",
  "monthly-lp": "/common/monthly_lp_global_count",
  "fascia-plan": "/area_manager/fascia_plan",
  "fascia-report": "/common/fascia_report",
  "ho-checklist": "/area_manager/ho_checklist",
};

const CARD_ICONS: Record<SettingsCardId, AreaIconName> = {
  "void-list": "ban",
  "festive-checklist": "gift",
  wptp: "calendar",
  "rm-checklist": "clipboard",
  "monthly-lp": "globe",
  "fascia-plan": "plan",
  "fascia-report": "report",
  "ho-checklist": "check",
};

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
    const customOpen = onOpenCard?.[card.id];

    if (customOpen) {
      customOpen();
      return;
    }

    const route = SETTINGS_ROUTES[card.id];

    if (route) {
      router.push(route);
      return;
    }

    Alert.alert(card.title, "This page is not available yet.");
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
            <ActionCard
              filled
              title={item.title}
              icon={CARD_ICONS[item.id]}
              onPress={() => openCard(item)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  grid: { padding: 10, gap: SPACING.md, paddingBottom: SPACING.md },
  row: { gap: SPACING.md },
  cell: { flex: 1, minWidth: 0 },
  back: { alignSelf: "flex-start", minHeight: 20 },
});

// ====================existing for backup=====

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: COLORS.surface },
//   grid: { padding: 20, gap: SPACING.md, paddingBottom: SPACING.xxl },
//   row: { gap: SPACING.md },
//   cell: { flex: 1, minWidth: 0 },
//   back: { alignSelf: "flex-start", minHeight: 44 },
// });
