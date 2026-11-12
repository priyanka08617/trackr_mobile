import { AppButton } from "@/components/AppButton";
import AreaIcon from "@/components/AreaIcon";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import AreaIcon from "../../area_manager/components/AreaHeaderBackContext";

import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import {
  loadEscalationDocuments,
  type EscalationDocument,
} from "../services/EscalationMatrixService";

export default function EscalationMatrix({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const [documents, setDocuments] = useState<EscalationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setDocuments(await loadEscalationDocuments());
    } catch (cause) {
      setDocuments([]);
      setError(
        cause instanceof Error ? cause.message : "Unable to load documents.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = onBack;
    setBackVisible(true);
    void loadDocuments();
    return () => {
      if (backHandlerRef) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, loadDocuments, onBack, setBackVisible]);

  const openDocument = useCallback(async (document: EscalationDocument) => {
    if (!document.url) {
      setError("This escalation does not have a PDF attached.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(document.url);
    } catch {
      setError("Could not open this PDF. Please try again.");
    }
  }, []);

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <FlatList
        data={documents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.subtitle}>Tap a document to open its PDF.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => void openDocument(item)}
            style={({ pressed }) => [
              styles.documentCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.documentIcon}>
              <AreaIcon name="plan" color={COLORS.primary} size={20} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>{item.name}</Text>
              {!!item.function_name && (
                <Text style={styles.detail}>{item.function_name}</Text>
              )}
              {!!item.reference_number && (
                <Text style={styles.detail}>Ref: {item.reference_number}</Text>
              )}
            </View>
            <AreaIcon name="chevron" color={COLORS.textLight} size={18} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : error ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
                <AppButton
                  title="Try again"
                  onPress={() => void loadDocuments()}
                  style={styles.retry}
                />
              </>
            ) : (
              <Text style={styles.emptyText}>
                No escalation documents found.
              </Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  header: { gap: SPACING.sm, marginBottom: SPACING.md },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: { color: COLORS.textLight, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  documentCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5e9eb",
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: { flex: 1, gap: 3 },
  documentName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: 20,
  },
  detail: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  pressed: { opacity: 0.75 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
  },
  error: { color: COLORS.danger, textAlign: "center", fontSize: FONT_SIZE.sm },
  retry: { minWidth: 140 },
});
