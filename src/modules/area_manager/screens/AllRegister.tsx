// ================================================================================================
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

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
        onPress={() => router.push("/area_manager/dashboard")}
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
