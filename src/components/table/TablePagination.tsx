import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

type Props = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;

  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  showPageSize?: boolean;
  pageSizeOptions?: number[];
  compact?: boolean;
};

export default function TablePagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSize = false,
  pageSizeOptions = [10, 25, 50, 100],
  compact = false,
}: Props) {
  const first = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const last = Math.min(currentPage * pageSize, totalRecords);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Text style={[styles.recordInfo, compact && styles.compactText]}>
        Showing {first} to {last} of {totalRecords} entries
      </Text>

      {showPageSize && onPageSizeChange && (
        <View style={styles.pageSizeContainer}>
          <Text style={styles.label}>Show entries:</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sizeButtons}
          >
            {pageSizeOptions
              .filter((size) => Number.isInteger(size) && size > 0)
              .map((size) => {
                const active = pageSize === size;

                return (
                  <Pressable
                    key={size}
                    onPress={() => onPageSizeChange(size)}
                    style={[styles.sizeButton, active && styles.activeButton]}
                  >
                    <Text
                      style={[styles.sizeText, active && styles.activeText]}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
      )}

      <View style={[styles.pagination, compact && styles.compactPagination]}>
        <Pressable
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={[
            styles.pageButton,
            compact && styles.compactPageButton,
            currentPage <= 1 && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.pageButtonText,
              compact && styles.compactPageButtonText,
            ]}
          >
            Previous
          </Text>
        </Pressable>

        <Text style={[styles.pageInfo, compact && styles.compactText]}>
          {currentPage} / {totalPages}
        </Text>

        <Pressable
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={[
            styles.pageButton,
            compact && styles.compactPageButton,
            currentPage >= totalPages && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.pageButtonText,
              compact && styles.compactPageButtonText,
            ]}
          >
            Next
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  compactContainer: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  recordInfo: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  compactText: {
    fontSize: 11,
    lineHeight: 14,
  },
  pageSizeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 12,
    color: COLORS.text,
  },
  sizeButtons: {
    flexDirection: "row",
    gap: 6,
  },
  sizeButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sizeText: {
    color: COLORS.text,
    fontSize: 12,
  },
  activeText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  compactPagination: {
    justifyContent: "flex-end",
    gap: 8,
  },
  pageButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  compactPageButton: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  compactPageButtonText: {
    fontSize: 10,
  },
  pageInfo: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
});
