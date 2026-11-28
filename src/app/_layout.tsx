import AppVersionGuard from "@/components/AppVersionGuard";
import { useSession } from "@/hooks/useSession";
import { canOpenRootScreen, sessionRouteGroups } from "@/services/sessionNavigation";
import { initializeSession } from "@/services/sessionService";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  const { identity, ready } = useSession();

  useEffect(() => {
    void initializeSession().catch(() => undefined);
  }, []);

  return (
    <>
      <Stack
        screenOptions={{ headerShown: false }}
        screenLayout={({ route, children }) =>
          // Expo Router also discovers screens absent from Stack.Screen declarations.
          canOpenRootScreen(route.name, ready, identity) ? <>{children}</> : <Redirect href="/" />
        }
      >
        <Stack.Screen name="index" />

        <Stack.Protected guard={ready && identity !== null}>
          <Stack.Screen name="common" />
        </Stack.Protected>

        {sessionRouteGroups.map((folder) => (
          <Stack.Protected key={folder} guard={ready && identity?.routeGroup === folder}>
            <Stack.Screen name={folder} />
          </Stack.Protected>
        ))}
      </Stack>

      <AppVersionGuard />
    </>
  );
}
