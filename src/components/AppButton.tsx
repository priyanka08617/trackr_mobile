import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    type PressableProps,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from "react-native";

import { BUTTON, COLORS } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

export interface AppButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    textColor: COLORS.white,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
    textColor: COLORS.white,
  },
  outline: {
    backgroundColor: COLORS.transparent,
    borderColor: COLORS.primary,
    textColor: COLORS.primary,
  },
  danger: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
    textColor: COLORS.white,
  },
};

export function AppButton({
  title,
  variant = "primary",
  loading = false,
  disabled = false,
  textStyle,
  style,
  accessibilityRole = "button",
  ...pressableProps
}: AppButtonProps) {
  const colors = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          // opacity: isDisabled ? 0.6 : pressed ? 0.8 : 1,
          opacity: isDisabled ? BUTTON.disabledOpacity : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textColor} />
      ) : (
        <Text style={[styles.text, { color: colors.textColor }, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: BUTTON.height,
    borderWidth: 1,
    borderRadius: BUTTON.borderRadius,
    paddingHorizontal: BUTTON.paddingHorizontal,
    alignItems: "center",
    justifyContent: "center",
  },
  // text: {
  //   fontSize: FONT_SIZE.md,
  //   fontWeight: FONT_WEIGHT.semibold,
  // },

  text: {
    fontSize: BUTTON.fontSize,
    fontWeight: BUTTON.fontWeight,
  },
});

export default AppButton;
