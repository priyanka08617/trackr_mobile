import { COLORS, SPACING } from "@/constants/theme";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AreaPage({
  title,
  children,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <ScrollView
        accessibilityLabel={title}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          compact && styles.compactContent,
        ]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 20, gap: 20, paddingBottom: SPACING.xxl },
  compactContent: { paddingHorizontal: 9, paddingTop: 9 },
});
