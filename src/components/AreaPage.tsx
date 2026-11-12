import { COLORS, SPACING } from "@/constants/theme";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AreaPage({
  title,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <ScrollView
        accessibilityLabel={title}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 20, gap: 20, paddingBottom: SPACING.xxl },
});
