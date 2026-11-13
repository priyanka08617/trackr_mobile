import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";

export interface ChecklistNotice {
  kind: "success" | "error";
  title: string;
  message: string;
  returnToList?: boolean;
}

export default function ChecklistDialog({
  visible,
  title,
  message,
  kind = "warning",
  confirmText = "OK",
  cancelText = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  kind?: "warning" | "success" | "error";
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const color =
    kind === "success" ? "#A5DC86" : kind === "error" ? "#F27474" : "#FACEA8";
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        if (!busy) onCancel?.();
      }}
    >
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View
              accessible={false}
              style={[styles.icon, { borderColor: color }]}
            >
              <Text style={[styles.symbol, { color }]}>
                {kind === "success" ? "✓" : kind === "error" ? "×" : "!"}
              </Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text
              accessibilityRole={kind === "error" ? "alert" : undefined}
              style={styles.message}
            >
              {message}
            </Text>
            <View style={styles.actions}>
              <AppButton
                title={confirmText}
                loading={busy}
                onPress={onConfirm}
                style={[
                  styles.button,
                  {
                    backgroundColor: destructive ? "#d33" : "#91171f",
                    borderColor: destructive ? "#d33" : "#91171f",
                  },
                ]}
              />
              {onCancel && (
                <AppButton
                  title={cancelText}
                  disabled={busy}
                  onPress={onCancel}
                  style={[styles.button, styles.cancel]}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  content: { padding: SPACING.xl, alignItems: "center", gap: SPACING.lg },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  symbol: { fontSize: 56, lineHeight: 64, fontWeight: "300" },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: "#545454",
    textAlign: "center",
  },
  message: {
    fontSize: FONT_SIZE.md,
    color: "#545454",
    textAlign: "center",
    lineHeight: 24,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
    width: "100%",
  },
  button: { minWidth: 110, minHeight: 46 },
  cancel: { backgroundColor: "#6c757d", borderColor: "#6c757d" },
});
