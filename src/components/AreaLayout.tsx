import { Image } from "expo-image";
import { Slot, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CARD,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "../constants/theme";
import { clearAuthToken } from "../storage/authStorage";
import { clearUser } from "../storage/userStorage";
import { AppButton } from "./AppButton";
import {
  AreaHeaderActionContext,
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "./AreaHeaderBackContext";
import AreaIcon from "./AreaIcon";
// Add completed modules here; different categories can use separate lists later.
// export const AREA_NAVIGATION = [
//   { title: "Home", href: "/common/home", icon: "home" },
//   {
//     title: "Escalation Matrix",
//     href: "/common/escalation_matrix",
//     icon: "report",
//   },
// ] as const;

export const AREA_NAVIGATION = [
  { title: "Dashboard", href: "/common/dashboard", icon: "dashboard" },
  { title: "Home", href: "/common/home", icon: "home" },
  { title: "Settings", href: "/area_manager/settings", icon: "setting" },
  // { title: "Company FAQs", href: "/areamanger/company-faq", icon: "faq" },
  { title: "Report", href: "/common/dump_report", icon: "report" },
] as const;

// const PAGE_TITLES: Record<string, string> = {
//   "/common/home": "Home",
//   "/common/escalation_matrix": "Escalation Matrix",
// };

const PAGE_TITLES: Record<string, string> = {
  // "/area_manager": "Dashboard",
  "/common/dashboard": "Dashboard",
  "/common/home": "Home",
  "/area_manager/setting": "Settings",
  // "/areamanger/company-faq": "Company FAQs",
  "/common/dump_report": "Reports",
  // "/areamanger/all-portals": "All Portals Library",
  // "/areamanger/report-bank": "Reports Bank",
  // "/areamanger/festive-checklist": "Festive Checklist",
  // "/areamanger/festive-report": "Festive Checklist",
  // "/areamanger/work-plan-travel-plan": "Work Plan / Travel Plan",
  // "/areamanger/rm-checklist": "RM Checklist",
  // "/areamanger/rm-checklist-form": "RM Checklist Form",
  // "/areamanger/rm-checklist-details": "RM Checklist Details",
  // "/areamanger/monthly-lp-global-count": "Monthly LP Global Count",
  // "/areamanger/fascia-report": "Fascia Plan Report",
  // "/areamanger/fascia-plan": "Fascia Plan",
  // "/areamanger/ho-checklist": "HO Checklist",
  // "/areamanger/void-list": "All Void List",
};

export default function AreaLayout() {
  const pathname = usePathname();
  const formBackHandler = useRef<(() => void) | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerBackVisible, setHeaderBackVisible] = useState(false);
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);
  const [headerOverride, setHeaderOverride] = useState<{
    pathname: string;
    title: string;
  } | null>(null);
  const setHeaderTitle = useCallback(
    (title: string | null) => {
      setHeaderOverride((current) =>
        title
          ? { pathname, title }
          : current?.pathname === pathname
            ? null
            : current,
      );
    },
    [pathname],
  );
  const headerTitle =
    (headerOverride?.pathname === pathname ? headerOverride.title : null) ??
    PAGE_TITLES[pathname] ??
    "Track R";
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // Clear local Bearer token and user details.
      // If your backend exposes a revoke-token endpoint, call it here first.
      await Promise.all([clearAuthToken(), clearUser()]);
      setConfirmLogout(false);
      router.replace("/login");
    } catch {
      Alert.alert("Logout failed", "Unable to clear local login details.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top", "left", "right"]} style={styles.top}>
        <View style={styles.brandRow}>
          <View>
            <AppButton
              title=""
              accessibilityLabel="Open navigation"
              onPress={() => setMenuOpen(true)}
              style={styles.menuToggle}
            />
            <View pointerEvents="none" style={styles.toggleIcon}>
              <AreaIcon name="menu" color={COLORS.white} size={23} />
            </View>
          </View>
          <View style={styles.brand}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {headerTitle}
            </Text>
          </View>
          {headerAction}
          {headerBackVisible && (
            <View>
              <AppButton
                title=""
                accessibilityLabel="Go back"
                onPress={() => formBackHandler.current?.()}
                style={styles.headerBack}
              />
              <View pointerEvents="none" style={styles.toggleIcon}>
                <AreaIcon name="back" color={COLORS.white} size={22} />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
      <AreaHeaderBackContext.Provider value={formBackHandler}>
        <AreaHeaderActionContext.Provider value={setHeaderAction}>
          <AreaHeaderBackVisibleContext.Provider value={setHeaderBackVisible}>
            <AreaHeaderTitleContext.Provider value={setHeaderTitle}>
              <View style={styles.body}>
                <Slot />
              </View>
            </AreaHeaderTitleContext.Provider>
          </AreaHeaderBackVisibleContext.Provider>
        </AreaHeaderActionContext.Provider>
      </AreaHeaderBackContext.Provider>
      {menuOpen && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <SafeAreaView edges={["top"]} style={styles.drawerOverlay}>
            <StatusBar style="light" />
            <View style={styles.drawerRow}>
              <SafeAreaView edges={["left", "bottom"]} style={styles.menu}>
                <ScrollView contentContainerStyle={styles.menuContent}>
                  <View style={styles.drawerHeading}>
                    <View style={styles.brand}>
                      <Image
                        accessible
                        accessibilityLabel="TrackR"
                        source={require("../../assets/images/logo/logo.svg")}
                        contentFit="contain"
                        style={styles.drawerLogo}
                      />
                    </View>
                    <View>
                      <AppButton
                        title=""
                        accessibilityLabel="Close navigation menu"
                        onPress={() => setMenuOpen(false)}
                        style={styles.closeToggle}
                      />
                      <View pointerEvents="none" style={styles.toggleIcon}>
                        <AreaIcon name="close" color={COLORS.white} size={20} />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.menuLabel}>NAVIGATION</Text>
                  {AREA_NAVIGATION.map((item) => (
                    <Pressable
                      key={item.href}
                      accessibilityRole="button"
                      onPress={() => {
                        setMenuOpen(false);
                        router.replace(item.href);
                      }}
                      style={[
                        styles.navRow,
                        pathname === item.href && styles.navRowActive,
                      ]}
                    >
                      <AreaIcon
                        name={item.icon}
                        color={COLORS.white}
                        size={20}
                      />
                      <Text style={styles.navText}>{item.title}</Text>
                    </Pressable>
                  ))}
                  <View style={styles.menuDivider} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setMenuOpen(false);
                      setConfirmLogout(true);
                    }}
                    style={styles.navRow}
                  >
                    <AreaIcon name="logout" color={COLORS.white} size={20} />
                    <Text style={styles.navText}>Logout</Text>
                  </Pressable>
                </ScrollView>
              </SafeAreaView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
                style={styles.drawerBackdrop}
                onPress={() => setMenuOpen(false)}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
      <Modal
        transparent
        animationType="fade"
        visible={confirmLogout}
        onRequestClose={() => {
          if (!loggingOut) setConfirmLogout(false);
        }}
      >
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <View accessible={false} style={styles.confirmIcon}>
              <Text style={styles.confirmIconText}>!</Text>
            </View>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              Are you sure?
            </Text>
            <Text style={styles.dialogText}>
              You will be logged out of TrackR. You can sign in again anytime.
            </Text>
            <View style={styles.dialogActions}>
              <AppButton
                title="Cancel"
                style={[styles.dialogButton, styles.cancelButton]}
                textStyle={styles.cancelButtonText}
                variant="outline"
                disabled={loggingOut}
                onPress={() => setConfirmLogout(false)}
              />
              <AppButton
                title="Yes, logout"
                variant="primary"
                style={styles.dialogButton}
                loading={loggingOut}
                onPress={logout}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.primary },
  top: { backgroundColor: COLORS.primary },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  brand: { flex: 1 },
  headerTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "600",
    flexShrink: 1,
  },
  logo: { width: 148, maxWidth: "100%", height: 36 },
  drawerLogo: { width: 148, maxWidth: "100%", height: 36 },
  menuToggle: {
    width: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    borderRadius: 12,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  headerBack: {
    width: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  headerAddChecklist: {
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  closeToggle: {
    width: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  toggleIcon: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, backgroundColor: COLORS.surface },
  drawerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  drawerRow: { flex: 1, flexDirection: "row" },
  drawerBackdrop: { flex: 1 },
  menu: {
    width: "86%",
    maxWidth: 360,
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 24,
  },
  menuContent: { padding: 20, gap: SPACING.sm },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 14,
  },
  navRowActive: { backgroundColor: "rgba(255,255,255,0.16)" },
  navText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  menuLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1.5,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  drawerHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: SPACING.md,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: SPACING.lg,
  },
  dialog: {
    ...CARD,
    width: "100%",
    maxWidth: 400,
    gap: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: 24,
    alignItems: "center",
  },
  confirmIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#F0B56B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  confirmIconText: {
    fontSize: 48,
    color: "#C67D23",
    fontWeight: FONT_WEIGHT.medium,
  },
  dialogActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    width: "100%",
  },
  dialogButton: { flexGrow: 1, flexBasis: 130, minHeight: 48 },
  cancelButton: { backgroundColor: COLORS.border, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.text },
  dialogTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  dialogText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.md,
    textAlign: "center",
    lineHeight: 24,
  },
});
