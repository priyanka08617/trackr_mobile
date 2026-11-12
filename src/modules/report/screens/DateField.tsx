import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppInput } from "@/components/AppInput";
import { AppButton } from "@/components/AppButton";
import { COLORS, SPACING } from "@/constants/theme";
import AreaIcon from "@/components/AreaIcon";
import { today, validDate } from "../services/service";

function dateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function Calendar({
  value,
  minDate,
  maxDate,
  onChange,
  onClose,
}: {
  value: string;
  minDate?: string;
  maxDate?: string;
  onChange: (date: string) => void;
  onClose: () => void;
}) {
  const [year, month] = (validDate(value) ? value : today())
    .split("-")
    .map(Number);
  const [view, setView] = useState(() => new Date(year, month - 1, 1));
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const dayCount = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0,
  ).getDate();
  const title = view.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  function pick(date: string) {
    if ((minDate && date < minDate) || (maxDate && date > maxDate)) return;
    onChange(date);
    onClose();
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.calendar}>
          <View style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={styles.monthButton}
              onPress={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
            >
              <Text style={styles.arrow}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.month}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={Boolean(
                maxDate &&
                dateString(view.getFullYear(), view.getMonth() + 1, 1) >
                  maxDate,
              )}
              style={styles.monthButton}
              onPress={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
            >
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((name) => (
              <View key={name} style={styles.cell}>
                <Text style={styles.weekday}>{name}</Text>
              </View>
            ))}
            {Array.from(
              { length: Math.ceil((firstDay + dayCount) / 7) * 7 },
              (_, index) => {
                const day = index - firstDay + 1;
                if (day < 1 || day > dayCount)
                  return <View key={index} style={styles.cell} />;
                const date = dateString(
                  view.getFullYear(),
                  view.getMonth(),
                  day,
                );
                const disabled = Boolean(
                  (minDate && date < minDate) || (maxDate && date > maxDate),
                );
                return (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={date}
                    accessibilityState={{ selected: date === value, disabled }}
                    disabled={disabled}
                    onPress={() => pick(date)}
                    style={[
                      styles.cell,
                      date === value && styles.selected,
                      disabled && styles.disabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.day,
                        date === value && styles.selectedText,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
          <View style={styles.actions}>
            <AppButton
              title="Today"
              variant="outline"
              disabled={Boolean(
                (minDate && today() < minDate) ||
                (maxDate && today() > maxDate),
              )}
              onPress={() => pick(today())}
            />
            <AppButton title="Cancel" variant="outline" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
export default function DateField({
  label,
  value,
  onChange,
  disabled,
  minDate,
  maxDate,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <AppInput
          value={value}
          accessibilityLabel={label}
          onChangeText={(next) => {
            if (
              validDate(next) &&
              ((minDate && next < minDate) || (maxDate && next > maxDate))
            )
              return;
            onChange(next);
          }}
          editable={!disabled}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          containerStyle={styles.input}
          style={compact ? styles.compactInput : undefined}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open calendar for ${label}`}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={[styles.calendarButton, compact && styles.compactCalendar]}
        >
          <AreaIcon name="calendar" size={compact ? 16 : 20} />
        </Pressable>
      </View>
      {open && !disabled && (
        <Calendar
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  compactInput: { fontSize: 12, paddingHorizontal: 6 },
  compactCalendar: { width: 36 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: "500" },
  inputRow: { flexDirection: "row", alignItems: "stretch" },
  input: { flex: 1 },
  calendarButton: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calendar: {
    width: "100%",
    maxWidth: 370,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    gap: SPACING.md,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  month: { color: COLORS.primary, fontWeight: "600", fontSize: 17 },
  monthButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { color: COLORS.primary, fontSize: 28 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  selected: { backgroundColor: COLORS.primary },
  disabled: { opacity: 0.3 },
  weekday: { color: COLORS.textLight, fontWeight: "600" },
  day: { color: COLORS.text, fontSize: 15 },
  selectedText: { color: COLORS.white },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
});
