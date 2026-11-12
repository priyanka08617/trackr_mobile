import { Image } from "expo-image";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { findCompany } from "../services/companyService";
import { saveCompany } from "../storage/companyStorage";

import AppButton from "@/components/AppButton";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { router } from "expo-router";

export default function CompanyScreen() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const name = companyName.trim();

    if (!name) {
      Alert.alert("Required", "Please enter your company name.");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const company = await findCompany(name);

      await saveCompany(company);
      router.replace("/login");
      // const savedCompany = await getSavedCompany();

      // Alert.alert(
      //   "Company Saved",
      //   `Company: ${savedCompany?.company_name}\nDomain: ${savedCompany?.domain}`,
      // );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        accessible={false}
        source={require("../../assets/images/logo/ti.svg")}
        contentFit="cover"
        style={styles.backgroundImage}
      />

      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Image
            accessibilityLabel="TrackR Fox Logo"
            source={require("../../assets/images/logo/fox.svg")}
            contentFit="contain"
            style={styles.foxLogo}
          />

          <Image
            accessibilityLabel="TrackR Logo"
            source={require("../../assets/images/logo/logo.svg")}
            contentFit="contain"
            style={styles.logo}
          />

          {/* <Text style={styles.subtitle}>Enterprise Management</Text> */}
        </View>

        <View style={styles.form}>
          <Text style={styles.heading}>Welcome to TrackR</Text>

          <Text style={styles.description}>
            Enter your company name to continue.
          </Text>

          <Text style={styles.label}>Company Name</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter company name"
            placeholderTextColor={COLORS.placeholder}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
          />

          <AppButton
            title="Continue"
            onPress={handleContinue}
            loading={loading}
          />
        </View>

        <Text style={styles.footer}>Powered by TrackR</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  contentContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },

  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.18,
  },

  header: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 30,
  },

  foxLogo: {
    width: 150,
    height: 150,
  },

  logo: {
    width: 200,
    height: 48,
  },

  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },

  form: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },

  heading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },

  description: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: SPACING.xxl,
  },

  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.lg,
  },

  footer: {
    marginTop: "auto",
    marginBottom: SPACING.xl,
    textAlign: "center",
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
});
