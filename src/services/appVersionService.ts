import { isRunningInExpoGo } from "expo";
import { nativeApplicationVersion, nativeBuildVersion } from "expo-application";
import { Platform } from "react-native";
import { fetchWithoutRedirect, getMasterApiBase } from "@/services/apiUrlPolicy";

export interface VersionStatus {
  latest_version: string;
  update_available: boolean;
  force_update: boolean;
  store_url: string | null;
  maintenance: boolean;
  maintenance_message: string;
}

function storeListing(value: unknown, platform: "android" | "ios"): string | null {
  if (typeof value !== "string") return null;

  const listing = platform === "android"
    ? /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/i
    : /^https:\/\/apps\.apple\.com\/(?:[a-z]{2}\/)?app\/(?:[a-z0-9-]+\/)?id[0-9]+\/?$/i;

  return value === value.trim() && listing.test(value) ? value : null;
}

const marketingVersion = /^\d{1,6}(?:\.\d{1,6}){0,2}$/;

export function installedTrackrVersion() {
  const platform = Platform.OS;
  if (platform !== "android" && platform !== "ios") return null;
  if (isRunningInExpoGo() || !nativeApplicationVersion || !nativeBuildVersion) return null;

  return { platform, version: nativeApplicationVersion, build: nativeBuildVersion };
}

export async function checkAppVersion(
  installed: NonNullable<ReturnType<typeof installedTrackrVersion>>,
): Promise<VersionStatus | null> {
  const { platform, version, build } = installed;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  async function request(): Promise<VersionStatus | null> {
    const response = await fetchWithoutRedirect(
      `${getMasterApiBase()}/common/app_version.php?platform=${platform}&version=${encodeURIComponent(version)}&build=${encodeURIComponent(build)}`,
      { signal: controller.signal, headers: { Accept: "application/json", "Cache-Control": "no-cache" } },
    );

    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return null;
    }

    const result = await response.json();
    const data = result?.data;
    if (
      result?.success !== true || !data || data.platform !== platform ||
      data.current_version !== version ||
      typeof data.latest_version !== "string" || !marketingVersion.test(data.latest_version) ||
      typeof data.update_available !== "boolean" || typeof data.force_update !== "boolean" ||
      typeof data.maintenance !== "boolean" || typeof data.maintenance_message !== "string"
    ) {
      return null;
    }

    return { ...data, store_url: storeListing(data.store_url, platform) };
  }

  try {
    return await Promise.race([
      request(),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => {
          resolve(null);
          controller.abort();
        }, 10_000);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
