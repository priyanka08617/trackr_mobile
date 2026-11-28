import { useEffect, useState } from "react";
import {
  AppState,
  Modal,
  View,
  Text,
  Linking,
  StyleSheet,
  Alert,
} from "react-native";

import { AppButton } from "@/components/AppButton";
import {
  checkAppVersion,
  installedTrackrVersion,
  type VersionStatus,
} from "@/services/appVersionService";

export default function AppVersionGuard() {
  const [status, setStatus] = useState<VersionStatus | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState("");

  useEffect(() => {
    const installed = installedTrackrVersion();
    if (!installed) return;

    let mounted = true;
    let checking = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (!mounted || checking || !installed) return;
      clearTimeout(retry);
      checking = true;
      const result = await checkAppVersion(installed);
      checking = false;
      if (!mounted) return;

      if (result) setStatus(result);
      if ((!result || result.maintenance || result.force_update) && AppState.currentState === "active") {
        retry = setTimeout(() => void check(), 60_000);
      }
    }

    void check();

    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void check();
        } else {
          clearTimeout(retry);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(retry);
      subscription.remove();
    };
  }, []);

  if (!status) return null;

  const maintenance = status.maintenance === true;
  const mandatory = status.force_update;
  const storeUrl = status.store_url;
  const optional =
    status.update_available === true &&
    storeUrl !== null &&
    dismissedVersion !== status.latest_version;

  const visible = maintenance || mandatory || optional;

  async function openStore() {
    if (!storeUrl) return;
    try {
      await Linking.openURL(storeUrl);
    } catch {
      Alert.alert("Unable to open the application store.");
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!maintenance && !mandatory) {
          setDismissedVersion(status.latest_version);
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {maintenance
              ? "Scheduled Maintenance"
              : mandatory
              ? "Update Required"
              : "Update Available"}
          </Text>

          <Text style={styles.message}>
            {maintenance
              ? status.maintenance_message
              : mandatory && !storeUrl
              ? "An update is required. The application store link is temporarily unavailable."
              : `TrackR version ${status.latest_version} is available.`}
          </Text>

          {!maintenance && storeUrl && (
            <AppButton
              title="Update Now"
              onPress={() => void openStore()}
            />
          )}

          {!maintenance && !mandatory && (
            <AppButton
              title="Later"
              variant="outline"
              onPress={() =>
                setDismissedVersion(status.latest_version)
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    color: "#475569",
  },
});
