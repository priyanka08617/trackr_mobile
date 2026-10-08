import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS, FONT_SIZE, SPACING } from "@/constants/theme";

export interface AppLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function AppLoader({
  message,
  fullScreen = false,
}: AppLoaderProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator accessibilityLabel={message ?? "Loading"} color={COLORS.primary} size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  message: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
});

export default AppLoader;
