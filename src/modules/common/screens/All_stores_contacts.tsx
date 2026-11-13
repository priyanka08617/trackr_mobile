import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
} from "@/components/AreaHeaderBackContext";
import AreaIcon from "@/components/AreaIcon";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  loadAreaStores,
  type AreaStore,
} from "../services/All_stores_contacts";

const PAGE_SIZE = 50;
const TABLE_COLUMNS = [
  { title: "#", width: 64 },
  { title: "Store Name", width: 220 },
  { title: "Region", width: 160 },
  { title: "Zone", width: 160 },
  { title: "Contact", width: 160 },
  { title: "Email", width: 300 },
];
const TABLE_WIDTH = TABLE_COLUMNS.reduce(
  (total, column) => total + column.width,
  0,
);

function StoreRow({ store, index }: { store: AreaStore; index: number }) {
  const values = [
    String(index + 1),
    store.name,
    store.region,
    store.zone,
    store.mobileNo,
  ];
  return (
    <View style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
      {values.map((value, columnIndex) => (
        <Text
          key={columnIndex}
          selectable
          style={[styles.cell, { width: TABLE_COLUMNS[columnIndex].width }]}
        >
          {value === "" ? "-" : (value ?? "-")}
        </Text>
      ))}
      <View style={[styles.cell, { width: TABLE_COLUMNS[5].width }]}>
        {store.email ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Email store ${store.email}`}
            onPress={() =>
              void Linking.openURL(`mailto:${store.email}`).catch(() => {})
            }
            style={styles.emailLink}
          >
            <Text style={styles.email}>{store.email}</Text>
          </Pressable>
        ) : (
          <Text style={styles.missing}>-</Text>
        )}
      </View>
    </View>
  );
}

export default function AllStores({ onBack }: { onBack: () => void }) {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const [stores, setStores] = useState<AreaStore[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setStores(await loadAreaStores());
      setPage(1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load stores.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = onBack;
    setBackVisible(true);
    return () => {
      if (backHandlerRef) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, onBack, setBackVisible]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((store) =>
      [
        store.id,
        store.name,
        store.region,
        store.zone,
        store.mobileNo,
        store.email,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [search, stores]);

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageStores = filteredStores.slice(offset, offset + PAGE_SIZE);
  const visiblePageCount = Math.min(5, totalPages);
  const firstVisiblePage = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - visiblePageCount + 1),
  );
  const visiblePages = Array.from(
    { length: visiblePageCount },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Store locations and contact details.
        </Text>
        <AppInput
          accessibilityLabel="Search stores"
          placeholder="Search by ID, name, region, zone, phone or email"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!loading && !error && (
          <Text style={styles.count}>
            {filteredStores.length ? offset + 1 : 0} to{" "}
            {Math.min(offset + PAGE_SIZE, filteredStores.length)} of{" "}
            {filteredStores.length} stores
          </Text>
        )}
      </View>
      {loading || error || pageStores.length === 0 ? (
        <View style={styles.empty}>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : error ? (
            <>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              <AppButton title="Try again" onPress={() => void refresh()} />
            </>
          ) : (
            <Text style={styles.emptyText}>
              {search.trim()
                ? "No stores match your search."
                : "No active stores found."}
            </Text>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.hint}>
            Swipe left or right to view all columns
          </Text>
          <ScrollView
            horizontal
            style={styles.tableScroll}
            contentContainerStyle={styles.tableContent}
          >
            <FlatList
              key={`${currentPage}-${search}`}
              style={{ width: TABLE_WIDTH, flex: 1 }}
              data={pageStores}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item, index }) => (
                <StoreRow store={item} index={offset + index} />
              )}
              keyboardShouldPersistTaps="handled"
              stickyHeaderIndices={[0]}
              ListHeaderComponent={
                <View style={[styles.tableRow, styles.tableHeader]}>
                  {TABLE_COLUMNS.map((column) => (
                    <Text
                      key={column.title}
                      accessibilityRole="header"
                      style={[
                        styles.cell,
                        styles.headerText,
                        { width: column.width },
                      ]}
                    >
                      {column.title}
                    </Text>
                  ))}
                </View>
              }
            />
          </ScrollView>
          <View style={styles.paginationContainer}>
            <Text style={styles.pageLabel}>
              Page {currentPage} of {totalPages}
            </Text>
            <View style={styles.pagination}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                accessibilityState={{ disabled: currentPage === 1 }}
                style={({ pressed }) => [
                  styles.pageIconButton,
                  {
                    opacity: currentPage === 1 ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
                disabled={currentPage === 1}
                onPress={() => setPage(currentPage - 1)}
              >
                <View style={styles.previousIcon}>
                  <AreaIcon name="chevron" size={16} color={COLORS.primary} />
                </View>
              </Pressable>
              {visiblePages.map((page) => (
                <AppButton
                  key={page}
                  title={String(page)}
                  accessibilityLabel={`Page ${page}${page === currentPage ? ", current page" : ""}`}
                  variant={page === currentPage ? "primary" : "outline"}
                  disabled={loading}
                  style={styles.pageButton}
                  textStyle={styles.pageButtonText}
                  onPress={() => {
                    if (page !== currentPage) {
                      setPage(page);
                    }
                  }}
                />
              ))}
              {totalPages > firstVisiblePage + visiblePages.length - 1 && (
                <>
                  {totalPages > firstVisiblePage + visiblePages.length && (
                    <Text style={styles.paginationEllipsis}>...</Text>
                  )}
                  <AppButton
                    title={String(totalPages)}
                    accessibilityLabel={`Last page, page ${totalPages}`}
                    variant="outline"
                    disabled={loading}
                    style={styles.pageButton}
                    textStyle={styles.pageButtonText}
                    onPress={() => setPage(totalPages)}
                  />
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next page"
                accessibilityState={{
                  disabled: currentPage === totalPages,
                }}
                style={({ pressed }) => [
                  styles.pageIconButton,
                  {
                    opacity:
                      currentPage === totalPages ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
                disabled={currentPage === totalPages}
                onPress={() => setPage(currentPage + 1)}
              >
                <AreaIcon name="chevron" size={16} color={COLORS.primary} />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  header: { padding: SPACING.lg, gap: SPACING.sm },
  subtitle: { color: COLORS.textLight, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  count: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  hint: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
  tableScroll: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tableContent: { alignItems: "stretch" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tableHeader: { backgroundColor: COLORS.primary },
  cell: {
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
  },
  headerText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  alternateRow: { backgroundColor: COLORS.surface },
  emailLink: { minHeight: 44, justifyContent: "center" },
  email: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    textDecorationLine: "underline",
  },
  missing: { color: COLORS.textLight, fontSize: FONT_SIZE.sm },
  paginationContainer: { gap: SPACING.sm, padding: SPACING.lg },
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  pageIconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  previousIcon: { transform: [{ rotate: "180deg" }] },
  pageButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 0,
  },
  pageButtonText: { fontSize: FONT_SIZE.xs },
  paginationEllipsis: {
    width: 16,
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
  pageLabel: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
  },
  error: { color: COLORS.danger, textAlign: "center", fontSize: FONT_SIZE.sm },
});
