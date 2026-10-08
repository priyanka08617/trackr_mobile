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

// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { useEffect } from "react";

// export default function RootLayout() {
//   useEffect(() => {
//     SplashScreen.hideAsync();
//   }, []);

//   return (
//     <Stack
//       screenOptions={{
//         headerShown: false,
//       }}
//     />
//   );
// }

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
