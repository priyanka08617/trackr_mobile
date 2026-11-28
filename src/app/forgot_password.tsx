import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppInput } from "@/components/AppInput";
import { AppButton } from "@/components/AppButton";
import { clearPasswordRecovery, requestPasswordReset } from "@/services/authService";
import {
  COLORS,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";

export default function ForgotPassword() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const [email, setEmail] = useState(typeof username === "string" ? username : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  function goLogin() {
    clearPasswordRecovery();
    router.dismissTo("/login");
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
    <SafeAreaView edges={["top", "left", "right"]} style={styles.page}>
      {/*  */}
      <StatusBar backgroundColor="#380A13" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.splitContent}>
          <View style={styles.logoRow}>
            <Image
              accessibilityLabel="TrackR fox logo"
              contentFit="contain"
              source={require("../../assets/images/logo/fox.svg")}
              style={styles.foxLogo}
            />
            <Image
              accessibilityLabel="TrackR logo"
              contentFit="contain"
              source={require("../../assets/images/logo/logo.svg")}
              style={styles.logo}
            />
          </View>
          <View style={styles.formSection}>
            <Image
              accessible={false}
              contentFit="cover"
              source={require("../../assets/images/logo/ti.svg")}
              style={styles.backgroundImage}
            />
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                <View style={styles.card}>
                  <Text style={styles.title}>Forgot Password</Text>
                  <Text style={styles.description}>Enter your registered email ID.</Text>
                  <AppInput
                    placeholder="Email ID"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                  {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                  <AppButton
                    title={loading ? "Please wait..." : "Send OTP"}
                    onPress={() => void submit()}
                    disabled={loading}
                    style={styles.primaryButton}
                  />
                  <AppButton
                    title="Back to Login"
                    variant="outline"
                    onPress={goLogin}
                    disabled={loading}
                    style={styles.secondaryButton}
                  />
                </View>
              </View>
              {/* <Text style={styles.footer}>Designed & Developed by Ask-For</Text> */}

               <Text style={styles.footer}>
                          <Text style={styles.footerCredit}>Designed &amp; Developed by </Text>
                          <Text style={styles.footerBrand}>ASK-FOR</Text>
                        </Text>


            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  backgroundImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.35 },
  keyboard: { flex: 1 },
  splitContent: { flex: 1,  backgroundColor: COLORS.background },
  logoRow: {
    // flex: 1,
    height:290,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#380A13",
    gap: 8,
  },
  foxLogo: { width: 120, height: 120 },
  logo: { width: 180, height: 44 },
  formSection: { flex: 1, position: "relative", backgroundColor: "#F7F3F4" },
  formScroll: { flex: 1, backgroundColor: "transparent" },
  formScrollContent: { flexGrow: 1, justifyContent: "flex-start" ,paddingTop: 10,
  paddingBottom: 16},
  formContainer: { width: "100%", alignItems: "center", paddingHorizontal: 20 },
  card: { width: "100%", maxWidth: 440, padding: 10, gap: 16,  borderRadius: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#380A13",textAlign:"center" },
  description: { fontSize: 14, color: "#64748B",textAlign:"center" },
  input: { height: 48 },
  primaryButton: { height: 45 },
  secondaryButton: { height: 45 },
  error: { color: "#B91C1C", fontSize: 13 },


   footer: {
    marginTop: "auto",
    marginBottom: SPACING.xl,
    paddingHorizontal:SPACING.md,
    textAlign: "right",
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  footerCredit: {
    fontStyle: "italic",
    fontWeight: FONT_WEIGHT.semibold,
  },
  footerBrand: {
    fontStyle: "normal",
    fontWeight: FONT_WEIGHT.bold,
  },


  //  footer: {
  //     marginTop: "auto",
  //     // paddingTop: SPACING.xl,
  //     paddingBottom: SPACING.xxl,
  //     paddingHorizontal:SPACING.md,
  //     color: COLORS.primary,
  //     fontSize: 12,
  //     fontWeight: FONT_WEIGHT.bold,
  //     textAlign: "right",
  //     fontStyle:"italic",
  //     // AlignSelf: "Stretch",
  //   },
});
// backgroundColor: "rgba(255, 255, 255, 0.88)",