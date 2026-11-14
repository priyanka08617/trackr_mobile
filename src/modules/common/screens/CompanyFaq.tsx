import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { AppLoader } from "@/components/AppLoader";
import AreaIcon from "@/components/AreaIcon";
import {
  CARD,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";
import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

// ==============================================
// TYPES
// ==============================================

export interface CompanyFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
}

// ==============================================
// COMPANY BASE URL + TOKEN
// ==============================================

async function getCompanyFaqEndpoint(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/common/company_faq.php`;
}

async function getCompanyFaqToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

// ==============================================
// HELPERS
// ==============================================

function htmlToPlainText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\u2022 ")
    .replace(/<\s*\/\s*(li|p|div|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\\u([0-9a-f]{4})/gi, (_escape, code: string) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
      (entity, code: string) => {
        const normalized = code.toLowerCase();
        if (normalized.startsWith("#x"))
          return String.fromCodePoint(parseInt(normalized.slice(2), 16));
        if (normalized.startsWith("#"))
          return String.fromCodePoint(parseInt(normalized.slice(1), 10));
        return (
          { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[
            normalized
          ] ?? entity
        );
      },
    )
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readFaqJson(
  response: Response,
  text: string,
): Record<string, unknown> {
  let payload: unknown;
  try {
    payload = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
      throw new Error("Sign in to your area manager account and try again.");
    }
    throw new Error(
      response.status === 404
        ? "Company FAQ endpoint not found. Check deployment."
        : `Company FAQ API did not return JSON (HTTP ${response.status}).`,
    );
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("Company FAQ API returned an unexpected response format.");
  }
  return payload as Record<string, unknown>;
}

// ==============================================
// FETCH
// ==============================================

async function fetchCompanyFaqs(
  signal: AbortSignal,
): Promise<CompanyFaqItem[]> {
  const ENDPOINT = await getCompanyFaqEndpoint();
  let token = await getCompanyFaqToken();

  const url = new URL(ENDPOINT);
  url.searchParams.set("category", "all");
  url.searchParams.set(
    "_request",
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal,
        cache: "no-store",
      });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") throw cause;
      throw new Error("Could not reach the Company FAQ API.");
    }

    const text = await response.text();
    const result = readFaqJson(response, text);

    // Retry once on 401 with fresh token
    if (
      response.status === 401 &&
      attempt === 0 &&
      /access token/i.test(String(result.message ?? ""))
    ) {
      const refreshed = await getAuthToken();
      if (refreshed) {
        token = refreshed;
        continue;
      }
    }

    if (!response.ok) {
      throw new Error(
        typeof result.message === "string" && result.message
          ? result.message
          : `Company FAQ request failed (${response.status}).`,
      );
    }

    if (result.success !== true) {
      throw new Error(
        typeof result.message === "string"
          ? result.message
          : "Unable to load company FAQs.",
      );
    }

    if (!Array.isArray(result.data)) {
      throw new Error(
        "Company FAQ API returned an unexpected response format.",
      );
    }

    return (result.data as unknown[])
      .filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null,
      )
      .map((row, index) => ({
        id: String(row.id ?? row.faq_id ?? index),
        category: String(row.category ?? "General"),
        question: htmlToPlainText(row.question),
        answer: htmlToPlainText(row.answer),
        sortOrder:
          row.sort_order != null && Number.isFinite(Number(row.sort_order))
            ? Number(row.sort_order)
            : 9999,
      }))
      .filter((faq) => faq.question.length > 0);
  }

  throw new Error(
    "Unable to authenticate the Company FAQ request. Sign in again.",
  );
}

// ==============================================
// SCREEN
// ==============================================

export default function CompanyFaq() {
  const [faqs, setFaqs] = useState<CompanyFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    setLoading(true);
    setError(undefined);

    fetchCompanyFaqs(controller.signal)
      .then((items) => {
        if (active) setFaqs(items);
      })
      .catch((loadError: unknown) => {
        if (
          active &&
          !(loadError instanceof Error && loadError.name === "AbortError")
        ) {
          setFaqs([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load company FAQs.",
          );
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [retryCount]);

  const categoryOrder = new Map<string, number>();
  for (const faq of faqs)
    if (!categoryOrder.has(faq.category))
      categoryOrder.set(faq.category, faq.sortOrder ?? 9999);
  const categories = Array.from(categoryOrder.keys()).sort(
    (a, b) => categoryOrder.get(a)! - categoryOrder.get(b)!,
  );
  const visible = faqs.filter(
    (faq) =>
      (!category || faq.category === category) &&
      `${faq.question} ${faq.answer}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <View style={styles.screen}>
      <View
        pointerEvents="none"
        accessible={false}
        style={StyleSheet.absoluteFill}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient
              id="faqBackground"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#e6af2e" stopOpacity={0.2} />
              <Stop offset="50%" stopColor="#3d348b" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#e6af2e" stopOpacity={0.2} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#faqBackground)" />
        </Svg>
      </View>
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
        <ScrollView
          accessibilityLabel="Company FAQs"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <AppInput
            accessibilityLabel="Search company FAQs"
            placeholder="Search questions"
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.categories}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !category }}
              style={[
                styles.categoryButton,
                styles.allCategories,
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
                accessibilityState={{ selected: category === item }}
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
          {loading && <AppLoader message="Loading company FAQs..." />}
          {error && (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              <AppButton
                title="Retry"
                variant="outline"
                onPress={() => {
                  setLoading(true);
                  setError(undefined);
                  setRetryCount((count) => count + 1);
                }}
              />
            </View>
          )}
          {!loading && !error && !visible.length && (
            <Text style={styles.empty}>
              {faqs.length
                ? "No matching FAQs."
                : "No company FAQs available yet."}
            </Text>
          )}
          {categories.map((group) => {
            const questions = visible.filter((faq) => faq.category === group);
            if (!questions.length) return null;
            return (
              <View key={group} style={styles.group}>
                <Text accessibilityRole="header" style={styles.category}>
                  {group}
                </Text>
                {questions.map((faq) => (
                  <View key={faq.id} style={styles.card}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: expanded === faq.id }}
                      onPress={() =>
                        setExpanded(expanded === faq.id ? null : faq.id)
                      }
                      style={styles.questionRow}
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
                          expanded === faq.id ? styles.expandedIcon : undefined
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
  screen: { flex: 1, backgroundColor: COLORS.white },
  safeArea: { flex: 1 },
  content: {
    padding: 16,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  heading: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
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
  allCategories: {},
  activeCategory: { backgroundColor: COLORS.primary },
  categoryLabel: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  activeLabel: { color: COLORS.white },
  group: { gap: SPACING.sm },
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
  questionIcon: { width: 30, alignItems: "center" },
  question: {
    flex: 1,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },
  openQuestion: { color: COLORS.primary },
  expandedIcon: { transform: [{ rotate: "90deg" }] },
  category: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
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
  errorBox: { alignItems: "center", gap: SPACING.sm, padding: SPACING.md },
  error: { color: COLORS.danger, textAlign: "center" },
});
