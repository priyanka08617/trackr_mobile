import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { COLORS, FONT_SIZE, FONT_WEIGHT, INPUT, SPACING } from "@/constants/theme";

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({
  label,
  error,
  editable = true,
  style,
  accessibilityLabel,
  ...textInputProps
}: AppInputProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...textInputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        placeholderTextColor={INPUT.placeholderColor}
        style={[
          styles.input,
          !editable && styles.disabled,
          error && styles.invalid,
          style,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  label: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  input: {
    minHeight: INPUT.height,
    borderWidth: INPUT.borderWidth,
    borderColor: INPUT.borderColor,
    borderRadius: INPUT.borderRadius,
    backgroundColor: INPUT.backgroundColor,
    color: INPUT.textColor,
    paddingHorizontal: INPUT.paddingHorizontal,
    fontSize: INPUT.fontSize,
  },
  disabled: {
    backgroundColor: COLORS.surface,
    color: COLORS.textLight,
  },
  invalid: {
    borderColor: COLORS.danger,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.xs,
  },
});

export default AppInput;
