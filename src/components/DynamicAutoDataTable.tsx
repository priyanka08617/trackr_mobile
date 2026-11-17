import {
  DataTable,
  type TableColumn,
} from "@bestcoder/react-native-data-table";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/theme";

type TableRow = Record<string, unknown>;

type DynamicColumn = {
  title: string;
  dataIndex: string;
  minWidth?: number;
  width?: number;
  fixed?: "left" | "right";
  align?: "left" | "center" | "right";
};

type Props = {
  columns: DynamicColumn[];
  data: TableRow[];
  height?: number;
  refreshKey?: string | number;
};

export default function DynamicDataTable({
  columns,
  data,
  height = 400,
  refreshKey,
}: Props) {
  const tableColumns = useMemo<TableColumn<TableRow>[]>(
    () =>
      columns.map((column) => ({
        title: column.title,
        dataIndex: column.dataIndex,
        minWidth: column.minWidth ?? 110,
        width: column.width,
        fixed: column.fixed,
        align: column.align ?? "left",

        renderHeader: () => (
          <Text style={styles.headerText}>{column.title}</Text>
        ),
      })),
    [columns],
  );

  return (
    <View style={styles.container}>
      <DataTable
        data={data}
        columns={tableColumns}
        keyExtractor={(item, index) =>
          String(item.__rowKey ?? item.id ?? index)
        }
        height={height}
        remeasureKey={refreshKey}
        stickyHeader
        striped
        stripeColors={[COLORS.white, COLORS.surface]}
        headerStyle={styles.header}
        headerTextStyle={styles.headerText}
        cellTextStyle={styles.cellText}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: COLORS.white,
  },

  header: {
    minHeight: 58,
    backgroundColor: COLORS.primary,
  },

  headerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
    flexWrap: "wrap",
  },

  cellText: {
    color: COLORS.text,
    fontSize: 12,
  },
});
