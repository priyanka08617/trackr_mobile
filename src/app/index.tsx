// import {
//   Alert,
//   SafeAreaView,
//   StatusBar,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// export default function HomeScreen() {
//   const handlePress = () => {
//     Alert.alert("Trackr Mobile", "Application is working successfully!");
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#f5f7fb" />

//       <View style={styles.content}>
//         <Text style={styles.title}>Trackr Mobile</Text>

//         <Text style={styles.subtitle}>
//           Welcome to Trackr Mobile Application
//         </Text>

//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>Hello Test</Text>

//           <Text style={styles.description}>
//             Your Expo React Native application is running successfully.
//           </Text>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={handlePress}
//             activeOpacity={0.8}
//           >
//             <Text style={styles.buttonText}>Test Application</Text>
//           </TouchableOpacity>
//         </View>

//         <Text style={styles.footer}>Powered by Trackr</Text>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f7fb",
//   },
//   content: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 20,
//   },
//   title: {
//     fontSize: 30,
//     fontWeight: "bold",
//     color: "#1e293b",
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 15,
//     color: "#64748b",
//     textAlign: "center",
//     marginBottom: 30,
//   },
//   card: {
//     width: "100%",
//     maxWidth: 400,
//     backgroundColor: "#ffffff",
//     padding: 25,
//     borderRadius: 15,
//     alignItems: "center",
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//   },
//   cardTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#2563eb",
//     marginBottom: 12,
//   },
//   description: {
//     fontSize: 15,
//     color: "#475569",
//     textAlign: "center",
//     lineHeight: 23,
//     marginBottom: 25,
//   },
//   button: {
//     width: "100%",
//     backgroundColor: "#2563eb",
//     paddingVertical: 14,
//     borderRadius: 8,
//     alignItems: "center",
//   },
//   buttonText: {
//     color: "#ffffff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   footer: {
//     position: "absolute",
//     bottom: 30,
//     fontSize: 12,
//     color: "#94a3b8",
//   },
// });

// import { Link } from "expo-router";
// import { View } from "react-native";

// export default function HomeScreen() {
//   return (
//     <View style={{ padding: 30 }}>
//       <Link href="/company">Company</Link>
//       <Link href="/login">Login</Link>
//       <Link href="/dashboard">Dashboard</Link>
//     </View>
//   );
// }

import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/company" />;
}
