import type { ReactNode } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/theme";

export interface FasciaColumn {
  title: string;
  width: number;
}

export default function FasciaTable<T extends { id: string }>({
  columns,
  rows,
  renderCells,
  empty,
  extraData,
  refreshing = false,
  onRefresh,
}: {
  columns: FasciaColumn[];
  rows: T[];
  renderCells: (row: T, index: number) => ReactNode[];
  empty: string;
  extraData?: unknown;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const width = columns.reduce((sum, column) => sum + column.width, 0);
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.horizontal}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View style={{ width, flex: 1 }}>
        <View style={[styles.row, styles.header]}>
          {columns.map((column) => (
            <View
              key={column.title}
              style={[styles.cell, { width: column.width }]}
            >
              <Text accessibilityRole="header" style={styles.heading}>
                {column.title}
              </Text>
            </View>
          ))}
        </View>
        <FlatList
          data={rows}
          extraData={extraData}
          keyExtractor={(row) => String(row.id)}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index % 2 === 1 && styles.striped]}>
              {renderCells(item, index).map((cell, columnIndex) => (
                <View
                  key={columns[columnIndex].title}
                  style={[styles.cell, { width: columns[columnIndex].width }]}
                >
                  {typeof cell === "string" || typeof cell === "number" ? (
                    <Text style={styles.text}>{cell}</Text>
                  ) : (
                    cell
                  )}
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
        />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  horizontal: { alignItems: "stretch" },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: COLORS.white,
  },
  header: { backgroundColor: COLORS.primary },
  striped: { backgroundColor: "#fafafa" },
  cell: {
    padding: 10,
    minHeight: 48,
    justifyContent: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  text: { color: COLORS.text, fontSize: 13 },
  empty: { padding: 20, color: COLORS.textLight },
});
