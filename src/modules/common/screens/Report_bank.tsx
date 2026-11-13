import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import AreaIcon from "@/components/AreaIcon";
import DataTable from "@/components/Table";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { getSavedCompany } from "@/storage/companyStorage";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  loadReportBank,
  type ReportBankItem,
} from "../services/report_bank_service";

const DESIGNATIONS = ["All", "Store Manager", "RM/ROM", "ZBH"] as const;

const COLUMNS = [
  { title: "#", width: 65 },
  { title: "Applicable For", width: 155 },
  { title: "Function Type", width: 155 },
  { title: "Available in Report Bank", width: 230 },
  { title: "Frequency to Check", width: 155 },
  { title: "Action", width: 115 },
];

export default function ReportBank({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

  const [reports, setReports] = useState<ReportBankItem[]>([]);
  const [companyOrigin, setCompanyOrigin] = useState("");
  const [designation, setDesignation] =
    useState<(typeof DESIGNATIONS)[number]>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [linkError, setLinkError] = useState("");

  const loadReports = useCallback(async (isRefresh = false) => {
    setLoading(!isRefresh);
    setRefreshing(isRefresh);
    setLoadError("");
    setLinkError("");

    try {
      const company = await getSavedCompany();
      const apiUrl = company?.api_url?.trim();
      const origin = apiUrl ? new URL(apiUrl).origin : "";

      const result = await loadReportBank();
      setCompanyOrigin(origin);
      setReports(result);
    } catch (cause) {
      setLoadError(
        cause instanceof Error ? cause.message : "Unable to load reports.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    void loadReports();
  }, [loadReports]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const selectedDesignation = designation.toLowerCase();

    return reports
      .filter((report) => {
        const applies =
          designation === "All" ||
          report.applicable_for
            .split(",")
            .some(
              (value) => value.trim().toLowerCase() === selectedDesignation,
            );

        const matchesSearch =
          !term ||
          [
            report.applicable_for,
            report.function_type,
            report.available_in_report_bank,
            report.frequency_to_check_the_report,
          ].some((value) => value.toLowerCase().includes(term));

        return applies && matchesSearch;
      })
      .map((report) => ({ ...report, id: String(report.id) }));
  }, [designation, reports, search]);

  async function openReport(reportLink: string) {
    setLinkError("");

    try {
      const url = companyOrigin
        ? new URL(reportLink, `${companyOrigin}/`)
        : new URL(reportLink);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setLinkError("This report link is unsupported.");
        return;
      }

      await WebBrowser.openBrowserAsync(url.toString());
    } catch {
      setLinkError("Could not open this report. Please check the link.");
    }
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={styles.header}>
        <AppInput
          accessibilityLabel="Search reports"
          placeholder="Search reports"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {DESIGNATIONS.map((item) => {
            const selected = designation === item;

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setDesignation(item)}
                style={[styles.filter, selected && styles.activeFilter]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.activeFilterText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loadError ? (
          <>
            <Text accessibilityRole="alert" style={styles.error}>
              {loadError}
            </Text>
            <AppButton title="Try again" onPress={() => void loadReports()} />
          </>
        ) : null}

        {linkError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {linkError}
          </Text>
        ) : null}

        {!loading && !loadError ? (
          <Text style={styles.subtitle}>
            {rows.length} {rows.length === 1 ? "report" : "reports"}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.table}>
          <DataTable
            columns={COLUMNS}
            rows={rows}
            refreshing={refreshing}
            onRefresh={() => void loadReports(true)}
            empty={
              loadError
                ? "Unable to load reports."
                : search.trim() || designation !== "All"
                  ? "No reports match these filters."
                  : "No reports available."
            }
            renderCells={(item, index) => [
              String(index + 1),
              item.applicable_for || "-",
              item.function_type || "-",
              item.available_in_report_bank || "-",
              item.frequency_to_check_the_report || "-",
              item.report_link ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`View ${item.function_type || "report"}`}
                  onPress={() => void openReport(item.report_link)}
                  style={styles.viewButton}
                >
                  <Text style={styles.link}>View Report</Text>
                  <AreaIcon name="chevron" color={COLORS.primary} size={14} />
                </Pressable>
              ) : (
                "-"
              ),
            ]}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
  },
  header: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  subtitle: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
  },
  filters: {
    gap: SPACING.xs,
    alignItems: "center",
  },
  filter: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    backgroundColor: "#eee8e9",
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  activeFilterText: {
    color: COLORS.white,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  table: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
  },
  viewButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  link: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
