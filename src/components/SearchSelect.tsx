import { AppInput } from "@/components/AppInput";
import { COLORS, SPACING } from "@/constants/theme";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export interface SearchOption {
  value: string;
  label: string;
}
export default function SearchSelect({
  label,
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  disabledReason,
  placeholder = "Select",
}: {
  label: string;
  options: SearchOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const controlRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({
    x: 12,
    y: 80,
    width: 280,
    height: 48,
  });
  const [blocked, setBlocked] = useState(false);
  const window = useWindowDimensions();
  const dropdownHeight = Math.min(280, window.height * 0.45);
  const dropdownWidth = Math.min(
    Math.max(anchor.width, 220),
    window.width - 24,
  );
  const left = Math.max(
    12,
    Math.min(anchor.x, window.width - dropdownWidth - 12),
  );
  const below = anchor.y + anchor.height + 3;
  const top = Math.max(
    12,
    below + dropdownHeight < window.height - 20
      ? below
      : anchor.y - dropdownHeight - 3,
  );
  const locationOptions = new Map<string, SearchOption>();
  if (!multiple && /^(zone|region)s?$/i.test(label.trim())) {
    for (const option of options) {
      const key = option.label.trim().toLowerCase();
      const existing = locationOptions.get(key);
      // Keep the selected API value when differently cased names collide.
      if (!existing || value.includes(option.value))
        locationOptions.set(key, option);
    }
  }
  const displayOptions = locationOptions.size
    ? [...locationOptions.values()]
    : options;
  const names = new Map(options.map((option) => [option.value, option.label]));
  function choose(id: string) {
    if (multiple)
      onChange(
        value.includes(id)
          ? value.filter((item) => item !== id)
          : [...value, id],
      );
    else {
      onChange([id]);
      setOpen(false);
    }
  }
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        ref={controlRef}
        collapsable={false}
        style={[
          styles.control,
          open && !disabled && styles.focused,
          disabled && styles.disabled,
        ]}
      >
        {multiple &&
          value.map((id) => (
            <View key={id} style={styles.chip}>
              <Text style={styles.chipLabel}>{names.get(id) ?? id}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${names.get(id) ?? id}`}
                disabled={disabled}
                onPress={() => onChange(value.filter((item) => item !== id))}
                style={styles.remove}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${multiple ? `${value.length} selected` : (names.get(value[0]) ?? "Select")}`}
          accessibilityState={{ expanded: open && !disabled, disabled }}
          disabled={disabled && !disabledReason}
          onPress={() => {
            if (disabled) {
              setBlocked(true);
              return;
            }
            setBlocked(false);
            setSearch("");
            controlRef.current?.measureInWindow((x, y, width, height) => {
              setAnchor({ x, y, width, height });
              setOpen(true);
            });
          }}
          style={styles.trigger}
        >
          <Text style={[styles.selection, !value.length && styles.placeholder]}>
            {multiple
              ? value.length
                ? "Add more…"
                : "Select stores / locations"
              : (names.get(value[0]) ?? placeholder)}
          </Text>
          <Text accessible={false} style={styles.arrow}>
            {open && !disabled ? "▴" : "▾"}
          </Text>
        </Pressable>
      </View>
      {blocked && disabled && disabledReason && (
        <Text accessibilityRole="alert" style={styles.error}>
          {disabledReason}
        </Text>
      )}
      {open && !disabled && (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.overlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dismiss ${label} options`}
              style={StyleSheet.absoluteFill}
              onPress={() => setOpen(false)}
            />
            <View
              accessibilityViewIsModal
              style={[
                styles.dropdown,
                {
                  position: "absolute",
                  left,
                  top,
                  width: dropdownWidth,
                  maxHeight: dropdownHeight,
                },
              ]}
            >
              <AppInput
                value={search}
                onChangeText={setSearch}
                accessibilityLabel={`Search ${label}`}
                placeholder="Search…"
                autoCapitalize="none"
              />
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="always"
                style={styles.list}
              >
                {displayOptions
                  .filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes(search.trim().toLowerCase()),
                  )
                  .map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole={multiple ? "checkbox" : "radio"}
                      accessibilityState={{
                        checked: value.includes(option.value),
                      }}
                      onPress={() => choose(option.value)}
                      style={({ pressed }) => [
                        styles.option,
                        value.includes(option.value) && styles.selected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {value.includes(option.value) && (
                        <Text style={styles.check}>✓</Text>
                      )}
                    </Pressable>
                  ))}
                {!displayOptions.some((option) =>
                  option.label
                    .toLowerCase()
                    .includes(search.trim().toLowerCase()),
                ) && <Text style={styles.empty}>No results found</Text>}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1 },
  error: { color: COLORS.danger, fontSize: 13 },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: "500", color: COLORS.text },

  control: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 5,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 0,
    gap: 5,
  },

  focused: { borderColor: COLORS.primary },
  disabled: { opacity: 0.5, backgroundColor: "#eee" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexGrow: 1,
    minHeight: 34,
    paddingHorizontal: 6,
    gap: 8,
  },
  selection: { flexShrink: 1, color: COLORS.text, fontSize: 14 },
  placeholder: { color: COLORS.textLight },
  arrow: { color: "#777", fontSize: 18 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#e9e9e9",
    borderRadius: 4,
    paddingLeft: 8,
    maxWidth: "100%",
  },
  chipLabel: { color: COLORS.text, fontSize: 13, flexShrink: 1 },
  remove: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "#666", fontSize: 20 },
  dropdown: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 4,
    backgroundColor: COLORS.white,
    padding: SPACING.xs,
    gap: 4,
  },
  list: { maxHeight: 220, flexShrink: 1 },
  option: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  selected: { backgroundColor: "#f5e9ea" },
  pressed: { backgroundColor: "#e5d3d5" },
  optionLabel: { color: COLORS.text, fontSize: 14, flex: 1 },
  check: { color: COLORS.primary, fontWeight: "600" },
  empty: { padding: 16, color: COLORS.textLight },
});
