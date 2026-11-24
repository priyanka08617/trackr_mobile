import { router } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
// Adjust this path to your actual Table folder
import DynamicDataTable, {
  type DynamicColumn,
  type DynamicTableRow,
} from "@/components/table/DynamicAutoDataTable";
import { SPACING } from "@/constants/theme";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/AppButton";
import { AppLoader } from "@/components/AppLoader";

import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";

import AreaIcon from "@/components/AreaIcon";
import { COLORS } from "@/constants/theme";

import ChecklistDialog, { type ChecklistNotice } from "./ChecklistDialog";

import { useRmChecklistData } from "./DataContext";

const PAGE_SIZE = 50;

export default function ChecklistList() {
  // ============================================
  // HEADER CONTEXT
  // ============================================

  const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);

  const setHeaderTitle = useContext(AreaHeaderTitleContext);

  const headerBackHandler = useContext(AreaHeaderBackContext);

  // ============================================
  // DATA CONTEXT
  // ============================================

  const {
    records,
    loading = false,
    error,
    onRefresh,
    onDelete,
  } = useRmChecklistData();

  // ============================================
  // STATE
  // ============================================

  const [removeCode, setRemoveCode] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const [notice, setNotice] = useState<ChecklistNotice>();

  // ============================================
  // HEADER CONFIGURATION
  // ============================================

  useEffect(() => {
    const goBack = () => {
      router.replace("/area_manager/settings");
    };

    if (headerBackHandler) {
      headerBackHandler.current = goBack;
    }

    setHeaderBackVisible(true);
    setHeaderTitle("RM Checklist");

    return () => {
      setHeaderBackVisible(false);
      setHeaderTitle(null);

      if (headerBackHandler?.current === goBack) {
        headerBackHandler.current = null;
      }
    };
  }, [headerBackHandler, setHeaderBackVisible, setHeaderTitle]);

  // ============================================
  // NAVIGATION
  // ============================================

  const openDetails = useCallback((code: string) => {
    router.push({
      pathname: "/area_manager/rm_checklist_details",
      params: { code },
    });
  }, []);

  const openAddForm = useCallback(() => {
    router.push("/area_manager/rm_checklist_form");
  }, []);

  // ============================================
  // DELETE CHECKLIST
  // ============================================

  async function remove() {
    if (!removeCode || !onDelete || busy) return;

    setBusy(true);

    try {
      await onDelete(removeCode);

      setRemoveCode(null);

      setNotice({
        kind: "success",
        title: "Deleted!",
        message: "Checklist deleted successfully.",
      });
    } catch (cause) {
      setRemoveCode(null);

      setNotice({
        kind: "error",
        title: "Error!",
        message:
          cause instanceof Error
            ? cause.message
            : "Unable to delete this checklist.",
      });
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // PREPARE DYNAMIC TABLE DATA
  // ============================================

  const tableData = useMemo<DynamicTableRow[]>(
    () =>
      records.map((item, index) => ({
        __rowKey: item.code,
        serial: index + 1,
        code: item.code,
        store: item.store,
        date: item.date,
        manager: item.manager || "-",
        status: item.status,
      })),
    [records],
  );

  // ============================================
  // DYNAMIC TABLE COLUMNS
  // ============================================

  const columns = useMemo<DynamicColumn[]>(
    () => [
      {
        title: "#",
        dataIndex: "serial",
        // width: 50,
        align: "center",
        searchable: false,
      },
      {
        title: "RM Code",
        dataIndex: "code",
        // minWidth: 150,
        render: (record) => (
          <TouchableOpacity
            disabled={busy}
            onPress={() => openDetails(String(record.code))}
          >
            <Text style={styles.codeText}>{String(record.code ?? "")}</Text>
          </TouchableOpacity>
        ),
      },
      {
        title: "Store",
        dataIndex: "store",
        // minWidth: 160,
        render: (record) => (
          <Text style={styles.storeText}>{String(record.store ?? "-")}</Text>
        ),
      },
      {
        title: "Checklist Date",
        dataIndex: "date",
        // minWidth: 140,
        align: "center",
      },
      {
        title: "Area Manager",
        dataIndex: "manager",
        // minWidth: 150,
      },
      {
        title: "Status",
        dataIndex: "status",
        // minWidth: 190,
        render: (record) => {
          const completed = Number(record.status) === 2;

          return (
            <View
              style={[
                styles.badge,
                completed ? styles.completed : styles.pending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: completed ? COLORS.white : COLORS.black,
                  },
                ]}
              >
                {completed ? "Completed" : "Waiting For Store Remark"}
              </Text>
            </View>
          );
        },
      },
      {
        title: "Action",
        dataIndex: "action",
        minWidth: 110,
        align: "center",
        searchable: false,
        render: (record) => {
          const code = String(record.code ?? "");

          return (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel={`View checklist ${code}`}
                disabled={busy}
                onPress={() => openDetails(code)}
              >
                <AreaIcon name="report" color={COLORS.primary} size={20} />
              </TouchableOpacity>

              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove checklist ${code}`}
                  disabled={busy}
                  onPress={() => setRemoveCode(code)}
                >
                  <View style={styles.removeIconCircle}>
                    <AreaIcon name="close" color={COLORS.black} size={14} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        },
      },
    ],
    [busy, onDelete, openDetails],
  );

  // ============================================
  // RENDER PAGE
  // ============================================

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {/* ====================================================== */}
        {/* ADD BUTTON */}
        {/* <View style={styles.topRow}>
          <AppButton
            title="+ Add"
            variant="outline"
            onPress={openAddForm}
            disabled={busy}
            style={styles.addButton}
            textStyle={styles.addButtonText}
          />
        </View> */}
        <View style={styles.topRow}>
          <Text style={styles.helperText}>
            View and manage RM Checklist records
          </Text>

          <AppButton
            title="+ Add RM"
            variant="outline"
            onPress={openAddForm}
            disabled={busy}
            style={styles.addButton}
            textStyle={styles.addButtonText}
          />
          <View style={styles.hr} />
        </View>
        {/* ======================================================= */}
        {/* ERROR */}
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {error && onRefresh && (
          <AppButton title="Retry" onPress={onRefresh} disabled={loading} />
        )}
        {/* DYNAMIC DATA TABLE */}
        {loading && tableData.length === 0 ? (
          <AppLoader message="Loading checklists..." />
        ) : (
          <DynamicDataTable
            columns={columns}
            data={tableData}
            height={480}
            // loading={loading}
            showSearch
            showPagination
            // showColumnFilter
            searchPlaceholder="Search RM checklists..."
            emptyMessage="No RM checklists available."
          />
        )}
      </ScrollView>

      {/* DELETE CONFIRMATION */}

      <ChecklistDialog
        visible={Boolean(removeCode)}
        title="Are you sure?"
        message="Do you want to delete this checklist?"
        destructive
        confirmText="Yes, Delete"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setRemoveCode(null)}
      />

      {/* RESULT NOTICE */}

      <ChecklistDialog
        visible={Boolean(notice)}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        kind={notice?.kind}
        onConfirm={() => setNotice(undefined)}
      />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  content: {
    // padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: 0,
  },

  hr: {
    height: 2,
    backgroundColor: COLORS.primary,
    // marginVertical: 5,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },

  helperText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
  },

  addButton: {
    minHeight: 30,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
    borderRadius: 6,
  },

  addButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  codeText: {
    color: "#91171f",
    fontSize: 12,
    fontWeight: "700",
  },

  storeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "center",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  completed: {
    backgroundColor: COLORS.success,
  },

  pending: {
    backgroundColor: COLORS.warning,
  },

  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  actionButton: {
    padding: 6,
    minWidth: 32,
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  removeIconCircle: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    color: COLORS.danger,
    fontSize: 12,
  },
});

// =================================================================================

// import { router } from "expo-router";
// import { useCallback, useContext, useEffect, useState } from "react";
// import {
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// import { AppButton } from "@/components/AppButton";
// import { AppInput } from "@/components/AppInput";
// import { AppLoader } from "@/components/AppLoader";
// import {
//   AreaHeaderBackContext,
//   AreaHeaderBackVisibleContext,
//   AreaHeaderTitleContext,
// } from "@/components/AreaHeaderBackContext";
// import AreaIcon from "@/components/AreaIcon";

// import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";

// import ChecklistDialog, { type ChecklistNotice } from "./ChecklistDialog";
// import { useRmChecklistData } from "./DataContext";

// const PAGE_SIZE = 50;

// export default function ChecklistList() {
//   const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);
//   const setHeaderTitle = useContext(AreaHeaderTitleContext);
//   const headerBackHandler = useContext(AreaHeaderBackContext);
//   const {
//     records,
//     loading = false,
//     error,
//     onRefresh,
//     onDelete,
//   } = useRmChecklistData();

//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const [removeCode, setRemoveCode] = useState<string | null>(null);
//   const [busy, setBusy] = useState(false);
//   const [notice, setNotice] = useState<ChecklistNotice>();

//   useEffect(() => {
//     const goBack = () => {
//       router.replace("/area_manager/settings");
//     };
//     if (headerBackHandler) headerBackHandler.current = goBack;
//     setHeaderBackVisible(true);
//     setHeaderTitle("RM Checklist");
//     return () => {
//       setHeaderBackVisible(false);
//       setHeaderTitle(null);
//       if (headerBackHandler?.current === goBack)
//         headerBackHandler.current = null;
//     };
//   }, [headerBackHandler, setHeaderBackVisible, setHeaderTitle]);

//   const filtered = records.filter((record) =>
//     `${record.store} ${record.date} ${record.code} ${record.manager}`
//       .toLowerCase()
//       .includes(search.trim().toLowerCase()),
//   );

//   const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const current = Math.min(page, pages);
//   const start = (current - 1) * PAGE_SIZE;

//   const paginatedRecords = filtered.slice(start, start + PAGE_SIZE);

//   async function remove() {
//     if (!removeCode || !onDelete || busy) return;

//     setBusy(true);

//     try {
//       await onDelete(removeCode);
//       setRemoveCode(null);

//       setNotice({
//         kind: "success",
//         title: "Deleted!",
//         message: "Checklist deleted successfully.",
//       });
//     } catch (cause) {
//       setRemoveCode(null);

//       setNotice({
//         kind: "error",
//         title: "Error!",
//         message:
//           cause instanceof Error
//             ? cause.message
//             : "Unable to delete this checklist.",
//       });
//     } finally {
//       setBusy(false);
//     }
//   }

//   function openDetails(code: string) {
//     router.push({
//       pathname: "/area_manager/rm_checklist_details",
//       params: { code },
//     });
//   }

//   const openAddForm = useCallback(() => {
//     router.push("/area_manager/rm_checklist_form");
//   }, []);

//   return (
//     <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
//       <ScrollView
//         keyboardShouldPersistTaps="handled"
//         contentContainerStyle={styles.content}
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           onRefresh ? (
//             <RefreshControl refreshing={loading} onRefresh={onRefresh} />
//           ) : undefined
//         }
//       >
//         <View style={styles.controls}>
//           {/* <Text style={styles.heading}>RM Checklist Records</Text> */}
//           <View style={styles.searchRow}>
//             <AppInput
//               containerStyle={styles.searchInput}
//               placeholder="Search store, date or checklist code"
//               accessibilityLabel="Search RM checklists"
//               value={search}
//               onChangeText={(value) => {
//                 setSearch(value);
//                 setPage(1);
//               }}
//             />
//             <AppButton
//               title="+ Add RM"
//               onPress={openAddForm}
//               disabled={busy}
//               style={styles.addButton}
//               textStyle={styles.addButtonText}
//             />
//           </View>

//           {/* <Text style={styles.recordCount}>
//             Total Records: {filtered.length}
//           </Text> */}

//           {error && (
//             <Text accessibilityRole="alert" style={styles.error}>
//               {error}
//             </Text>
//           )}

//           {error && onRefresh && (
//             <AppButton title="Retry" onPress={onRefresh} disabled={loading} />
//           )}

//           {paginatedRecords.length > 0 && (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator
//               nestedScrollEnabled
//             >
//               <View style={styles.table}>
//                 <View style={styles.tableHeader}>
//                   <Text style={[styles.headerText, styles.serialColumn]}>
//                     #
//                   </Text>

//                   <Text style={[styles.headerText, styles.storeColumn]}>
//                     RM Code
//                   </Text>
//                   <Text style={[styles.headerText, styles.storeColumn]}>
//                     Store
//                   </Text>

//                   <Text style={[styles.headerText, styles.dateColumn]}>
//                     Checklist Date
//                   </Text>

//                   <Text style={[styles.headerText, styles.managerColumn]}>
//                     Area Manager
//                   </Text>

//                   <Text style={[styles.headerText, styles.statusColumn]}>
//                     Status
//                   </Text>

//                   <Text style={[styles.headerText, styles.actionColumn]}>
//                     Action
//                   </Text>
//                 </View>

//                 {paginatedRecords.map((item, index) => (
//                   <View key={item.code} style={styles.tableRow}>
//                     <View style={styles.serialColumn}>
//                       <Text style={styles.cellText}>{start + index + 1}</Text>
//                     </View>

//                     {/* <View style={styles.storeColumn}>
//                       <Text style={styles.subText}>{item.code}</Text>
//                     </View> */}

//                     <View style={styles.storeColumn}>
//                       <TouchableOpacity
//                         accessibilityRole="button"
//                         accessibilityLabel={`View checklist ${item.code}`}
//                         disabled={busy}
//                         onPress={() => openDetails(item.code)}
//                         hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//                       >
//                         <Text style={styles.subText}>{item.code}</Text>
//                       </TouchableOpacity>
//                     </View>

//                     <View style={styles.storeColumn}>
//                       <Text style={styles.storeName}>{item.store}</Text>
//                     </View>

//                     <View style={styles.dateColumn}>
//                       <Text style={styles.cellText}>{item.date}</Text>

//                       {/* <Text style={styles.subText}>
//                         Created: {item.createdOn}
//                       </Text> */}
//                     </View>

//                     <View style={styles.managerColumn}>
//                       <Text style={styles.cellText}>{item.manager || "-"}</Text>
//                     </View>

//                     <View style={styles.statusColumn}>
//                       <View
//                         style={[
//                           styles.badge,
//                           item.status === 2 ? styles.completed : styles.pending,
//                         ]}
//                       >
//                         <Text
//                           style={[
//                             styles.badgeText,
//                             {
//                               color:
//                                 item.status === 2 ? COLORS.white : COLORS.black,
//                             },
//                           ]}
//                         >
//                           {item.status === 2
//                             ? "Completed"
//                             : "Waiting For Store Remark"}
//                         </Text>
//                       </View>
//                     </View>

//                     <View style={[styles.actionColumn, styles.actionButtons]}>
//                       <TouchableOpacity
//                         style={styles.viewButton}
//                         accessibilityRole="button"
//                         accessibilityLabel={`View checklist ${item.code}`}
//                         disabled={busy}
//                         onPress={() => openDetails(item.code)}
//                       >
//                         <AreaIcon
//                           name="report"
//                           color={COLORS.primary}
//                           size={20}
//                         />
//                       </TouchableOpacity>

//                       {onDelete && (
//                         <TouchableOpacity
//                           style={styles.removeButton}
//                           accessibilityRole="button"
//                           accessibilityLabel={`Remove checklist ${item.code}`}
//                           disabled={busy}
//                           onPress={() => setRemoveCode(item.code)}
//                         >
//                           <View style={styles.removeIconCircle}>
//                             <AreaIcon
//                               name="close"
//                               color={COLORS.black}
//                               size={14}
//                             />
//                           </View>
//                         </TouchableOpacity>
//                       )}
//                     </View>
//                   </View>
//                 ))}
//               </View>
//             </ScrollView>
//           )}
//         </View>
//         {paginatedRecords.length === 0 &&
//           (loading ? (
//             <AppLoader message="Loading checklists..." />
//           ) : (
//             <View style={styles.empty}>
//               <Text style={styles.emptyText}>
//                 {search
//                   ? "No matching checklists."
//                   : "No RM checklists available."}
//               </Text>
//             </View>
//           ))}
//         {filtered.length > 0 ? (
//           <View style={styles.footer}>
//             <Text style={styles.info}>
//               Showing {start + 1} to{" "}
//               {Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
//               {filtered.length} entries
//             </Text>

//             <View style={styles.pagination}>
//               <AppButton
//                 title="Previous"
//                 variant="outline"
//                 disabled={current === 1}
//                 onPress={() => setPage(current - 1)}
//               />

//               <Text style={styles.pageText}>
//                 {current} / {pages}
//               </Text>

//               <AppButton
//                 title="Next"
//                 variant="outline"
//                 disabled={current === pages}
//                 onPress={() => setPage(current + 1)}
//               />
//             </View>
//           </View>
//         ) : null}
//       </ScrollView>

//       <ChecklistDialog
//         visible={Boolean(removeCode)}
//         title="Are you sure?"
//         message="Do you want to delete this checklist?"
//         destructive
//         confirmText="Yes, Delete"
//         busy={busy}
//         onConfirm={() => void remove()}
//         onCancel={() => setRemoveCode(null)}
//       />

//       <ChecklistDialog
//         visible={Boolean(notice)}
//         title={notice?.title ?? ""}
//         message={notice?.message ?? ""}
//         kind={notice?.kind}
//         onConfirm={() => setNotice(undefined)}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//     backgroundColor: COLORS.surface,
//   },

//   content: {
//     padding: SPACING.md,
//     paddingBottom: SPACING.xxl,
//   },

//   controls: {
//     gap: SPACING.md,
//   },
//   searchRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
//   searchInput: { flex: 3, minWidth: 0 },
//   addButton: {
//     flex: 1,
//     minWidth: 0,
//     minHeight: 44,
//     paddingHorizontal: SPACING.xs,
//     borderRadius: 8,
//   },
//   addButtonText: { fontSize: FONT_SIZE.xs },
//   heading: {
//     fontSize: FONT_SIZE.lg,
//     fontWeight: FONT_WEIGHT.bold,
//     color: COLORS.text,
//   },

//   // recordCount: {
//   //   fontSize: FONT_SIZE.sm,
//   //   color: COLORS.textLight,
//   // },

//   table: {
//     minWidth: 830,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     borderRadius: 10,
//     overflow: "hidden",
//   },

//   tableHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: COLORS.primary,
//     paddingVertical: 14,
//   },

//   tableRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: COLORS.white,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.border,
//     paddingVertical: 6,
//     minHeight: 60,
//   },

//   serialColumn: {
//     width: 45,
//     paddingHorizontal: 8,
//   },

//   storeColumn: {
//     width: 160,
//     paddingHorizontal: 8,
//   },

//   dateColumn: {
//     width: 145,
//     paddingHorizontal: 8,
//   },

//   managerColumn: {
//     width: 125,
//     paddingHorizontal: 8,
//   },

//   statusColumn: {
//     width: 175,
//     paddingHorizontal: 8,
//   },

//   actionColumn: {
//     width: 140,
//     paddingHorizontal: 4,
//   },
//   actionButtons: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },

//   headerText: {
//     color: COLORS.white,
//     fontSize: FONT_SIZE.sm,
//     fontWeight: FONT_WEIGHT.bold,
//   },

//   cellText: {
//     color: COLORS.text,
//     fontSize: FONT_SIZE.sm,
//   },

//   storeName: {
//     color: COLORS.text,
//     fontSize: FONT_SIZE.sm,
//     fontWeight: FONT_WEIGHT.bold,
//   },

//   subText: {
//     // color: COLORS.text,
//     color: "#91171f",
//     fontSize: FONT_SIZE.sm,
//     fontWeight: FONT_WEIGHT.bold,
//   },

//   badge: {
//     paddingHorizontal: 8,
//     paddingVertical: 6,
//     borderRadius: 8,
//     alignSelf: "flex-start",
//   },

//   badgeText: {
//     fontSize: FONT_SIZE.xs,
//     fontWeight: FONT_WEIGHT.semibold,
//     textAlign: "center",
//   },

//   completed: {
//     backgroundColor: COLORS.success,
//   },

//   pending: {
//     backgroundColor: COLORS.warning,
//   },

//   viewButton: {
//     minHeight: 34,
//     justifyContent: "center",
//     padding: 4,
//     alignItems: "center",
//   },

//   removeButton: {
//     width: 60,
//     height: 60,
//     justifyContent: "center",
//     padding: 0,
//     alignItems: "center",
//   },
//   removeIconCircle: {
//     width: 26,
//     height: 26,
//     borderWidth: 1,
//     borderColor: COLORS.black,
//     borderRadius: 13,
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   footer: {
//     gap: SPACING.md,
//     paddingVertical: SPACING.lg,
//   },

//   info: {
//     color: COLORS.textLight,
//     fontSize: FONT_SIZE.xs,
//   },

//   pagination: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     gap: SPACING.sm,
//   },

//   pageText: {
//     color: COLORS.text,
//     fontWeight: FONT_WEIGHT.semibold,
//   },

//   empty: {
//     padding: SPACING.xxl,
//     alignItems: "center",
//   },

//   emptyText: {
//     color: COLORS.textLight,
//     textAlign: "center",
//   },

//   error: {
//     color: COLORS.danger,
//   },

//   addButtonRow: {
//     alignItems: "flex-end",
//   },
// });
