import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  clearPasswordRecovery,
  hasPasswordResetToken,
  resetPassword,
} from "@/services/authService";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const [allowed] = useState(hasPasswordResetToken);

  useEffect(() => {
    if (!allowed) router.replace("/forgot_password");
  }, [allowed]);

  function goLogin() {
    clearPasswordRecovery();
    router.replace("/login");
  }

  async function submit() {
    if (busy.current) return;
    if (newPassword.length < 3) {
      setError("Password must contain at least 3 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      await resetPassword(newPassword, confirmPassword);
      setNewPassword("");
      setConfirmPassword("");
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Password reset successfully.");
        goLogin();
      } else {
        Alert.alert(
          "Success",
          "Password reset successfully.",
          [{ text: "OK", onPress: goLogin }],
          { cancelable: false },
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reset password.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.description}>Enter your new password.</Text>
        <AppInput
          placeholder="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <AppInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <AppButton
          title={loading ? "Please wait..." : "Reset Password"}
          onPress={() => void submit()}
          disabled={loading}
        />
        <AppButton
          title="Back to Login"
          variant="outline"
          onPress={goLogin}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    padding: 24,
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#380A13" },
  description: { fontSize: 14, color: "#64748B" },
  error: { color: "#B91C1C", fontSize: 13 },
});
