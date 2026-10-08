// src/constants/theme.ts

export const COLORS = {
  primary: "#380A13",
  primaryLight: "#5A1825",
  primaryDark: "#24060C",

  secondary: "#CD5D67",
  secondaryLight: "#E38A92",
  secondaryDark: "#A9444D",

  white: "#FFFFFF",
  black: "#000000",

  background: "#FFFFFF",
  surface: "#F8F9FA",

  text: "#212529",
  textLight: "#6C757D",
  textWhite: "#FFFFFF",

  border: "#DEE2E6",
  divider: "#E9ECEF",

  success: "#28A745",
  danger: "#DC3545",
  warning: "#FFC107",
  info: "#17A2B8",

  disabled: "#ADB5BD",
  placeholder: "#9CA3AF",

  transparent: "transparent",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 32,
};

export const FONT_WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  round: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  medium: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },

  large: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const INPUT = {
  height: 48,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.white,
  textColor: COLORS.text,
  placeholderColor: COLORS.placeholder,
  borderRadius: RADIUS.md,
  paddingHorizontal: SPACING.lg,
  fontSize: FONT_SIZE.md,
};

export const BUTTON = {
  height: 48,
  borderRadius: RADIUS.md,
  paddingHorizontal: SPACING.lg,
};

export const CARD = {
  backgroundColor: COLORS.white,
  borderRadius: RADIUS.md,
  padding: SPACING.lg,
  borderWidth: 1,
  borderColor: COLORS.border,
};

export const HEADER = {
  backgroundColor: COLORS.primary,
  textColor: COLORS.white,
  height: 56,
};

export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  radius: RADIUS,
  shadows: SHADOWS,
  input: INPUT,
  button: BUTTON,
  card: CARD,
  header: HEADER,
};

export default THEME;
