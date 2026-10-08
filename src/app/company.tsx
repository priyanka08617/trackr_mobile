import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CompanyScreen() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [formTop, setFormTop] = useState(0);

  const handleContinue = () => {
    const name = companyName.trim();

    if (!name) {
      Alert.alert("Required", "Please enter your company name.");
      return;
    }

    // Company verification API will be added in Task 2.4.
    Alert.alert("Company Name", name);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        accessible={false}
        contentFit="cover"
        source={require("../../assets/images/logo/ti.svg")}
        style={styles.backgroundImage}
      />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          pointerEvents="none"
          style={[styles.upperBackground, { height: formTop }]}
        />
        <View style={styles.logoContainer}>
          <Image
            accessibilityLabel="TrackR logo"
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
          <Text style={styles.subtitle}>Enterprise Management</Text>
        </View>

        <View
          style={styles.form}
          onLayout={({ nativeEvent }) => {
            const top = nativeEvent.layout.y;
            setFormTop((currentTop) => (currentTop === top ? currentTop : top));
          }}
        >
          <Text style={styles.heading}>Welcome to TrackR</Text>
          <Text style={styles.description}>
            Enter your company name to continue.
          </Text>

          <Text style={styles.label}>Company Name</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter company name"
            placeholderTextColor="#999"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Text style={styles.footer}>Powered by TrackR</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.18,
  },
  content: {
    flex: 0.3,
    justifyContent: "center",
    paddingHorizontal: 25,
    // backgroundColor: "#FFFFFF",
  },
  upperBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#380A13",
  },
  logoContainer: {
    alignItems: "center",
    marginHorizontal: -25,
    marginBottom: 40,
    paddingVertical: 20,
  },
  logo: {
    width: 200,
    height: 48,
  },
  foxLogo: {
    width: 150,
    height: 150,
  },
  subtitle: {
    fontSize: 13,
    color: "#FFFFFF",
    marginTop: 5,
  },
  form: {
    width: "100%",
  },
  heading: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#222222",
    marginBottom: 10,
    paddingTop: 20,
    alignSelf: "center",
  },

  description: {
    fontSize: 14,
    color: "#777777",
    marginBottom: 50,
    alignSelf: "center",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333333",
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 20,
    color: "#222222",
  },
  button: {
    backgroundColor: "#380A13",
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#999999",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 70,
    alignSelf: "center",
    fontSize: 13,

    textAlign: "right",
    fontWeight: "600",
    color: "#380A13",
  },
});
