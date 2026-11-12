import { COLORS } from "@/constants/theme";
import { FontAwesome5 } from "@expo/vector-icons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform } from "react-native";

const ICONS = {
  dashboard: { ios: "square.grid.2x2", fa: "th-large" },
  home: { ios: "house", fa: "home" },
  setting: { ios: "gearshape", fa: "cog" },
  faq: { ios: "questionmark.circle", fa: "question-circle" },
  report: { ios: "chart.bar", fa: "chart-bar" },
  gift: { ios: "gift", fa: "gift" },
  store: { ios: "building.2", fa: "store" },
  clock: { ios: "clock", fa: "clock" },
  check: { ios: "checkmark.circle", fa: "check-circle" },
  cancel: { ios: "xmark.circle", fa: "times-circle" },
  calendar: { ios: "calendar", fa: "calendar-alt" },
  edit: { ios: "square.and.pencil", fa: "edit" },
  clipboard: { ios: "checklist", fa: "clipboard-check" },
  globe: { ios: "globe", fa: "globe" },
  plan: { ios: "doc.text", fa: "file-alt" },
  library: { ios: "books.vertical", fa: "book" },
  bank: { ios: "building.2", fa: "university" },
  ban: { ios: "nosign", fa: "ban" },
  menu: { ios: "line.3.horizontal", fa: "bars" },
  logout: { ios: "rectangle.portrait.and.arrow.right", fa: "sign-out-alt" },
  chevron: { ios: "chevron.right", fa: "chevron-right" },
  close: { ios: "xmark", fa: "times" },
  back: { ios: "arrow.left", fa: "arrow-left" },
} satisfies Record<string, { ios: SymbolViewProps["name"]; fa: string }>;

export type AreaIconName = keyof typeof ICONS;

export default function AreaIcon({
  name,
  color = COLORS.primary,
  size = 24,
}: {
  name: AreaIconName;
  color?: string;
  size?: number;
}) {
  const map = ICONS[name];

  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={map.ios}
        tintColor={color}
        size={size}
        accessible={false}
      />
    );
  }

  return <FontAwesome5 name={map.fa as any} size={size} color={color} solid />;
}
