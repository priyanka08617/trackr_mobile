import { AppButton } from "@/components/AppButton";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import AreaIcon from "@/components/AreaIcon";
import { COLORS, FONT_SIZE, SPACING } from "@/constants/theme";
import {
  loadAllPortals,
  type PortalItem,
} from "@/modules/common/services/All_portals_library_service";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AllPortals({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [linkError, setLinkError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setLinkError("");

    try {
      setPortals(await loadAllPortals());
    } catch (cause) {
      setPortals([]);
      setLoadError(
        cause instanceof Error ? cause.message : "Unable to load portals.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (backHandlerRef) {
      backHandlerRef.current = onBack;
    }

    setBackVisible(true);

    return () => {
      if (backHandlerRef?.current === onBack) {
        backHandlerRef.current = null;
      }
      setBackVisible(false);
    };
  }, [backHandlerRef, onBack, setBackVisible]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openPortal(portal: PortalItem) {
    setLinkError("");

    if (!portal.url?.trim()) {
      setLinkError("This portal does not have a link.");
      return;
    }

    try {
      const url = new URL(portal.url);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setLinkError("This portal link is unsupported.");
        return;
      }

      await WebBrowser.openBrowserAsync(url.toString());
    } catch {
      setLinkError("Could not open this portal. Please try again.");
    }
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      {linkError ? (
        <Text accessibilityRole="alert" style={styles.linkError}>
          {linkError}
        </Text>
      ) : null}

      <FlatList
        data={portals}
        keyExtractor={(portal) => String(portal.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${item.name || "portal"}`}
            onPress={() => void openPortal(item)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            {item.logo_url ? (
              <Image
                source={{ uri: item.logo_url }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <AreaIcon name="plan" color={COLORS.primary} size={35} />
            )}

          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : loadError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  {loadError}
                </Text>
                <AppButton title="Try again" onPress={() => void refresh()} />
              </>
            ) : (
              <Text style={styles.emptyText}>No portals available.</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  row: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    flexBasis: 0,
    flexGrow: 1,
    maxWidth: "50%",
    minHeight: 132,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  logo: {
    width: "90%",
    height: 64,
  },
  name: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  linkError: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
    padding: SPACING.md,
  },
});
