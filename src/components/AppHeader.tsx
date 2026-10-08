import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ReactNode } from "react";

import { COLORS, FONT_SIZE, FONT_WEIGHT, HEADER, SPACING } from "@/constants/theme";

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightContent?: ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  onBackPress,
  rightContent,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {onBackPress ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={SPACING.sm}
          onPress={onBackPress}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{"←"}</Text>
        </Pressable>
      ) : null}
      <View style={styles.titleContainer}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightContent}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: HEADER.height,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: HEADER.backgroundColor,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    minWidth: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: HEADER.textColor,
    fontSize: FONT_SIZE.xxl,
    lineHeight: FONT_SIZE.xxl,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: HEADER.textColor,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  subtitle: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    opacity: 0.8,
  },
});

export default AppHeader;
