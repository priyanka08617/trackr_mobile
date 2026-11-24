import { useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppInput } from "@/components/AppInput";
import { AppButton } from "@/components/AppButton";
import { clearPasswordRecovery, requestPasswordReset } from "@/services/authService";

export default function ForgotPassword() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const [email, setEmail] = useState(typeof username === "string" ? username : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  function goLogin() {
    clearPasswordRecovery();
    router.replace("/login");
  }

  async function submit() {
    if (busy.current) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      const message = "This is not a valid email ID.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(message);
        goLogin();
      } else {
        Alert.alert("Invalid Email", message, [{ text: "OK", onPress: goLogin }], { cancelable: false });
      }
      return;
    }
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(value);
      router.replace("/verify_otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to request OTP.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.description}>Enter your registered email ID.</Text>
        <AppInput placeholder="Email ID" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <AppButton title={loading ? "Please wait..." : "Send OTP"} onPress={() => void submit()} disabled={loading} />
        <AppButton title="Back to Login" variant="outline" onPress={goLogin} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#F8FAFC" },
  card: { width: "100%", maxWidth: 440, padding: 24, gap: 16, backgroundColor: "#FFFFFF", borderRadius: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#380A13" },
  description: { fontSize: 14, color: "#64748B" },
  error: { color: "#B91C1C", fontSize: 13 },
});
