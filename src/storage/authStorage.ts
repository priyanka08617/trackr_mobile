import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { APP_CONFIG } from "@/constants/config";
import { parseSessionIdentity, type SessionIdentity } from "@/services/sessionNavigation";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  companyId: string;
  apiBase: string;
  identity: SessionIdentity | null;
}

let session: AuthSession | null | undefined = Platform.OS === "web" ? null : undefined;
let loading: Promise<AuthSession | null> | undefined;
const tokenPattern = /^[a-f0-9]{64}$/;

function remove(key: string) {
  return Platform.OS === "web"
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key);
}

async function readNativeSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(APP_CONFIG.storageKeys.authSession);
  if (!raw) return null;

  try {
    const session: Partial<AuthSession> | null = JSON.parse(raw);
    if (
      typeof session?.accessToken !== "string" ||
      typeof session.refreshToken !== "string" ||
      !tokenPattern.test(session.accessToken) ||
      !tokenPattern.test(session.refreshToken) ||
      typeof session.expiresAt !== "number" ||
      typeof session.companyId !== "string" ||
      typeof session.apiBase !== "string" ||
      !Number.isFinite(session.expiresAt)
    ) return null;

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      companyId: session.companyId,
      apiBase: session.apiBase,
      identity: parseSessionIdentity(
        session.identity?.userId,
        session.identity?.categoryId,
        session.identity?.routeGroup,
      ),
    };
  } catch {
    return null;
  }
}

export function readAuthSession(): Promise<AuthSession | null> {
  if (session !== undefined) return Promise.resolve(session);
  loading ??= readNativeSession().then((stored) => {
    if (session === undefined) session = stored;
    return session;
  }).finally(() => { loading = undefined; });
  return loading;
}

export async function getAuthToken(): Promise<string | null> {
  const stored = await readAuthSession();
  return stored?.identity ? stored.accessToken : null;
}

export async function saveAuthSession(next: AuthSession): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(APP_CONFIG.storageKeys.authSession, JSON.stringify(next), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  session = next;
}

export async function clearAuthSession(): Promise<void> {
  session = null;
  await Promise.all([
    remove(APP_CONFIG.storageKeys.authSession),
    clearLegacyAuthTokens(),
  ]);
}

export async function clearPersistedWebSession(): Promise<void> {
  if (Platform.OS === "web") {
    await Promise.all([remove(APP_CONFIG.storageKeys.authSession), clearLegacyAuthTokens()]);
  }
}

export async function clearLegacyAuthTokens(): Promise<void> {
  await Promise.all([
    remove(APP_CONFIG.storageKeys.authToken),
    remove(APP_CONFIG.storageKeys.refreshToken),
  ]);
}
