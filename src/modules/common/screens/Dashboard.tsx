import { AppButton } from "@/components/AppButton";
import { AppLoader } from "@/components/AppLoader";
import AreaIcon from "@/components/AreaIcon";
import AreaPage from "@/components/AreaPage";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  loadDashboardSnapshot,
  type DashboardFilters,
  type DashboardSnapshot,
} from "../services/DashboardService";

const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {};

function DashboardPanel({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.panel, compact && styles.compactPanel]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function DataPlaceholder({ text = "No data yet" }: { text?: string }) {
  return (
    <View style={styles.placeholder}>
      <AreaIcon name="dashboard" color={COLORS.textLight} size={18} />
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

function MiniBarChart({
  points,
  color,
  emptyText,
}: {
  points: { label: string; value: number; count?: number }[];
  color: string;
  emptyText: string;
}) {
  const chartPoints = points.filter((point) => Number.isFinite(point.value));
  if (!chartPoints.length) return <DataPlaceholder text={emptyText} />;
  const maxValue = Math.max(...chartPoints.map((point) => point.value), 1);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Dashboard bar chart"
      style={styles.chart}
    >
      {chartPoints.map((point, index) => {
        const height = Math.max(
          point.value > 0 ? 5 : 0,
          (point.value / maxValue) * 100,
        );
        return (
          <View key={`${point.label}-${index}`} style={styles.chartColumn}>
            {point.count !== undefined && (
              <Text numberOfLines={1} style={styles.chartCount}>
                {point.count} entries
              </Text>
            )}
            <Text numberOfLines={1} style={styles.chartValue}>
              {Math.round(point.value)}%
            </Text>
            <View style={styles.chartTrack}>
              <View
                style={[
                  styles.chartBar,
                  { height: `${height}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text numberOfLines={1} style={styles.chartLabel}>
              {point.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ExceptionTable({ items }: { items: DashboardSnapshot["exceptions"] }) {
  const rows = Object.entries(items);
  const normalizeName = (name: string) =>
    name
      .replace(/&amp;/gi, "&")
      .replace(/[_\s]+/g, " ")
      .trim()
      .toLowerCase();
  const registerEndIndex = Math.max(
    rows.findIndex(([name]) => normalizeName(name) === "global count"),
    rows.length ? 15 : -1,
  );
  const festiveStartIndex = rows.findIndex(([name]) =>
    normalizeName(name).startsWith("ugadi & eid checklist"),
  );
  const pendingOmniIndex = rows.findIndex(([name]) =>
    /pending.*(?:online|omni|om).*return/i.test(normalizeName(name)),
  );
  const categoryForRow = (
    name: string,
    values: DashboardSnapshot["exceptions"][string],
    index: number,
  ) => {
    const normalizedName = normalizeName(name);
    if (/pending.*(?:online|omni|om).*return/i.test(normalizedName)) return 5;
    const suppliedCategory = Number(
      values.register_category ?? values.category,
    );
    if (Number.isFinite(suppliedCategory) && suppliedCategory > 0) {
      return [1, 2, 3, 5].includes(suppliedCategory) ? suppliedCategory : 1;
    }
    if (
      festiveStartIndex >= 0 &&
      index >= festiveStartIndex &&
      (pendingOmniIndex < 0 || index < pendingOmniIndex)
    )
      return 3;
    if (index <= registerEndIndex) return 1;
    if (festiveStartIndex >= 0 && index < festiveStartIndex) return 2;
    if (/festive/i.test(name)) return 3;
    if (/tracker/i.test(name)) return 2;
    return 1;
  };
  const groups = [
    {
      title: "Registers",
      category: 1,
      emptyText: "No register exceptions in this window",
    },
    {
      title: "30 Days Trackers",
      category: 2,
      emptyText: "No tracker exceptions in this window",
    },
    {
      title: "Festive Checklist",
      category: 3,
      emptyText: "No festive checklist exceptions in this window",
    },
    {
      title: "Pending Omni Return",
      category: 5,
      emptyText: "No pending omni return exceptions in this window",
    },
  ];
  const standardColumns = [
    { key: "name", label: "Item", flex: 1.8 },
    { key: "total", label: "Entries", flex: 0.8 },
    { key: "complete", label: "Complete", flex: 1 },
    { key: "partial", label: "Partial", flex: 0.8 },
    { key: "pending", label: "Pending", flex: 0.9 },
  ] as const;
  const sections: {
    title: string;
    category: number;
    rows: (typeof rows)[number][];
    emptyText?: string;
  }[] = groups.map((group) => ({
    title: group.title,
    category: group.category,
    rows: rows.filter(
      ([name, values], index) =>
        categoryForRow(name, values, index) === group.category,
    ),
    emptyText: group.emptyText,
  }));
  return (
    <View style={styles.exceptionTable}>
      {sections.map((section, sectionIndex) => {
        const columns =
          section.category === 3 || section.category === 5
            ? ([
                { key: "name", label: "Item", flex: 1.8 },
                { key: "total", label: "Entries", flex: 0.85 },
                { key: "complete", label: "Complete", flex: 1.1 },
                { key: "pending", label: "Pending", flex: 0.9 },
              ] as const)
            : standardColumns;
        return (
          <View key={section.title} style={styles.exceptionTableSection}>
            {sectionIndex > 0 && <View style={styles.exceptionDivider} />}
            <Text style={styles.exceptionSectionTitle}>{section.title}</Text>
            <View style={styles.exceptionTableRow}>
              {columns.map((column) => (
                <Text
                  key={column.key}
                  style={[styles.exceptionTableHeader, { flex: column.flex }]}
                >
                  {column.label}
                </Text>
              ))}
            </View>
            {!section.rows.length && (
              <Text style={styles.exceptionEmpty}>{section.emptyText}</Text>
            )}
            {section.rows.map(([name, values], index) => (
              <View
                key={name}
                style={[
                  styles.exceptionTableRow,
                  index % 2 === 1 && styles.exceptionTableAltRow,
                ]}
              >
                {columns.map((column) => (
                  <Text
                    key={column.key}
                    numberOfLines={2}
                    style={[
                      styles.exceptionTableCell,
                      { flex: column.flex },
                      column.key === "name" && styles.exceptionName,
                    ]}
                  >
                    {column.key === "name"
                      ? name
                          .replaceAll("_", " ")
                          .replace(/\b\w/g, (letter) => letter.toUpperCase())
                      : String(values[column.key] ?? 0)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function ExceptionVoidTable({
  items,
  grandTotal,
}: {
  items: DashboardSnapshot["exceptionVoids"];
  grandTotal: number;
}) {
  const rows = Object.entries(items).filter(([, item]) => {
    const category = Number(item.register_category ?? item.category);
    return !Number.isFinite(category) || category === 1;
  });
  if (!rows.length) return <DataPlaceholder text="No void data available" />;
  const columns = [
    { key: "register_name", label: "Register", width: 150 },
    { key: "total", label: "Total", width: 78 },
    { key: "pending", label: "Pending", width: 82 },
    { key: "void", label: "Void", width: 76 },
  ] as const;
  return (
    <View style={styles.exceptionVoidGroup}>
      <Text style={styles.exceptionSummary}>Overall total: {grandTotal}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.exceptionTableRow}>
            {columns.map((column) => (
              <Text
                key={column.key}
                style={[styles.exceptionTableHeader, { width: column.width }]}
              >
                {column.label}
              </Text>
            ))}
          </View>
          {rows.map(([id, item], index) => (
            <View
              key={id}
              style={[
                styles.exceptionTableRow,
                index % 2 === 1 && styles.exceptionTableAltRow,
              ]}
            >
              {columns.map((column) => (
                <Text
                  key={column.key}
                  numberOfLines={2}
                  style={[
                    styles.exceptionTableCell,
                    { width: column.width },
                    column.key === "register_name" && styles.exceptionName,
                  ]}
                >
                  {column.key === "register_name"
                    ? (item.register_name ?? "Register")
                    : String(item[column.key] ?? 0)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

type ScoreRow = Record<string, unknown>;

function DashboardScoreTable({
  rows,
  kind,
}: {
  rows: ScoreRow[];
  kind: "ytd" | "critical";
}) {
  if (!rows.length) return <DataPlaceholder text="No data available" />;

  const baseColumns =
    kind === "ytd"
      ? [
          "location",
          "total_ytd_ops_compliance",
          "ytd_customer_performance",
          "ytd_inventory",
          "ytd_process",
          "ytd_critical_indicator",
        ]
      : ["location", "critical_indicator_ytd_score", "no_of_critical_area"];
  const columnsInResponse = Object.keys(rows[0]).filter(
    (column) => !["id", "month", "status", "created_on"].includes(column),
  );
  const columns = [
    ...baseColumns,
    ...columnsInResponse.filter((column) => !baseColumns.includes(column)),
  ];
  const ytdTargets = [
    "82%",
    "10% Deg",
    "70%",
    "0.2%",
    "0.6%",
    "1%",
    "1%",
    "100%",
    "100%",
    "-4%",
    "97%",
    "80%",
    "100%",
    "95%",
    "95%",
    "<3",
    "100%",
    "100%",
    "100%",
    "<70%",
  ];
  const ytdWeights = [
    "4%",
    "5%",
    "5%",
    "3%",
    "10%",
    "3%",
    "3%",
    "5%",
    "5%",
    "5%",
    "5%",
    "5%",
    "3%",
    "5%",
    "5%",
    "5%",
    "5%",
    "4%",
    "5%",
    "10%",
  ];
  const criticalTargets = [
    "80%",
    "10% Deg",
    "10% Deg",
    "3.6",
    "4.8",
    "5%",
    "NA",
    "NA",
    "All day",
    "<30%",
    "80%",
    "90%",
    "97%",
    "97%",
    "0",
    "0.2%",
    "15K",
    "100%",
    "<15%",
    "<5%",
    "<5 days",
    "<5 days",
    "90%",
    "90%",
    "100%",
    "95%",
    "100%",
    "2 each RM",
    "90%-110%",
    "Daily",
    "95%",
    "95%",
    "95%",
    "100%",
    "100%",
    "0",
    "100%",
  ];
  const criticalScores = [
    "2",
    "2",
    "2",
    "3",
    "2",
    "3",
    "0",
    "NA",
    "3",
    "NA",
    "2",
    "4",
    "5",
    "5",
    "5",
    "5",
    "5",
    "2",
    "3",
    "3",
    "3",
    "2",
    "7",
    "2",
    "2",
    "2",
    "2",
    "2",
    "2",
    "3",
    "2",
    "2",
    "2",
    "3",
    "3",
    "2",
    "3",
  ];
  const summaryHeaders =
    kind === "ytd"
      ? [
          "Target\nWeight",
          "100%\n100%",
          "14%\n14%",
          "37%\n37%",
          "39%\n39%",
          "10%\n10%",
          ...columns
            .slice(6)
            .map(
              (_, index) =>
                `${ytdTargets[index] ?? ""}\n${ytdWeights[index] ?? ""}`,
            ),
        ]
      : [
          "Target\nScore",
          "90%\n100%",
          "",
          ...columns
            .slice(3)
            .map(
              (_, index) =>
                `${criticalTargets[index] ?? ""}\n${criticalScores[index] ?? ""}`,
            ),
        ];
  const columnWidth = kind === "ytd" ? 96 : 90;

  const formatColumn = (column: string) => {
    const names: Record<string, string> = {
      total_ytd_ops_compliance: "YTD OPS COMPLIANCE",
      ytd_customer_performance: "CUSTOMER Experience",
      ytd_inventory: "INVENTORY",
      ytd_process: "PROCESS",
      ytd_critical_indicator: "CRITICAL INDICATOR",
      critical_indicator_ytd_score: "CRITICAL INDICATOR YTD SCORE",
      no_of_critical_area: "NOS. OF CRITICAL AREA",
    };
    return names[column] ?? column.replaceAll("_", " ").toUpperCase();
  };
  const formatCell = (column: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    if (kind === "ytd" && column !== "location" && typeof value === "number")
      return `${value}%`;
    return String(value);
  };

  return (
    <View style={styles.scoreTableFrame}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.scoreTableSubheads}>
            <Text
              style={[styles.scoreTableSubhead, { width: columnWidth * 2 }]}
            >
              {kind === "ytd" ? "YTD Ops Score" : "Critical Indicator Score"}
            </Text>
            <Text
              style={[
                styles.scoreTableSubhead,
                { width: columnWidth * Math.max(columns.length - 2, 2) },
              ]}
            >
              {kind === "ytd"
                ? "YTD Parameter Score"
                : "Critical Indicator Parameters"}
            </Text>
          </View>
          <View style={styles.scoreTableRow}>
            {columns.map((column, index) => (
              <Text
                key={`summary-${column}`}
                style={[
                  styles.scoreTableTarget,
                  { width: columnWidth },
                  index < (kind === "ytd" ? 6 : 3) &&
                    styles.scoreTablePrimaryColumn,
                ]}
              >
                {summaryHeaders[index] ?? ""}
              </Text>
            ))}
          </View>
          <View style={[styles.scoreTableRow, styles.scoreTableHeadingRow]}>
            {columns.map((column, index) => (
              <Text
                key={`heading-${column}`}
                style={[
                  styles.scoreTableHeading,
                  { width: columnWidth },
                  index < (kind === "ytd" ? 6 : 3) &&
                    styles.scoreTablePrimaryColumn,
                ]}
              >
                {formatColumn(column)}
              </Text>
            ))}
          </View>
          {rows.map((row, rowIndex) => {
            const isSummary = rowIndex === rows.length - 1;
            return (
              <View
                key={`${String(row.location ?? "row")}-${rowIndex}`}
                style={[
                  styles.scoreTableRow,
                  isSummary && styles.scoreTableSummaryRow,
                ]}
              >
                {columns.map((column, columnIndex) => (
                  <Text
                    key={`${column}-${rowIndex}`}
                    style={[
                      styles.scoreTableCell,
                      { width: columnWidth },
                      columnIndex < (kind === "ytd" ? 6 : 3) &&
                        styles.scoreTablePrimaryColumn,
                      isSummary && styles.scoreTableSummaryCell,
                    ]}
                  >
                    {formatCell(column, row[column])}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function KpiStrip({
  rows,
  reverse = false,
}: {
  rows: DashboardSnapshot["kpis"];
  reverse?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const singleSetWidth = useRef(0);
  const offset = useRef(0);
  const [contentWidth, setContentWidth] = useState(0);
  const colors = [styles.kpiRed, styles.kpiPink, styles.kpiPlum];
  useEffect(() => {
    if (!contentWidth || !singleSetWidth.current) return;
    if (reverse) {
      offset.current = singleSetWidth.current;
      scrollRef.current?.scrollTo({ x: offset.current, animated: false });
    }
    const timer = setInterval(() => {
      if (!singleSetWidth.current) return;
      const step = 0.7;
      offset.current = reverse
        ? offset.current <= 0
          ? singleSetWidth.current
          : offset.current - step
        : offset.current >= singleSetWidth.current
          ? 0
          : offset.current + step;
      scrollRef.current?.scrollTo({ x: offset.current, animated: false });
    }, 32);
    return () => clearInterval(timer);
  }, [contentWidth, reverse, rows.length]);

  if (!rows.length) return null;
  const duplicatedRows = [...rows, ...rows];
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.kpiStrip}
      onContentSizeChange={(width) => {
        singleSetWidth.current = width / 2;
        setContentWidth(width / 2);
      }}
    >
      {duplicatedRows.map((item, index) => (
        <View
          key={`${item.category}-${item.name ?? "kpi"}-${index}`}
          style={[styles.kpiCard, colors[index % colors.length]]}
        >
          <Text style={styles.kpiValue}>{item.count}</Text>
          <Text style={styles.kpiText}>{item.name || "KPI"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ProgressBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={[styles.progressFill, { width: `${percent}%` }]} />
    </View>
  );
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  /*
   * Temporarily disabled until the updated AJAX API is available.
   * Keep this filter-loading code here for later:
   *
   * useEffect(() => {
   *   let active = true;
   *   loadDashboardFilterOptions(zone, region).then((options) => {
   *     if (!active) return;
   *     setZoneOptions(options.zones);
   *     setRegionOptions(options.regions);
   *     setStoreOptions(options.stores);
   *   });
   *   return () => { active = false; };
   * }, [zone, region]);
   */

  useEffect(() => {
    let active = true;
    loadDashboardSnapshot(EMPTY_DASHBOARD_FILTERS)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load dashboard data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const registerKpis =
    snapshot?.kpis.filter((item) => Number(item.category) === 1) ?? [];
  const trackerKpis =
    snapshot?.kpis.filter((item) => Number(item.category) !== 1) ?? [];
  const currentTrackerWeek =
    snapshot?.trackerWeeks.find((item) => item.is_live) ??
    snapshot?.trackerWeeks[snapshot.trackerWeeks.length - 1];
  const currentRegisterWeek =
    snapshot?.registerWeeks.find((item) => item.is_live) ??
    snapshot?.registerWeeks[snapshot.registerWeeks.length - 1];
  const ytdOpsRows = snapshot?.ytdOps as ScoreRow[] | undefined;
  const criticalRows = (snapshot?.criticalLocations ?? []).filter(
    (item): item is ScoreRow => typeof item === "object" && item !== null,
  );
  const trackerPoints = (snapshot?.trackerWeeks ?? [])
    .slice(-6)
    .map((item) => ({
      label: item.week_label ?? "Week",
      value: Number(item.percentage) || 0,
      count: Number(item.count) || 0,
    }));
  const registerPoints = (snapshot?.registerWeeks ?? [])
    .slice(-6)
    .map((item) => ({
      label: item.week_range ?? "Week",
      value: Number(item.percentage) || 0,
      count: Number(item.total_entries) || 0,
    }));
  const liveEmployeePoints = (snapshot?.liveEmployee ?? []).map((item) => ({
    label: item.label ?? "Store",
    value: Number(item.value) || 0,
  }));

  return (
    <AreaPage title="Dashboard">
      {/* Temporarily commented until the updated AJAX filter API is ready.
      <View style={styles.filterPanel}>
        <Text style={styles.filterTitle}>Filter Dashboard</Text>
        <View style={styles.filterGrid}>
          <View style={styles.filterCell}>
            <SelectField
              label="Zone"
              value={zone}
              options={[{ value: "", label: "All zones" }, ...zoneOptions]}
              placeholder="All zones"
              open={openFilter === "zone"}
              onOpenChange={(open) => setOpenFilter(open ? "zone" : null)}
              onChange={(value) => {
                setZone(value);
                setRegion("");
                setStore("");
              }}
            />
          </View>
          <View style={styles.filterCell}>
            <SelectField
              label="Region"
              value={region}
              options={[{ value: "", label: "All regions" }, ...regionOptions]}
              placeholder="All regions"
              disabled={!zone}
              open={openFilter === "region"}
              onOpenChange={(open) => setOpenFilter(open ? "region" : null)}
              onChange={(value) => {
                setRegion(value);
                setStore("");
              }}
            />
          </View>
          <View style={styles.storeFilterCell}>
            <SelectField
              label="Store"
              value={store}
              options={[{ value: "", label: "All stores" }, ...storeOptions]}
              placeholder="All stores"
              disabled={!zone}
              open={openFilter === "store"}
              onOpenChange={(open) => setOpenFilter(open ? "store" : null)}
              onChange={setStore}
            />
          </View>
        </View>
        {filterError && <Text style={styles.filterError}>{filterError}</Text>}
        <View style={styles.filterActions}>
          <AppButton
            title="Apply Filters"
            onPress={() => {
              setLoading(true);
              setError(undefined);
              setAppliedFilters({ zone, region, store });
              setRefreshKey((value) => value + 1);
            }}
            style={styles.filterActionButton}
          />
          <AppButton
            title="Reset"
            variant="outline"
            onPress={() => {
              setZone("");
              setRegion("");
              setStore("");
              setLoading(true);
              setError(undefined);
              setAppliedFilters({});
              setRefreshKey((value) => value + 1);
            }}
            style={styles.filterActionButton}
          />
        </View>
      </View>
      */}

      {loading && <AppLoader message="Loading dashboard data..." />}
      {error && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Text style={styles.errorHint}>
            Check your sign-in session and try again.
          </Text>
        </View>
      )}
      {!!snapshot?.warnings.length && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Some dashboard data could not load. Refresh to try again.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole={
          snapshot?.announcements.length ? "button" : undefined
        }
        accessibilityLabel={
          snapshot?.announcements.length
            ? "Open announcements"
            : "Announcements"
        }
        disabled={!snapshot?.announcements.length}
        onPress={() => setShowAnnouncements(true)}
        style={({ pressed }) => [
          styles.announcement,
          pressed && styles.announcementPressed,
        ]}
      >
        <Image
          accessible={false}
          pointerEvents="none"
          source={require("../../../../assets/images/icons/home-card-gradient.svg")}
          contentFit="fill"
          style={styles.announcementGradient}
        />
        <Text style={styles.announcementLabel}>Announcement</Text>
        <Text style={styles.announcementText}>
          {loading && !snapshot
            ? "Loading announcements..."
            : snapshot?.announcements.length
              ? `You have ${snapshot.announcements.length} announcement${snapshot.announcements.length === 1 ? "" : "s"} for today.`
              : "No announcements"}
        </Text>
      </Pressable>

      <Modal
        transparent
        animationType="fade"
        visible={showAnnouncements}
        onRequestClose={() => setShowAnnouncements(false)}
      >
        <View style={styles.announcementOverlay}>
          <View accessibilityViewIsModal style={styles.announcementDialog}>
            <Text style={styles.announcementDialogTitle}>Announcements</Text>
            <ScrollView
              style={styles.announcementList}
              contentContainerStyle={styles.announcementListContent}
            >
              {(snapshot?.announcements ?? []).map((item, index) => (
                <View key={item.id} style={styles.announcementItem}>
                  <Text style={styles.announcementItemTitle}>
                    Announcement {index + 1}
                  </Text>
                  <Text style={styles.bodyText}>{item.message}</Text>
                </View>
              ))}
            </ScrollView>
            <AppButton
              title="Close"
              variant="outline"
              onPress={() => setShowAnnouncements(false)}
            />
          </View>
        </View>
      </Modal>

      <DashboardPanel title="Live Log-in">
        <View style={styles.liveStats}>
          <View style={[styles.liveStat, styles.liveStatPink]}>
            <Text style={styles.statLabel}>Active Today</Text>
            <Text style={styles.statValue}>
              {snapshot
                ? (snapshot.storeActivity.active_stores_today ?? 0)
                : "--"}
            </Text>
          </View>
          <View style={[styles.liveStat, styles.liveStatPlum]}>
            <Text style={styles.statLabel}>Total Stores</Text>
            <Text style={styles.statValue}>
              {snapshot ? (snapshot.storeActivity.total_stores ?? 0) : "--"}
            </Text>
          </View>
        </View>
        {snapshot ? (
          <>
            <Text style={styles.bodyText}>
              {snapshot.storeActivity.percent ?? 0}% of stores active today
            </Text>
            <ProgressBar value={snapshot.storeActivity.percent ?? 0} />
          </>
        ) : (
          <DataPlaceholder text="Store activity unavailable" />
        )}
      </DashboardPanel>

      <View style={styles.cardGrid}>
        <View style={styles.gridCell}>
          <DashboardPanel title="YTD OPS" compact>
            <DashboardScoreTable rows={ytdOpsRows ?? []} kind="ytd" />
          </DashboardPanel>
        </View>
        <View style={styles.gridCell}>
          <DashboardPanel title="Critical Indicator" compact>
            <DashboardScoreTable rows={criticalRows} kind="critical" />
          </DashboardPanel>
        </View>
        <View style={styles.gridCell}>
          <DashboardPanel title="KPIs" compact>
            {registerKpis.length || trackerKpis.length ? (
              <>
                <KpiStrip rows={registerKpis} />
                <KpiStrip rows={trackerKpis} reverse />
              </>
            ) : (
              <DataPlaceholder text="KPI data unavailable" />
            )}
          </DashboardPanel>
        </View>
        <View style={styles.gridCell}>
          <DashboardPanel title="Weekly Tracker Fill %" compact>
            <MiniBarChart
              points={trackerPoints}
              color={COLORS.primary}
              emptyText={
                currentTrackerWeek
                  ? `${currentTrackerWeek.percentage ?? 0}% · ${currentTrackerWeek.count ?? 0} entries`
                  : "Weekly tracker data unavailable"
              }
            />
          </DashboardPanel>
        </View>
        <View style={styles.gridCell}>
          <DashboardPanel title="Weekly Register Fill %" compact>
            <MiniBarChart
              points={registerPoints}
              color={COLORS.secondary}
              emptyText={
                currentRegisterWeek
                  ? `${currentRegisterWeek.percentage ?? 0}% · ${currentRegisterWeek.total_entries ?? 0} entries`
                  : "Weekly register data unavailable"
              }
            />
          </DashboardPanel>
        </View>
        <View style={styles.gridCell}>
          <DashboardPanel title="Live Employee Users" compact>
            <MiniBarChart
              points={liveEmployeePoints}
              color="#6b4147"
              emptyText="Live employee data unavailable"
            />
          </DashboardPanel>
        </View>
        <View style={styles.gridCell}>
          <DashboardPanel title="Exception Window · 30 Days" compact>
            <ExceptionTable items={snapshot?.exceptions ?? {}} />
            <View style={styles.exceptionDivider} />
            <Text style={styles.exceptionSectionTitle}>Void</Text>
            <ExceptionVoidTable
              items={snapshot?.exceptionVoids ?? {}}
              grandTotal={snapshot?.exceptionVoidSummary.grand_total ?? 0}
            />
          </DashboardPanel>
        </View>
      </View>

      <DashboardPanel title="Reports">
        <Text style={styles.bodyText}>
          Choose a report to view or download.
        </Text>
        {/* <View style={styles.reportActions}>
          <AppButton
            title="Report Dump"
            onPress={() => router.push("/areamanger/report")}
            style={[styles.actionButton, styles.reportButton]}
          />
          <AppButton
            title="Exception Reports"
            variant="outline"
            onPress={() => router.push("/areamanger/report")}
            style={styles.reportButton}
          />
        </View> */}
      </DashboardPanel>
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  filterPanel: {
    position: "relative",
    zIndex: 5,
    backgroundColor: COLORS.white,
    borderColor: "#d1c4c6",
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  filterTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  filterCell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
  storeFilterCell: { flexBasis: "100%", minWidth: 0 },
  filterActions: { flexDirection: "row", gap: SPACING.sm },
  filterActionButton: { flex: 1, minWidth: 0 },
  filterError: { color: COLORS.danger, fontSize: FONT_SIZE.xs },
  panel: {
    backgroundColor: COLORS.white,
    borderColor: "#d1c4c6",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    minWidth: 0,
  },
  compactPanel: { flex: 1 },
  panelHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 38,
    justifyContent: "center",
  },
  panelTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    lineHeight: 17,
    fontWeight: FONT_WEIGHT.semibold,
  },
  panelBody: { padding: SPACING.sm, gap: SPACING.sm },
  bodyText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 21,
    flexShrink: 1,
  },
  announcement: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#f5eddf",
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  announcementGradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  announcementPressed: { opacity: 0.75 },
  announcementLabel: {
    color: COLORS.white,
    backgroundColor: COLORS.danger,
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    borderWidth: 1,
    borderColor: "#ff2222",
  },
  announcementText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
  },
  announcementOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  announcementDialog: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  announcementDialogTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  announcementList: { flexGrow: 0 },
  announcementListContent: { gap: SPACING.sm },
  announcementItem: {
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  announcementItemTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  liveStats: { flexDirection: "row", gap: SPACING.sm },
  liveStat: {
    flex: 1,
    borderRadius: 6,
    padding: SPACING.sm,
    gap: SPACING.xs,
    minWidth: 0,
  },
  liveStatPink: { backgroundColor: COLORS.secondary },
  liveStatPlum: { backgroundColor: "#6b4147" },
  statLabel: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  statValue: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  placeholder: {
    minHeight: 54,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  placeholderText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    textAlign: "center",
  },
  chart: {
    height: 142,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  chartColumn: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
  },
  chartCount: {
    color: COLORS.text,
    fontSize: 8,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "center",
  },
  chartValue: { color: COLORS.textLight, fontSize: 9, textAlign: "center" },
  chartTrack: {
    width: "70%",
    flex: 1,
    maxWidth: 30,
    minHeight: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBar: { width: "100%", borderRadius: 4, minHeight: 2 },
  chartLabel: {
    color: COLORS.textLight,
    fontSize: 8,
    textAlign: "center",
    width: "100%",
  },
  exceptionTable: { width: "100%", minWidth: 0 },
  exceptionTableSection: { width: "100%", minWidth: 0 },
  exceptionTableRow: { flexDirection: "row", width: "100%", minWidth: 0 },
  exceptionTableHeader: {
    minWidth: 0,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    padding: SPACING.xs,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.2)",
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "center",
  },
  exceptionTableAltRow: { backgroundColor: COLORS.surface },
  exceptionTableCell: {
    minWidth: 0,
    color: COLORS.text,
    minHeight: 38,
    padding: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    fontSize: FONT_SIZE.xs,
    textAlign: "center",
    textAlignVertical: "center",
  },
  exceptionName: { textAlign: "left", textTransform: "capitalize" },
  exceptionDivider: {
    height: 1,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  exceptionSectionTitle: {
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  exceptionEmpty: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    paddingVertical: SPACING.sm,
  },
  exceptionVoidGroup: { gap: SPACING.xs },
  exceptionSummary: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    textAlign: "right",
  },
  scoreTableFrame: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    backgroundColor: COLORS.white,
  },
  scoreTableSubheads: {
    flexDirection: "row",
    gap: SPACING.xs,
    padding: SPACING.xs,
  },
  scoreTableSubhead: {
    flexGrow: 0,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scoreTableRow: { flexDirection: "row" },
  scoreTableTarget: {
    minHeight: 42,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#8a686e",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 9,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scoreTablePrimaryColumn: { borderRightWidth: 1, borderRightColor: "#b7b7b7" },
  scoreTableHeadingRow: { backgroundColor: COLORS.surface },
  scoreTableHeading: {
    minHeight: 54,
    color: COLORS.text,
    padding: 5,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
  },
  scoreTableCell: {
    minHeight: 34,
    color: COLORS.text,
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e1e2",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 10,
  },
  scoreTableSummaryRow: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  scoreTableSummaryCell: { fontWeight: FONT_WEIGHT.bold },
  errorBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  errorHint: { color: COLORS.textLight, fontSize: FONT_SIZE.xs },
  warningBox: {
    backgroundColor: "#fff6e5",
    borderWidth: 1,
    borderColor: "#e6c477",
    borderRadius: 8,
    padding: SPACING.sm,
  },
  warningText: { color: COLORS.text, fontSize: FONT_SIZE.xs },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  gridCell: { flexBasis: "100%", width: "100%", minWidth: 0 },
  kpiStrip: { gap: SPACING.sm, paddingRight: SPACING.sm, paddingVertical: 2 },
  kpiCard: {
    width: 150,
    minHeight: 92,
    borderRadius: 6,
    padding: SPACING.md,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  kpiRed: { backgroundColor: COLORS.primary },
  kpiPink: { backgroundColor: COLORS.secondary },
  kpiPlum: { backgroundColor: "#6b4147" },
  kpiText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  kpiValue: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  reportActions: { flexDirection: "row", gap: SPACING.sm },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reportButton: { flex: 1, minWidth: 0, paddingHorizontal: SPACING.sm },
  portalGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  portalCell: { flexBasis: "47%", flexGrow: 1, minWidth: 0 },
});
