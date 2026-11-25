import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { APP_CONFIG } from "@/constants/config";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  companyId: string;
  apiBase: string;
}

function read(key: string) {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

function remove(key: string) {
  return Platform.OS === "web"
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key);
}

export async function readAuthSession(): Promise<AuthSession | null> {
  const raw = await read(APP_CONFIG.storageKeys.authSession);
  if (!raw) return null;

  try {
    const session: Partial<AuthSession> | null = JSON.parse(raw);
    if (
      typeof session?.accessToken !== "string" ||
      typeof session.refreshToken !== "string" ||
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
    };
  } catch {
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  return (await readAuthSession())?.accessToken ?? null;
}

export function saveAuthSession(session: AuthSession): Promise<void> {
  const key = APP_CONFIG.storageKeys.authSession;
  const value = JSON.stringify(session);
  return Platform.OS === "web"
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    remove(APP_CONFIG.storageKeys.authSession),
    clearLegacyAuthTokens(),
  ]);
}

export async function clearLegacyAuthTokens(): Promise<void> {
  await Promise.all([
    remove(APP_CONFIG.storageKeys.authToken),
    remove(APP_CONFIG.storageKeys.refreshToken),
  ]);
}
