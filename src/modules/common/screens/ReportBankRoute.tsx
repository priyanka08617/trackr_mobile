import { router } from "expo-router";
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

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import AreaIcon from "@/components/AreaIcon";

import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";

import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";

import { getSavedCompany } from "@/storage/companyStorage";

import DataTable from "../../area_manager/screens/FasciaTable";

import {
  loadReportBank,
  type ReportBankItem,
} from "../services/ReportBankService";

const DESIGNATIONS = ["All", "Store Manager", "RM/ROM", "ZBH"] as const;

const COLUMN_WIDTHS = {
  function: 155,
  audience: 155,
  available: 230,
  frequency: 155,
  action: 115,
};

export default function ReportBankRoute() {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);

  const [reports, setReports] = useState<ReportBankItem[]>([]);

  const [designation, setDesignation] =
    useState<(typeof DESIGNATIONS)[number]>("All");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  // STEP 1: Load reports from selected company API
  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(undefined);

    try {
      const result = await loadReportBank();

      setReports(result);
    } catch (cause) {
      setReports([]);

      setError(
        cause instanceof Error ? cause.message : "Unable to load reports.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // STEP 2: Initial loading and back navigation
  useEffect(() => {
    if (backHandlerRef) {
      backHandlerRef.current = () => router.back();
    }

    setBackVisible(true);

    void loadReports();

    return () => {
      if (backHandlerRef) {
        backHandlerRef.current = null;
      }

      setBackVisible(false);
    };
  }, [backHandlerRef, loadReports, setBackVisible]);

  // STEP 3: Search and designation filtering
  const visibleReports = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return reports.filter((report) => {
      const applies =
        designation === "All" ||
        report.applicable_for
          .split(",")
          .map((value) => value.trim().toLocaleLowerCase())
          .includes(designation.toLocaleLowerCase());

      const matchesSearch =
        !term ||
        [
          report.applicable_for,
          report.function_type,
          report.available_in_report_bank,
          report.frequency_to_check_the_report,
        ].some((value) => value.toLocaleLowerCase().includes(term));

      return applies && matchesSearch;
    });
  }, [designation, reports, search]);

  // STEP 4: Open report using selected company URL
  const openReport = useCallback(async (report: ReportBankItem) => {
    if (!report.report_link) {
      setError("This report does not have a link.");
      return;
    }

    try {
      const company = await getSavedCompany();

      if (!company?.api_url) {
        throw new Error("Company API URL not found. Please select a company.");
      }

      const baseUrl = company.api_url.replace(/\/+$/, "");

      // Get company server origin
      const apiOrigin = new URL(baseUrl).origin;

      // Resolve relative or absolute report URL
      const url = new URL(report.report_link, `${apiOrigin}/`);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Unsupported report link.");
      }

      setError(undefined);

      await WebBrowser.openBrowserAsync(url.toString());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not open this report.",
      );
    }
  }, []);

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
          {DESIGNATIONS.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{
                selected: designation === item,
              }}
              onPress={() => setDesignation(item)}
              style={[
                styles.filter,
                designation === item && styles.activeFilter,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  designation === item && styles.activeFilterText,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}

        {error && (
          <AppButton title="Try again" onPress={() => void loadReports()} />
        )}

        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Text style={styles.subtitle}>
            {visibleReports.length} reports | Swipe to view all columns
          </Text>
        )}
      </View>

      <View style={styles.table}>
        <DataTable
          columns={[
            { title: "#", width: 65 },
            {
              title: "Applicable For",
              width: COLUMN_WIDTHS.audience,
            },
            {
              title: "Function Type",
              width: COLUMN_WIDTHS.function,
            },
            {
              title: "Available in this Report",
              width: COLUMN_WIDTHS.available,
            },
            {
              title: "Frequency to Check",
              width: COLUMN_WIDTHS.frequency,
            },
            {
              title: "Action",
              width: COLUMN_WIDTHS.action,
            },
          ]}
          rows={visibleReports.map((report) => ({
            ...report,
            id: String(report.id),
          }))}
          refreshing={refreshing}
          onRefresh={() => void loadReports(true)}
          empty={
            loading
              ? "Loading reports..."
              : error
                ? "Unable to load reports."
                : "No reports match these filters."
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
                accessibilityLabel={`View ${item.function_type} report`}
                onPress={() =>
                  void openReport({
                    ...item,
                    id: Number(item.id),
                  })
                }
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
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

  table: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
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
