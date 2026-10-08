import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_CONFIG } from "@/constants/config";

export async function getUser<T = unknown>(): Promise<T | null> {
  const value = await AsyncStorage.getItem(APP_CONFIG.storageKeys.user);
  return value === null ? null : (JSON.parse(value) as T);
}

export async function setUser<T>(user: T): Promise<void> {
  await AsyncStorage.setItem(APP_CONFIG.storageKeys.user, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(APP_CONFIG.storageKeys.user);
}
