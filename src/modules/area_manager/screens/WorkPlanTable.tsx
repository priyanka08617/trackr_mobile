import { COLORS, SPACING } from "@/constants/theme";
import type { ReactNode } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";

export interface WorkPlanColumn {
  title: string;
  width: number;
}

export default function WorkPlanTable<T extends { id: string }>({
  columns, rows, renderCells, empty, refreshing, onRefresh, extraData,
}: {
  columns: WorkPlanColumn[];
  rows: T[];
  renderCells: (item: T, index: number) => ReactNode[];
  empty: string;
  refreshing: boolean;
  onRefresh: () => void;
  extraData?: unknown;
}) {
  const width = columns.reduce((sum, column) => sum + column.width, 0);
  return (
    <ScrollView horizontal style={styles.horizontal} contentContainerStyle={{ width }}>
      <FlatList
        style={{ width }}
        data={rows}
        keyExtractor={(item) => item.id}
        extraData={extraData}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={[styles.row, styles.header]}>
            {columns.map((column, index) => (
              <View key={index} style={[styles.cell, { width: column.width }]}>
                <Text style={styles.heading}>{column.title}</Text>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            {renderCells(item, index).map((cell, cellIndex) => (
              <View key={cellIndex} style={[styles.cell, { width: columns[cellIndex]?.width }]}>
                {typeof cell === "string" || typeof cell === "number"
                  ? <Text style={styles.text}>{cell}</Text>
                  : cell}
              </View>
            ))}
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontal: { flex: 1 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  header: { backgroundColor: COLORS.surface },
  cell: { padding: SPACING.sm, justifyContent: "center", borderRightWidth: 1, borderRightColor: COLORS.border },
  heading: { color: COLORS.primary, fontWeight: "600" },
  text: { color: COLORS.text },
  empty: { color: COLORS.textLight, padding: SPACING.lg },
});
