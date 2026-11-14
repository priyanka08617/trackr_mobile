// ================================================================================================
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
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

      <Pressable
        style={styles.button}
        onPress={() => router.push("/area_manager/work_plan_travel_plan")}
      >
        <Text style={styles.buttonText}>Work Plan Travel Plan</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/area_manager/rm_checklist")}
      >
        <Text style={styles.buttonText}>RM Checklist</Text>
      </Pressable>
      <Pressable
        // accessibilityRole="button"
        style={styles.button}
        onPress={() => router.push("/area_manager/festive_checklist")}
      >
        <Text style={styles.buttonText}>Festive Checklist</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/festive_checklist_report")}
      >
        <Text style={styles.buttonText}>Festive Checklist Report</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/area_manager/all_void")}
      >
        <Text style={styles.buttonText}>All Void</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/dump_report")}
      >
        <Text style={styles.buttonText}>Dump Report</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/monthly_lp_global_count")}
      >
        <Text style={styles.buttonText}>Monthly LP Report</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/area_manager/fascia_plan")}
      >
        <Text style={styles.buttonText}>Fascia Plan</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/common/fascia_report")}
      >
        <Text style={styles.buttonText}>Fascia Plan Report</Text>
      </Pressable>
    </ScrollView>
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
