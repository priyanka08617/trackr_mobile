// import { StyleSheet } from "react-native";

// // import RegisterReportScreen from "./RegisterReportScreen";

// import { useCallback, useContext, useEffect } from "react";
// import { View } from "react-native";
// import ActionCard from "../components/ActionCard";
// import {
//   AreaHeaderBackContext,
//   AreaHeaderBackVisibleContext,
//   AreaHeaderTitleContext,
// } from "../components/AreaHeaderBackContext";
// import AreaPage from "../components/AreaPage";

// const REGISTER_ITEMS = [
//   { id: "alteration", title: "Alteration Report", icon: "setting" },
//   { id: "footfall", title: "Footfall Report", icon: "clock" },
//   { id: "exchange", title: "Exchange Report", icon: "report" },
//   { id: "electricity", title: "Electricity Report", icon: "dashboard" },
//   { id: "generator", title: "Generator Report", icon: "setting" },
//   { id: "hk_sg", title: "HK Attendance Report", icon: "check" },
//   { id: "lost_found", title: "Lost & Found Report", icon: "faq" },
//   { id: "scrap", title: "Scrap Report", icon: "ban" },
//   { id: "global_count", title: "Global Count Report", icon: "plan" },
//   { id: "pi", title: "PI Report", icon: "globe" },
//   { id: "key_movement", title: "Key Movement Report", icon: "setting" },
//   { id: "fmcg_price_mismatch", title: "FMCG Price Mismatch", icon: "report" },
// ] as const;

// export default function AllRegister({ onBack }: { onBack?: () => void }) {
//   // const [selectedReport, setSelectedReport] = useState<RegisterReportId>();
//   const setHeaderTitle = useContext(AreaHeaderTitleContext);
//   useEffect(() => {
//     setHeaderTitle(
//       REGISTER_ITEMS.find((item) => item.id === selectedReport)?.title ??
//         "All Register",
//     );
//     return () => setHeaderTitle(null);
//   }, [selectedReport, setHeaderTitle]);
//   const headerBackHandlerRef = useContext(AreaHeaderBackContext);
//   const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);
//   const backToRegisters = useCallback(() => setSelectedReport(undefined), []);

//   useEffect(() => {
//     const backAction = selectedReport ? backToRegisters : onBack;
//     if (headerBackHandlerRef) headerBackHandlerRef.current = backAction ?? null;
//     setHeaderBackVisible(Boolean(backAction));
//     return () => {
//       if (headerBackHandlerRef) headerBackHandlerRef.current = null;
//       setHeaderBackVisible(false);
//     };
//   }, [
//     backToRegisters,
//     headerBackHandlerRef,
//     onBack,
//     selectedReport,
//     setHeaderBackVisible,
//   ]);

//   if (selectedReport) return <RegisterReportScreen reportId={selectedReport} />;

//   return (
//     <AreaPage
//       title="All Register"
//       subtitle="Access all store registers and daily reports."
//     >
//       <View style={styles.grid}>
//         {REGISTER_ITEMS.map((item) => (
//           <View key={item.title} style={styles.cell}>
//             <ActionCard
//               filled
//               title={item.title}
//               icon={item.icon}
//               onPress={() => setSelectedReport(item.id)}
//             />
//           </View>
//         ))}
//       </View>
//     </AreaPage>
//   );
// }

// const styles = StyleSheet.create({
//   grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
//   cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
// });

// ================================================================================================
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const REGISTER_ITEMS = [
  { id: "alteration", title: "Alteration Report", icon: "setting" },
  { id: "footfall", title: "Footfall Report", icon: "clock" },
  { id: "exchange", title: "Exchange Report", icon: "report" },
  { id: "electricity", title: "Electricity Report", icon: "dashboard" },
  { id: "generator", title: "Generator Report", icon: "setting" },
  { id: "hk_sg", title: "HK Attendance Report", icon: "check" },
  { id: "lost_found", title: "Lost & Found Report", icon: "faq" },
  { id: "scrap", title: "Scrap Report", icon: "ban" },
  { id: "global_count", title: "Global Count Report", icon: "plan" },
  { id: "pi", title: "PI Report", icon: "globe" },
  { id: "key_movement", title: "Key Movement Report", icon: "setting" },
  { id: "fmcg_price_mismatch", title: "FMCG Price Mismatch", icon: "report" },
] as const;

export default function AllRegister() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>All Register Working</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/escalation_matrix")}
      >
        <Text style={styles.buttonText}>Escalation Matrix</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/dashboard")}
      >
        <Text style={styles.buttonText}>Dashboard</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/all_register")}
      >
        <Text style={styles.buttonText}>All Register</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/all_tracker")}
      >
        <Text style={styles.buttonText}>All Tracker</Text>
      </Pressable>
    </View>
  );

  // return (
  //   <AreaPage
  //     title="All Register"
  //     subtitle="Access all store registers and daily reports."
  //   >
  //     <View style={styles.grid}>
  //       {REGISTER_ITEMS.map((item) => (
  //         <View key={item.id} style={styles.cell}>
  //           <ActionCard
  //             filled
  //             title={item.title}
  //             icon={item.icon}
  //             onPress={() =>
  //               Alert.alert(item.title, "Report page will be added later.")
  //             }
  //           />
  //         </View>
  //       ))}
  //     </View>
  //   </AreaPage>
  // );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#380000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
