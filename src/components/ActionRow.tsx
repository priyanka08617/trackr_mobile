import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "./AppButton";
import AreaIcon, { type AreaIconName } from "./AreaIcon";

export default function ActionRow({
  title,
  icon,
  onPress,
  active = false,
  dark = false,
}: {
  title: string;
  icon: AreaIconName;
  onPress: () => void;
  active?: boolean;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.drawerButton,
          active && styles.darkActive,
          pressed && styles.drawerPressed,
        ]}
      >
        <AreaIcon name={icon} color={COLORS.white} size={21} />
        <Text
          style={[
            styles.label,
            styles.darkLabel,
            active && styles.selectedLabel,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    );
  }

  return (
    <View>
      <AppButton
        title={title}
        accessibilityLabel={title}
        onPress={onPress}
        style={[styles.button, active && styles.active]}
        textStyle={styles.label}
      />
      <View pointerEvents="none" style={styles.icon}>
        <AreaIcon name={icon} color={COLORS.primary} size={22} />
      </View>
      <View pointerEvents="none" style={styles.arrow}>
        <AreaIcon name="chevron" color={COLORS.textLight} size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    paddingVertical: SPACING.md,
    paddingLeft: 56,
    paddingRight: 36,
    alignItems: "flex-start",
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  active: { backgroundColor: COLORS.surface, borderColor: COLORS.primary },
  drawerButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  darkActive: { backgroundColor: COLORS.primaryLight },
  drawerPressed: { backgroundColor: "rgba(255,255,255,0.16)" },
  darkLabel: { color: COLORS.white },
  selectedLabel: { fontWeight: FONT_WEIGHT.bold },
  label: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: "left",
  },
  icon: {
    position: "absolute",
    left: 18,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  arrow: {
    position: "absolute",
    right: SPACING.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
