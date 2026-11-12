import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { AppLoader } from "@/components/AppLoader";

import {
    CARD,
    COLORS,
    FONT_SIZE,
    FONT_WEIGHT,
    SPACING,
} from "@/constants/theme";

import { useEffect, useMemo, useState } from "react";

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

// import Svg, {
//   Defs,
//   LinearGradient,
//   Rect,
//   Stop,
// } from "react-native-svg";

import AreaIcon from "../../../components/AreaIcon";
import { fetchCompanyFaqs } from "../services/companyFaqService";
import type { CompanyFaqItem } from "../types/companyFaq.types";

export default function CompanyFaq() {
  const [faqs, setFaqs] = useState<CompanyFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load company FAQs
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    setLoading(true);
    setError(undefined);

    fetchCompanyFaqs(controller.signal)
      .then((items) => {
        if (active) {
          setFaqs(items);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setFaqs([]);

          setError(
            err instanceof Error
              ? err.name === "AbortError"
                ? "FAQ request timed out."
                : err.message
              : "Unable to load company FAQs.",
          );
        }
      })
      .finally(() => {
        clearTimeout(timeout);

        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [retryCount]);

  // Prepare FAQ categories
  const categories = useMemo(() => {
    const categoryOrder = new Map<string, number>();

    faqs.forEach((faq) => {
      if (!categoryOrder.has(faq.category)) {
        categoryOrder.set(faq.category, faq.sortOrder ?? 9999);
      }
    });

    return Array.from(categoryOrder.keys()).sort(
      (a, b) => (categoryOrder.get(a) ?? 9999) - (categoryOrder.get(b) ?? 9999),
    );
  }, [faqs]);

  // Filter FAQs
  const visibleFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = !category || faq.category === category;

      const matchesSearch = `${faq.question} ${faq.answer}`
        .toLowerCase()
        .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [faqs, category, search]);

  return (
    <View style={styles.screen}>
      {/* Background */}
      <View
        pointerEvents="none"
        accessible={false}
        style={StyleSheet.absoluteFill}
      >
        {/* <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient
              id="faqBackground"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop
                offset="0%"
                stopColor="#e6af2e"
                stopOpacity={0.2}
              />
              <Stop
                offset="50%"
                stopColor="#3d348b"
                stopOpacity={0.2}
              />
              <Stop
                offset="100%"
                stopColor="#e6af2e"
                stopOpacity={0.2}
              />
            </LinearGradient>
          </Defs>

          <Rect
            width="100%"
            height="100%"
            fill="url(#faqBackground)"
          />
        </Svg> */}
      </View>

      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
        <ScrollView
          accessibilityLabel="Company FAQs"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* Search input */}
          <AppInput
            accessibilityLabel="Search company FAQs"
            placeholder="Search questions"
            value={search}
            onChangeText={setSearch}
          />

          {/* Category buttons */}
          <View style={styles.categories}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !category }}
              style={[
                styles.categoryButton,
                !category && styles.activeCategory,
              ]}
              onPress={() => {
                setCategory(null);
                setExpanded(null);
              }}
            >
              <Text
                style={[styles.categoryLabel, !category && styles.activeLabel]}
              >
                All
              </Text>
            </Pressable>

            {categories.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{
                  selected: category === item,
                }}
                style={[
                  styles.categoryButton,
                  category === item && styles.activeCategory,
                ]}
                onPress={() => {
                  setCategory(item);
                  setExpanded(null);
                }}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    category === item && styles.activeLabel,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Loading indicator */}
          {loading && <AppLoader message="Loading company FAQs..." />}

          {/* Error handling */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>

              <AppButton
                title="Retry"
                variant="outline"
                onPress={() => {
                  setRetryCount((count) => count + 1);
                }}
              />
            </View>
          )}

          {/* Empty data */}
          {!loading && !error && !visibleFaqs.length && (
            <Text style={styles.empty}>
              {faqs.length
                ? "No matching FAQs."
                : "No company FAQs available yet."}
            </Text>
          )}

          {/* FAQs grouped by category */}
          {!loading &&
            !error &&
            categories.map((group) => {
              const questions = visibleFaqs.filter(
                (faq) => faq.category === group,
              );

              if (!questions.length) {
                return null;
              }

              return (
                <View key={group} style={styles.group}>
                  <Text accessibilityRole="header" style={styles.category}>
                    {group}
                  </Text>

                  {questions.map((faq) => (
                    <View key={faq.id} style={styles.card}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          expanded: expanded === faq.id,
                        }}
                        style={styles.questionRow}
                        onPress={() => {
                          setExpanded(expanded === faq.id ? null : faq.id);
                        }}
                      >
                        <View style={styles.questionIcon}>
                          <AreaIcon name="faq" size={18} />
                        </View>

                        <Text
                          style={[
                            styles.question,
                            expanded === faq.id && styles.openQuestion,
                          ]}
                        >
                          {faq.question}
                        </Text>

                        <View
                          style={
                            expanded === faq.id
                              ? styles.expandedIcon
                              : undefined
                          }
                        >
                          <AreaIcon
                            name="chevron"
                            size={15}
                            color={COLORS.textLight}
                          />
                        </View>
                      </Pressable>

                      {expanded === faq.id && (
                        <Text style={styles.answer}>{faq.answer}</Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  safeArea: {
    flex: 1,
  },

  content: {
    padding: 16,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },

  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },

  categoryButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  activeCategory: {
    backgroundColor: COLORS.primary,
  },

  categoryLabel: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  activeLabel: {
    color: COLORS.white,
  },

  group: {
    gap: SPACING.sm,
  },

  card: {
    ...CARD,
    padding: 0,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: SPACING.xs,
  },

  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    minHeight: 64,
  },

  questionIcon: {
    width: 30,
    alignItems: "center",
  },

  question: {
    flex: 1,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },

  openQuestion: {
    color: COLORS.primary,
  },

  expandedIcon: {
    transform: [{ rotate: "90deg" }],
  },

  category: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  answer: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
    padding: SPACING.md,
    paddingTop: 0,
  },

  empty: {
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: SPACING.xl,
  },

  errorBox: {
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
  },

  error: {
    color: COLORS.danger,
    textAlign: "center",
  },
});
