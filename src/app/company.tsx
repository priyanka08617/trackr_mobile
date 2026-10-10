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

  // const handleContinue = () => {
  //   const name = companyName.trim();

  //   if (!name) {
  //     Alert.alert("Required", "Please enter your company name.");
  //     return;
  //   }

  //   // Temporary testing.
  //   // Company verification API will be added later.
  //   Alert.alert("Company Name", name);
  // };

  // const handleContinue = async () => {
  //   const name = companyName.trim();

  //   if (!name || loading) {
  //     if (!name) {
  //       Alert.alert("Required", "Please enter your company name.");
  //     }
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     const company = await findCompany(name);

  //     Alert.alert(
  //       "Company Found",
  //       `${company.company_name}\n${company.domain}`,
  //     );

  //     // Next: save company configuration and navigate to login.
  //   } catch (error) {
  //     const message =
  //       error instanceof Error ? error.message : "Unable to connect to server";

  //     Alert.alert("Company Verification", message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
        style={styles.container}
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

  // backgroundImage: {
  //   ...StyleSheet.absoluteFillObject,
  //   opacity: 0.18,
  // },

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

// =======================================================================================================================

// import { Image } from "expo-image";
// import { useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// export default function CompanyScreen() {
//   const [companyName, setCompanyName] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [formTop, setFormTop] = useState(0);

//   const handleContinue = () => {
//     const name = companyName.trim();

//     if (!name) {
//       Alert.alert("Required", "Please enter your company name.");
//       return;
//     }

//     // Company verification API will be added in Task 2.4.
//     Alert.alert("Company Name", name);
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <Image
//         accessible={false}
//         contentFit="cover"
//         source={require("../../assets/images/logo/ti.svg")}
//         style={styles.backgroundImage}
//       />
//       <KeyboardAvoidingView
//         style={styles.content}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//       >
//         <View
//           pointerEvents="none"
//           style={[styles.upperBackground, { height: formTop }]}
//         />
//         <View style={styles.logoContainer}>
//           <Image
//             accessibilityLabel="TrackR logo"
//             contentFit="contain"
//             source={require("../../assets/images/logo/fox.svg")}
//             style={styles.foxLogo}
//           />

//           <Image
//             accessibilityLabel="TrackR logo"
//             contentFit="contain"
//             source={require("../../assets/images/logo/logo.svg")}
//             style={styles.logo}
//           />
//           <Text style={styles.subtitle}>Enterprise Management</Text>
//         </View>

//         <View
//           style={styles.form}
//           onLayout={({ nativeEvent }) => {
//             const top = nativeEvent.layout.y;
//             setFormTop((currentTop) => (currentTop === top ? currentTop : top));
//           }}
//         >
//           <Text style={styles.heading}>Welcome to TrackR</Text>
//           <Text style={styles.description}>
//             Enter your company name to continue.
//           </Text>

//           <Text style={styles.label}>Company Name</Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Enter company name"
//             placeholderTextColor="#999"
//             value={companyName}
//             onChangeText={setCompanyName}
//             autoCapitalize="words"
//             autoCorrect={false}
//             editable={!loading}
//           />

//           <TouchableOpacity
//             style={[styles.button, loading && styles.disabledButton]}
//             onPress={handleContinue}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator color="#FFFFFF" />
//             ) : (
//               <Text style={styles.buttonText}>Continue</Text>
//             )}
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//       <Text style={styles.footer}>Powered by TrackR</Text>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#FFFFFF",
//   },
//   backgroundImage: {
//     ...StyleSheet.absoluteFill,
//     opacity: 0.18,
//   },
//   content: {
//     flex: 0.3,
//     justifyContent: "center",
//     paddingHorizontal: 25,
//     // backgroundColor: "#FFFFFF",
//   },
//   upperBackground: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: "#380A13",
//   },
//   logoContainer: {
//     alignItems: "center",
//     marginHorizontal: -25,
//     marginBottom: 40,
//     paddingVertical: 20,
//   },
//   logo: {
//     width: 200,
//     height: 48,
//   },
//   foxLogo: {
//     width: 150,
//     height: 150,
//   },
//   subtitle: {
//     fontSize: 13,
//     color: "#FFFFFF",
//     marginTop: 5,
//   },
//   form: {
//     width: "100%",
//   },
//   heading: {
//     fontSize: 25,
//     fontWeight: "bold",
//     color: "#222222",
//     marginBottom: 10,
//     paddingTop: 20,
//     alignSelf: "center",
//   },

//   description: {
//     fontSize: 14,
//     color: "#777777",
//     marginBottom: 50,
//     alignSelf: "center",
//   },

//   label: {
//     fontSize: 14,
//     fontWeight: "600",
//     marginBottom: 10,
//     color: "#333333",
//   },

//   input: {
//     height: 52,
//     borderWidth: 1,
//     borderColor: "#DDDDDD",
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     fontSize: 15,
//     marginBottom: 20,
//     color: "#222222",
//   },
//   button: {
//     backgroundColor: "#380A13",
//     height: 52,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   disabledButton: {
//     opacity: 0.6,
//   },
//   buttonText: {
//     color: "#999999",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   footer: {
//     position: "absolute",
//     bottom: 70,
//     alignSelf: "center",
//     fontSize: 13,

//     textAlign: "right",
//     fontWeight: "600",
//     color: "#380A13",
//   },
// });
