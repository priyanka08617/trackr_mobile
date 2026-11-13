import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import AreaIcon from "@/components/AreaIcon";

// Theme
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";

// Context
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";

// Service
import {
  loadImportantGuidelines,
  type GuidelineDocument,
} from "../services/library_of_important_guidelines_service";

// Assets
// const PDF_ICON = require("../assets/images/guideline-pdf.png");

// Types
type Props = {
  onBack: () => void;
};

export default function ImportantGuidelines({ onBack }: Props) {
  // ==========================================
  // CONTEXT
  // ==========================================

  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

  // ==========================================
  // STATE
  // ==========================================

  const [documents, setDocuments] = useState<GuidelineDocument[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // LOAD DOCUMENTS
  // ==========================================

  const loadDocuments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await loadImportantGuidelines();

      setDocuments(Array.isArray(result) ? result : []);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to load guidelines.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==========================================
  // HEADER BACK HANDLER
  // ==========================================

  useEffect(() => {
    if (backHandlerRef) {
      backHandlerRef.current = onBack;
    }
  }, [backHandlerRef, onBack]);

  useEffect(() => {
    setBackVisible(true);

    return () => {
      if (backHandlerRef) {
        backHandlerRef.current = null;
      }

      setBackVisible(false);
    };
  }, [backHandlerRef, setBackVisible]);

  // ==========================================
  // INITIAL API LOAD
  // ==========================================

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  // ==========================================
  // SEARCH FILTER
  // ==========================================

  const visibleDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return documents;
    }

    return documents.filter((document) => {
      const fields = [
        document.name,
        document.function_name,
        document.reference_number,
      ];

      return fields.some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [documents, search]);

  // ==========================================
  // OPEN DOCUMENT
  // ==========================================

  const openDocument = useCallback(async (document: GuidelineDocument) => {
    const url = document.url?.trim();

    if (!url) {
      setError("This guideline does not have a file attached.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setError("Invalid guideline document URL.");
      return;
    }

    try {
      setError(null);
      await WebBrowser.openBrowserAsync(url);
    } catch {
      setError("Could not open this guideline file. Please try again.");
    }
  }, []);

  // ==========================================
  // DOCUMENT CARD
  // ==========================================

  const renderDocument = useCallback(
    ({ item }: { item: GuidelineDocument }) => (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${item.name}`}
        onPress={() => void openDocument(item)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.iconContainer}>
          <Image
            // source={PDF_ICON}
            contentFit="contain"
            style={styles.documentImage}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>

          {!!item.function_name && (
            <Text style={styles.detail}>{item.function_name}</Text>
          )}

          {!!item.reference_number && (
            <Text style={styles.detail}>Ref: {item.reference_number}</Text>
          )}

          {!!item.url && <Text style={styles.openLabel}>Open guideline</Text>}
        </View>

        <AreaIcon name="chevron" color={COLORS.textLight} size={18} />
      </Pressable>
    ),
    [openDocument],
  );

  // ==========================================
  // HEADER
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.subtitle}>
        Browse and open guidelines for store operations.
      </Text>

      <AppInput
        accessibilityLabel="Search important guidelines"
        placeholder="Search name, function or reference"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {!loading && (
        <Text style={styles.count}>{visibleDocuments.length} guidelines</Text>
      )}

      {!!error && documents.length > 0 && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );

  // ==========================================
  // EMPTY / LOADING / ERROR
  // ==========================================

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={COLORS.primary} />

          <Text style={styles.emptyText}>Loading guidelines...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.empty}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>

          <AppButton
            title="Try again"
            onPress={() => void loadDocuments()}
            style={styles.retry}
          />
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {search.trim()
            ? "No matching guidelines found."
            : "No guidelines available."}
        </Text>
      </View>
    );
  };

  // ==========================================
  // MAIN VIEW
  // ==========================================

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <FlatList
        data={visibleDocuments}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDocument}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => void loadDocuments(true)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
    flexGrow: 1,
  },

  header: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  subtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },

  count: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },

  card: {
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

  pressed: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5e9eb",
    alignItems: "center",
    justifyContent: "center",
  },

  documentImage: {
    width: 34,
    height: 34,
  },

  info: {
    flex: 1,
    gap: 3,
  },

  name: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: 20,
  },

  detail: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },

  openLabel: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: 2,
  },

  empty: {
    flex: 1,
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

  error: {
    color: COLORS.danger,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
  },

  retry: {
    minWidth: 140,
  },
});
