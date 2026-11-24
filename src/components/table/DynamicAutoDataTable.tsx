import {
  DataTable,
  type TableColumn,
} from "@bestcoder/react-native-data-table";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";
import TableColumnFilter from "./TableColumnFilter";
import TablePagination from "./TablePagination";
import TableSearch from "./TableSearch";

// ============================================
// TYPES
// ============================================

export type DynamicTableRow = Record<string, unknown>;

export type DynamicColumn = {
  title: string;
  dataIndex: string;
  minWidth?: number;
  width?: number;
  fixed?: "left" | "right";
  align?: "left" | "center" | "right";
  searchable?: boolean;
  render?: (record: DynamicTableRow, index: number) => ReactNode;
};

type Props = {
  columns: DynamicColumn[];
  data: DynamicTableRow[];

  height?: number;
  refreshKey?: string | number;

  showSearch?: boolean;
  showPagination?: boolean;
  showColumnFilter?: boolean;
  showPageSize?: boolean;
  compact?: boolean;
  loading?: boolean;
  serverSidePagination?: boolean;
  currentPage?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;

  pageSize?: number;
  pageSizeOptions?: number[];

  searchPlaceholder?: string;
  emptyMessage?: string;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function DynamicDataTable({
  columns,
  data,

  height = 400,
  refreshKey,

  showSearch = false,
  showPagination = false,
  showColumnFilter = false,
  showPageSize = false,
  compact = false,
  loading = false,
  serverSidePagination = false,
  currentPage: externalPage = 1,
  totalRecords: externalTotal = 0,
  onPageChange,
  onPageSizeChange,
  onRefresh,

  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],

  searchPlaceholder = "Search records...",
  emptyMessage = "No records found.",
}: Props) {
  // ============================================
  // STATE
  // ============================================

  const [search, setSearch] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [rowsPerPage, setRowsPerPage] = useState(Math.max(1, pageSize));

  // ============================================
  // SEARCHABLE COLUMNS
  // ============================================

  const searchableColumns = useMemo(
    () => columns.filter((column) => column.searchable !== false),
    [columns],
  );

  // ============================================
  // FILTER RECORDS
  // ============================================

  const filteredData = useMemo(() => {
    if (!showSearch && !showColumnFilter) {
      return data;
    }

    const keyword = search.trim().toLowerCase();

    if (!keyword) return data;

    const activeColumns =
      showColumnFilter && selectedColumn !== "all"
        ? searchableColumns.filter(
            (column) => column.dataIndex === selectedColumn,
          )
        : searchableColumns;

    return data.filter((record) =>
      activeColumns.some((column) => {
        const value = record[column.dataIndex];

        return String(value ?? "")
          .toLowerCase()
          .includes(keyword);
      }),
    );
  }, [
    data,
    search,
    selectedColumn,
    searchableColumns,
    showSearch,
    showColumnFilter,
  ]);

  // ============================================
  // PAGINATION
  // ============================================

  // Server mode receives an already-paginated page from the API.
  const effectivePageSize = serverSidePagination
    ? Math.max(1, pageSize)
    : rowsPerPage;
  const totalRecords = serverSidePagination
    ? Math.max(0, externalTotal)
    : filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / effectivePageSize));
  const activePage = Math.max(
    1,
    Math.min(serverSidePagination ? externalPage : currentPage, totalPages),
  );
  const startIndex = (activePage - 1) * effectivePageSize;

  const paginatedData = useMemo(() => {
    if (!showPagination || serverSidePagination) {
      return filteredData;
    }

    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [
    filteredData,
    showPagination,
    serverSidePagination,
    startIndex,
    rowsPerPage,
  ]);

  // ============================================
  // RESET PAGE
  // ============================================

  useEffect(() => {
    if (!serverSidePagination) setCurrentPage(1);
  }, [search, selectedColumn, rowsPerPage, refreshKey, serverSidePagination]);

  // ============================================
  // TABLE COLUMNS
  // ============================================

  const tableColumns = useMemo<TableColumn<DynamicTableRow>[]>(
    () =>
      columns.map((column) => ({
        title: column.title,
        dataIndex: column.dataIndex,

        minWidth: column.minWidth ?? 40,
        width: column.width,
        fixed: column.fixed,
        align: column.align ?? "left",

        render: column.render,

        renderHeader: () => (
          <Text
            style={[
              styles.headerText,
              compact && styles.compactHeaderText,
            ]}
          >
            {column.title}
          </Text>
        ),
      })),
    [columns, compact],
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {/* SEARCH / COLUMN FILTER */}

      {(showSearch || showColumnFilter) && (
        <View style={styles.controls}>
          {(showSearch || showColumnFilter) && (
            <TableSearch
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
            />
          )}

          {showColumnFilter && (
            <TableColumnFilter
              columns={searchableColumns}
              selectedColumn={selectedColumn}
              onChange={(column) => {
                setSelectedColumn(column);
                setCurrentPage(1);
              }}
            />
          )}
        </View>
      )}

      {/* DATA TABLE */}

      <DataTable
        data={paginatedData}
        columns={tableColumns}
        keyExtractor={(item, index) => {
          const key = item.__rowKey ?? item.id;

          if (key !== undefined && key !== null) {
            return String(key);
          }

          // Prefer unique id or __rowKey
          // in production records.
          return String(showPagination ? startIndex + index : index);
        }}
        height={height}
        remeasureKey={refreshKey}
        stickyHeader
        striped
        stripeColors={[COLORS.white, COLORS.surface]}
        headerStyle={[
          styles.header,
          compact && styles.compactHeader,
        ]}
        headerTextStyle={[
          styles.headerText,
          compact && styles.compactHeaderText,
        ]}
        rowStyle={compact ? styles.compactRow : undefined}
        cellStyle={compact ? styles.compactCell : undefined}
        cellTextStyle={[
          styles.cellText,
          compact && styles.compactCellText,
        ]}
        refreshing={Boolean(onRefresh) && loading}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? null : (
            <View
              style={[
                styles.emptyContainer,
                compact && styles.compactEmptyContainer,
              ]}
            >
              <Text
                style={[
                  styles.emptyText,
                  compact && styles.compactCellText,
                ]}
              >
                {emptyMessage}
              </Text>
            </View>
          )
        }
        border={{
          horizontal: true,
          vertical: true,
          outer: true,
          color: COLORS.border,
          width: 1,
        }}
        theme={{
          primary: COLORS.primary,
          headerBg: COLORS.primary,
          rowBg: COLORS.white,
          text: COLORS.text,
          line: COLORS.border,
        }}
      />

      {/* PAGINATION */}

      {showPagination && (
        <TablePagination
          currentPage={activePage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={effectivePageSize}
          onPageChange={(page) => {
            if (serverSidePagination) {
              onPageChange?.(page);
            } else {
              setCurrentPage(page);
            }
          }}
          onPageSizeChange={(size) => {
            if (serverSidePagination) {
              onPageSizeChange?.(size);
            } else {
              setRowsPerPage(size);
              setCurrentPage(1);
            }
          }}
          compact={compact}
          showPageSize={
            showPageSize && (!serverSidePagination || !!onPageSizeChange)
          }
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: COLORS.white,
  },

  controls: {
    padding: 10,
    gap: 10,
  },

  header: {
    minHeight: 40,
    backgroundColor: COLORS.primary,
  },
  compactHeader: {
    minHeight: 28,
  },

  headerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  compactHeaderText: {
    fontSize: 11,
    lineHeight: 13,
  },

  cellText: {
    color: COLORS.text,
    fontSize: 12,
  },
  compactRow: {
    minHeight: 24,
  },
  compactCell: {
    minHeight: 24,
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  compactCellText: {
    fontSize: 11,
    lineHeight: 13,
  },

  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  compactEmptyContainer: {
    padding: 6,
  },

  emptyText: {
    color: COLORS.textLight,
    fontSize: 13,
    textAlign: "center",
  },
});
