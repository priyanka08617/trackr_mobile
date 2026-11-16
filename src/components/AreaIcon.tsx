import { COLORS } from "@/constants/theme";
import { FontAwesome5 } from "@expo/vector-icons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform } from "react-native";

const ICONS = {
  dashboard: { ios: "speedometer", fa: "tachometer-alt" },
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
  generator: { ios: "fuelpump.fill", fa: "gas-pump" },
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
  shoppingCart: { ios: "cart", fa: "shopping-cart" },
  archive: { ios: "archivebox", fa: "archive" },
  magic: { ios: "wand.and.stars", fa: "magic" },
  palette: { ios: "paintpalette", fa: "palette" },
  boxOpen: { ios: "shippingbox", fa: "box-open" },
  userTie: { ios: "person.crop.rectangle", fa: "user-tie" },
  gem: { ios: "diamond", fa: "gem" },
  truckLoading: { ios: "truck.box", fa: "truck-loading" },
  utensils: { ios: "fork.knife", fa: "utensils" },
  balanceScaleLeft: { ios: "scalemass", fa: "balance-scale-left" },
  clipboardList: { ios: "list.clipboard", fa: "clipboard-list" },
  truck: { ios: "truck.box", fa: "truck" },
  hourglassHalf: { ios: "hourglass", fa: "hourglass-half" },
  unlink: { ios: "link", fa: "unlink" },
  chartLine: { ios: "chart.xyaxis.line", fa: "chart-line" },
  tag: { ios: "tag", fa: "tag" },
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
