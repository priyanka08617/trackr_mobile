import { useSession } from "@/hooks/useSession";
import { initializeSession } from "@/services/sessionService";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";

export default function RootLayout() {
  const { identity, ready } = useSession();

  useEffect(() => {
    void initializeSession().catch(() => undefined);
  }, []);

  if (!ready) return <ActivityIndicator size="large" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={identity !== null}>
        <Stack.Screen name="common" />
      </Stack.Protected>
      <Stack.Protected guard={identity?.routeGroup === "area_manager"}>
        <Stack.Screen name="area_manager" />
      </Stack.Protected>
    </Stack>
  );
}
