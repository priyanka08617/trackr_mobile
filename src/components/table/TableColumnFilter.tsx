import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { COLORS } from "@/constants/theme";

export type FilterColumn = {
  title: string;
  dataIndex: string;
};

type Props = {
  columns: FilterColumn[];
  selectedColumn: string;
  onChange: (column: string) => void;
};

export default function TableColumnFilter({
  columns,
  selectedColumn,
  onChange,
}: Props) {
  const options = [{ title: "All", dataIndex: "all" }, ...columns];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      {options.map((column) => {
        const active = selectedColumn === column.dataIndex;

        return (
          <Pressable
            key={column.dataIndex}
            onPress={() => onChange(column.dataIndex)}
            style={[styles.button, active && styles.activeButton]}
          >
            <Text style={[styles.text, active && styles.activeText]}>
              {column.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  button: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  activeButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  text: {
    color: COLORS.text,
    fontSize: 12,
  },
  activeText: {
    color: COLORS.white,
    fontWeight: "600",
  },
});
