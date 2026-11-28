import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function RecoveryForm({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
});
