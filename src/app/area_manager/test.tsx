import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export default function AreaManagerTest() {
  const [company, setCompany] = useState("Checking...");
  const [tokenStatus, setTokenStatus] = useState("Checking...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkLogin() {
      try {
        const savedCompany = await getSavedCompany();
        const token = await getAuthToken();

        setCompany(savedCompany?.company_name ?? "Not found");

        setTokenStatus(token ? "Token available" : "Token not found");

        console.log("TEST PAGE OPENED");
        console.log("Company:", savedCompany?.company_name);
        console.log("Token available:", Boolean(token));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        setError(message);
        console.error("TEST PAGE ERROR:", err);
      }
    }

    void checkLogin();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Area Manager Test Page</Text>

      <Text style={styles.success}>Navigation Successful</Text>

      <Text style={styles.label}>Company: {company}</Text>

      <Text style={styles.label}>Authentication: {tokenStatus}</Text>

      {!!error && <Text style={styles.error}>Error: {error}</Text>}

      <Pressable
        style={styles.button}
        onPress={() => router.replace("/area_manager/company_faq")}
      >
        <Text style={styles.buttonText}>Open Company FAQs</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  success: {
    fontSize: 18,
    color: "green",
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: "red",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#380000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
