import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { loginUser } from "@/services/authService";
import type { Company } from "@/services/companyService";
import {
  clearAuthToken,
  clearRefreshToken,
  setAuthToken,
  setRefreshToken,
} from "@/storage/authStorage";
import { clearCompany, getSavedCompany } from "@/storage/companyStorage";
import { getPasswordError } from "@/utils/validation";
import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [company, setCompany] = useState<Company | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmCompanyChange, setConfirmCompanyChange] = useState(false);

  useEffect(() => {
    let active = true;

    getSavedCompany()
      .then((savedCompany) => {
        if (active) {
          setCompany(savedCompany);
        }
      })
      .catch(() => {
        if (active) {
          setCompanyError("Couldn't load your saved company.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async () => {
    const nextEmailError = email.trim() ? undefined : "Username is required";
    const nextPasswordError = getPasswordError(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) return;

    try {
      const result = await loginUser(email.trim(), password);

      // if (result.success && result.data) {
      //   Alert.alert("Success", "Login successful!");
      //   console.log("Authenticated user:", result.data.user.username);
      // }

      if (result.success && result.data) {
        try {
          await setAuthToken(result.data.access_token);
          await setRefreshToken(result.data.refresh_token);

          router.replace("/dashboard");
        } catch {
          await Promise.allSettled([clearAuthToken(), clearRefreshToken()]);
          Alert.alert("Error", "Unable to save login session.");
        }
      }
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot password?",
      "Please contact your company administrator to reset your password.",
    );
  };

  // const handleChangeCompany = () => {
  //   setConfirmCompanyChange(false);
  //   router.replace("/company");
  // };

  const handleChangeCompany = async () => {
    try {
      await clearAuthToken();
      await clearRefreshToken();
      await clearCompany();
      setConfirmCompanyChange(false);
      router.replace("/company");
    } catch {
      Alert.alert("Error", "Unable to change company.");
    }
  };

  const companyName = company?.company_name ?? "Company not selected";

  return (
    <SafeAreaView style={styles.container}>
      <Image
        accessible={false}
        contentFit="cover"
        source={require("../../assets/images/logo/ti.svg")}
        style={styles.backgroundImage}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
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

          <View style={styles.form}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.description}>
              Sign in to continue to your account.
            </Text>

            <View style={styles.companyRow}>
              <View style={styles.companyDetails}>
                {/* <Text style={styles.companyLabel}>COMPANY</Text> */}
                <Text numberOfLines={1} style={styles.companyName}>
                  {companyError ?? companyName}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change company"
                onPress={() => setConfirmCompanyChange(true)}
                style={styles.changeCompanyButton}
              >
                <SymbolView
                  name={{
                    ios: "gearshape",
                    android: "settings",
                    web: "settings",
                  }}
                  tintColor={COLORS.primary}
                  size={22}
                />
              </Pressable>
            </View>
            <AppInput
              error={emailError}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) setEmailError(undefined);
              }}
              placeholder="Enter your username"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              editable={!companyError}
              style={styles.inputText}
              containerStyle={styles.inputContainer}
            />

            <View style={styles.passwordGroup}>
              <AppInput
                // label="Password"
                error={passwordError}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) setPasswordError(undefined);
                }}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                style={[styles.inputText, styles.passwordTextInput]}
                textContentType="password"
                autoComplete="current-password"
                editable={!companyError}
                containerStyle={styles.passwordInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                onPress={() => setShowPassword((current) => !current)}
                style={styles.showPasswordButton}
              >
                <SymbolView
                  name={
                    showPassword
                      ? {
                          ios: "eye.slash",
                          android: "visibility_off",
                          web: "visibility_off",
                        }
                      : {
                          ios: "eye",
                          android: "visibility",
                          web: "visibility",
                        }
                  }
                  tintColor={COLORS.primary}
                  size={22}
                />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>

            <AppButton
              title="Sign In"
              onPress={handleLogin}
              disabled={Boolean(companyError)}
              style={styles.signInButton}
            />
          </View>

          <Text style={styles.footer}>Powered by TrackR</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        animationType="fade"
        transparent
        visible={confirmCompanyChange}
        onRequestClose={() => setConfirmCompanyChange(false)}
      >
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Change company?</Text>
            <Text style={styles.confirmationMessage}>
              Do you want to change your company?
            </Text>
            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmCompanyChange(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleChangeCompany}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Yes, change</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.18,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  foxLogo: {
    width: 120,
    height: 120,
  },
  logo: {
    width: 180,
    height: 44,
  },
  form: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  heading: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  description: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  companyRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xxl + SPACING.sm,
  },
  companyDetails: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  companyLabel: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.xs,
  },
  companyName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  changeCompanyButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputText: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  passwordGroup: {
    position: "relative",
  },
  passwordInput: {
    marginBottom: 0,
  },
  passwordTextInput: {
    paddingRight: SPACING.xxl,
  },
  showPasswordButton: {
    position: "absolute",
    right: SPACING.lg,
    top: 0,
    width: SPACING.xl,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    justifyContent: "center",
    minHeight: 44,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  signInButton: {
    marginBottom: SPACING.xl,
  },
  footer: {
    marginTop: "auto",
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: SPACING.xl,
  },
  confirmationCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
  },
  confirmationTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  confirmationMessage: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  confirmationActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  confirmButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
