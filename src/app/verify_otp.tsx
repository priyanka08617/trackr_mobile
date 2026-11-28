import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RecoveryForm } from "@/components/RecoveryForm";
import { router } from "expo-router";
import { AppInput } from "@/components/AppInput";
import { AppButton } from "@/components/AppButton";
import { getPasswordRecoveryEmail, requestPasswordReset, verifyOtp } from "@/services/authService";

export default function VerifyOtp() {
  const email = getPasswordRecoveryEmail();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const busy = useRef(false);

  useEffect(() => {
    if (!email) router.replace("/forgot_password");
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit() {
    if (busy.current || !email) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter a valid six-digit OTP.");
      return;
    }
    busy.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await verifyOtp(email, otp.trim());
      router.replace("/reset_password");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify OTP.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function resend() {
    if (busy.current || cooldown > 0 || !email) return;
    busy.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await requestPasswordReset(email);
      setOtp("");
      setCooldown(60);
      setNotice("OTP requested. Enter the latest OTP.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to request OTP.");
      router.replace("/forgot_password");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (!email) return null;

  return (
    <RecoveryForm>
      <View style={styles.card}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.description}>{email}</Text>
        <AppInput placeholder="Enter six-digit OTP" value={otp} onChangeText={(value: string) => setOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.description}>{notice}</Text>}
        <AppButton title={loading ? "Please wait..." : "Verify OTP"} onPress={() => void submit()} disabled={loading} />
        <AppButton title={cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"} variant="outline" onPress={() => void resend()} disabled={loading || cooldown > 0} />
        <AppButton title="Change Email" variant="outline" onPress={() => router.replace("/forgot_password")} disabled={loading} />
      </View>
    </RecoveryForm>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", maxWidth: 440, padding: 24, gap: 16, backgroundColor: "#FFFFFF", borderRadius: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#380A13" },
  description: { fontSize: 14, color: "#64748B" },
  error: { color: "#B91C1C", fontSize: 13 },
});
