import { AppButton } from "@/components/AppButton";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
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
import {
  loadSopDocuments,
  SOP_LANGUAGES,
  type SopDocument,
  type SopLanguage,
} from "../services/SopCommandmentsService";

export default function SopCommandments({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

  const [language, setLanguage] = useState<SopLanguage>();
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [openError, setOpenError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const chooseLanguage = useCallback(() => {
    setLanguage(undefined);
    setDocuments([]);
    setLoadError("");
    setOpenError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleBack = language ? chooseLanguage : onBack;

    if (backHandlerRef) {
      backHandlerRef.current = handleBack;
    }

    setBackVisible(true);

    return () => {
      if (backHandlerRef?.current === handleBack) {
        backHandlerRef.current = null;
      }
      setBackVisible(false);
    };
  }, [backHandlerRef, chooseLanguage, language, onBack, setBackVisible]);

  useEffect(() => {
    if (!language) return;

    let active = true;

    loadSopDocuments(language)
      .then((result) => {
        if (active) setDocuments(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Unable to load SOP documents.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [language, retryCount]);

  function selectLanguage(selected: SopLanguage) {
    setDocuments([]);
    setLoadError("");
    setOpenError("");
    setLoading(true);
    setLanguage(selected);
  }

  async function openDocument(document: SopDocument) {
    setOpenError("");

    try {
      const url = new URL(document.url);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setOpenError("This PDF link is unsupported.");
        return;
      }

      await WebBrowser.openBrowserAsync(url.toString());
    } catch {
      setOpenError("Could not open this PDF. Please check the link.");
    }
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      {!language ? (
        <FlatList
          key="languages"
          data={SOP_LANGUAGES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <Text style={styles.subtitle}>
              Choose a language to browse the store SOP documents.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => selectLanguage(item)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                <AreaIcon name="globe" size={20} />
              </View>
              <Text style={styles.cardText}>{item}</Text>
              <AreaIcon name="chevron" color={COLORS.textLight} size={18} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          key={language}
          data={documents}
          keyExtractor={(item) => item.url}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {language} SOPs
              </Text>
              <AppButton
                title="Choose another language"
                variant="outline"
                onPress={chooseLanguage}
                style={styles.changeLanguage}
              />
              {openError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {openError}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${item.name}`}
              onPress={() => void openDocument(item)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                <AreaIcon name="plan" color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.cardText}>{item.name}</Text>
              <AreaIcon name="chevron" color={COLORS.textLight} size={18} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : loadError ? (
                <>
                  <Text accessibilityRole="alert" style={styles.error}>
                    {loadError}
                  </Text>
                  <AppButton
                    title="Try again"
                    onPress={() => {
                      setLoadError("");
                      setLoading(true);
                      setRetryCount((count) => count + 1);
                    }}
                  />
                </>
              ) : (
                <Text style={styles.subtitle}>
                  No SOP PDFs found for this language.
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  header: { gap: SPACING.sm, marginBottom: SPACING.md },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  changeLanguage: { alignSelf: "flex-start" },
  card: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5e9eb",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  pressed: { opacity: 0.75 },
  empty: {
    alignItems: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  error: {
    color: COLORS.danger,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
  },
});
