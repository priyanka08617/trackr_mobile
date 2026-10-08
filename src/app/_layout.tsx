// import * as SplashScreen from "expo-splash-screen";
// import { useColorScheme } from "react-native";

// // import AppTabs from "@/components/app-tabs";

// SplashScreen.preventAutoHideAsync();

// export default function TabLayout() {
//   const colorScheme = useColorScheme();
//   return (
//     // <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
//     //   <AppTabs />
//     // </ThemeProvider>

//     <p>Hello Test</p>
//   );
// }

import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Hello Test</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
